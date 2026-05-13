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
        console.warn('[wompi-webhook] Invalid signature or missing signature data — ignoring');
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

    const wompiStatus: string = transaction.status;           // 'APPROVED' | 'DECLINED' | etc.
    const wompiReference: string = transaction.reference;    // our reference
    const wompiTxId: string = transaction.id;                // Wompi's own transaction ID

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

    // Guard: skip if already processed
    if (payment.status !== 'pending') {
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

    // ── 5. Fulfil business logic on APPROVED ─────────────────────────────────
    if (localStatus === 'approved') {
        try {
            if (payment.purpose === 'star_purchase' && payment.stars_to_credit > 0) {
                // Credit stars via star_transactions (trigger updates profile balance)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: txErr } = await (adminSupabase as any)
                    .from('star_transactions')
                    .insert({
                        member_id:      payment.member_id,
                        amount:         payment.stars_to_credit,
                        type:           'star_purchase',
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
                // Create the booking row
                await fulfillBookingFromWebhook(
                    payment.id,
                    payment.member_id,
                    payment.session_id,
                    payment.machine_id
                );
            }
        } catch (err) {
            console.error('[wompi-webhook] Fulfillment error:', err);
            // Don't update status — allow Wompi retry to re-process
            return NextResponse.json({ received: true }, { status: 200 });
        }
    }

    // ── 6. Update payments record ─────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
        .from('payments')
        .update({
            status:               localStatus,
            wompi_transaction_id: wompiTxId,
            wompi_payload:        event,
            fulfilled_at:         localStatus === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', payment.id);

    return NextResponse.json({ received: true }, { status: 200 });
}
