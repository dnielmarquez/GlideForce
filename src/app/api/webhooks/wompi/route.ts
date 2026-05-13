import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyWebhookSignature } from '@/lib/wompi';
import { fulfillBookingFromWebhook } from '@/app/actions/booking';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/webhooks/wompi
 *
 * Receives Wompi event notifications.
 * We ALWAYS return 200 to prevent Wompi from retrying, even on errors.
 * Security validation happens via SHA-256 checksum.
 *
 * Order of operations:
 *   1. Verify signature
 *   2. Look up our pending payment record
 *   3. Stamp the payment status (APPROVED / DECLINED / etc.) immediately ← always happens
 *   4. Run business fulfillment — errors are logged but never block step 3
 */
export async function POST(req: NextRequest) {
    let body: Record<string, unknown>;

    try {
        body = await req.json();
    } catch {
        console.error('[wompi-webhook] Failed to parse request body');
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── 1. Verify signature ──────────────────────────────────────────────────
    const isValid = verifyWebhookSignature(body);
    if (!isValid) {
        console.warn('[wompi-webhook] Invalid signature — ignoring');
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── 2. Only handle transaction.updated events ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = body as any;
    if (event?.event !== 'transaction.updated') {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    const transaction = event?.data?.transaction;
    if (!transaction) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    const wompiStatus: string    = transaction.status;     // 'APPROVED' | 'DECLINED' | etc.
    const wompiReference: string = transaction.reference;  // our reference
    const wompiTxId: string      = transaction.id;         // Wompi's own transaction ID

    if (!wompiReference || !wompiTxId) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    const adminSupabase = createAdminClient();

    // ── 3. Look up our payments record ───────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payment, error: payErr } = await (adminSupabase as any)
        .from('payments')
        .select('*')
        .eq('wompi_reference', wompiReference)
        .single();

    if (payErr || !payment) {
        console.warn('[wompi-webhook] Payment record not found for reference:', wompiReference);
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // Guard: skip if already processed (idempotency)
    if (payment.status !== 'pending') {
        console.log('[wompi-webhook] Already processed, skipping:', wompiReference);
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── 4. Map Wompi status → our status ─────────────────────────────────────
    const statusMap: Record<string, string> = {
        APPROVED: 'approved',
        DECLINED: 'declined',
        VOIDED:   'voided',
        ERROR:    'error',
    };
    const localStatus = statusMap[wompiStatus] ?? 'error';

    // ── 5. Stamp payment status FIRST — always, regardless of fulfillment ─────
    // This prevents the payment from being stuck as 'pending' if fulfillment has a bug.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (adminSupabase as any)
        .from('payments')
        .update({
            status:               localStatus,
            wompi_transaction_id: wompiTxId,
            wompi_payload:        event,
            fulfilled_at:         localStatus === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', payment.id);

    if (updateErr) {
        console.error('[wompi-webhook] Failed to update payment status:', updateErr);
        // Don't proceed to fulfillment if we couldn't even stamp the status.
        // Wompi will retry and we'll try again since payment is still 'pending'.
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── 6. Business fulfillment on APPROVED ──────────────────────────────────
    if (localStatus === 'approved') {
        try {
            if (payment.purpose === 'star_purchase' && payment.stars_to_credit > 0) {
                // Credit stars via star_transactions (DB trigger updates profile balance)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: txErr } = await (adminSupabase as any)
                    .from('star_transactions')
                    .insert({
                        member_id:      payment.member_id,
                        amount:         payment.stars_to_credit,
                        type:           'star_purchase',
                        payment_id:     payment.id,
                        reference_id:   payment.id,
                        reference_type: 'manual',
                        note:           `Compra vía Wompi - Ref: ${wompiReference}`,
                    });

                if (txErr) throw txErr;
                revalidatePath('/stars');

            } else if (
                payment.purpose === 'class_booking' &&
                payment.session_id &&
                payment.machine_id
            ) {
                await fulfillBookingFromWebhook(
                    payment.id,
                    payment.member_id,
                    payment.session_id,
                    payment.machine_id
                );
            }
        } catch (err) {
            // Payment is already stamped 'approved' above — don't crash or return error.
            // Log for manual resolution; the idempotency guard prevents double-processing.
            console.error('[wompi-webhook] Fulfillment error (payment already marked approved):', err);
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
