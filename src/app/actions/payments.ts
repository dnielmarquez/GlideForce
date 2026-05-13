'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { generateWompiReference, generateIntegrityHash } from '@/lib/wompi';

/**
 * Creates a pending payment record for a class booking and returns
 * Wompi Widget parameters. The actual booking row is inserted by the webhook.
 *
 * @param sessionId - ID of the class_sessions row
 * @param machineId - ID of the selected machine
 */
export async function initiateBookingPayment(
    sessionId: string,
    machineId: string
): Promise<{
    reference: string;
    amountInCents: number;
    integrityHash: string;
    publicKey: string;
    currency: string;
} | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Debes iniciar sesión para reservar.' };

    // Verify session exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessErr } = await (supabase as any)
        .from('class_sessions')
        .select('id, status')
        .eq('id', sessionId)
        .single();

    if (sessErr || !session) return { error: 'Clase no encontrada.' };
    if (session.status === 'cancelled') return { error: 'Esta clase fue cancelada.' };

    // Verify machine is still free
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: taken } = await (supabase as any)
        .from('bookings')
        .select('id')
        .eq('session_id', sessionId)
        .eq('machine_id', machineId)
        .in('status', ['confirmed']);

    if (taken && taken.length > 0) {
        return { error: 'Lo sentimos, esta máquina acaba de ser reservada por alguien más.' };
    }

    // Fetch class price from settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings } = await (supabase as any)
        .from('settings')
        .select('class_price_cop')
        .single();

    const priceCop: number = settings?.class_price_cop ?? 45000;
    const amountInCents = priceCop * 100;
    const currency = 'COP';

    const reference = generateWompiReference('booking', sessionId);
    const integrityHash = generateIntegrityHash(reference, amountInCents, currency);

    // Store the pending payment record
    const adminSupabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (adminSupabase as any)
        .from('payments')
        .insert({
            member_id:       user.id,
            wompi_reference: reference,
            purpose:         'class_booking',
            status:          'pending',
            session_id:      sessionId,
            machine_id:      machineId,
            amount_in_cents: amountInCents,
            currency,
        });

    if (insertErr) {
        console.error('[initiateBookingPayment] DB insert error:', insertErr);
        return { error: 'Error al inicializar el pago. Intenta nuevamente.' };
    }

    const publicKey = process.env.NEXT_WOMPI_PUBLIC_KEY;
    if (!publicKey) return { error: 'Configuración de pasarela incompleta.' };

    return { reference, amountInCents, integrityHash, publicKey, currency };
}

/**
 * Polls the local payments table for a payment's current status.
 * Used by the /payment/result page while waiting for the webhook.
 */
export async function getPaymentStatus(
    reference: string
): Promise<{ status: string; purpose: string } | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado.' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('payments')
        .select('status, purpose')
        .eq('wompi_reference', reference)
        .eq('member_id', user.id)
        .single();

    if (error || !data) return { error: 'Pago no encontrado.' };
    return { status: data.status, purpose: data.purpose };
}
