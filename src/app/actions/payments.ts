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
    machineId: string,
    couponCode?: string
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
    
    let couponId: string | null = null;
    let discountAmount = 0;

    if (couponCode) {
        // Validate coupon on server side
        const cleanCode = couponCode.trim().toUpperCase();
        const admin = createAdminClient();
        
        const { data: coupon, error: couponErr } = await (admin as any)
            .from('coupons')
            .select('*, coupon_usages(id, user_id)')
            .eq('code', cleanCode)
            .single();

        if (couponErr || !coupon) {
            return { error: 'Código de cupón no encontrado.' };
        }

        if (!coupon.is_active) {
            return { error: 'Este cupón está inactivo.' };
        }

        const now = new Date();
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            return { error: 'Este cupón no está vigente todavía.' };
        }
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            return { error: 'Este cupón ha expirado.' };
        }

        const usages = coupon.coupon_usages || [];
        if (coupon.max_uses > 0 && usages.length >= coupon.max_uses) {
            return { error: 'Este cupón ha agotado su límite de usos.' };
        }

        if (coupon.max_uses_per_user > 0) {
            const userUsages = usages.filter((u: any) => u.user_id === user.id).length;
            if (userUsages >= coupon.max_uses_per_user) {
                return { error: 'Ya has utilizado este cupón el máximo de veces permitido.' };
            }
        }

        couponId = coupon.id;

        // Calculate discount
        if (coupon.discount_type === 'percentage') {
            discountAmount = priceCop * (Number(coupon.discount_value || 0) / 100);
        } else if (coupon.discount_type === 'fixed_amount') {
            discountAmount = Number(coupon.discount_value || 0);
        } else if (coupon.discount_type === '2_for_1') {
            discountAmount = 0; // Buy 1 get 1 class free via webhook credit of star
        }
    }

    const finalPriceCop = Math.max(0, priceCop - discountAmount);
    const amountInCents = Math.round(finalPriceCop * 100);
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
            coupon_id:       couponId,
        });

    if (insertErr) {
        console.error('[initiateBookingPayment] DB insert error:', insertErr);
        return { error: 'Error al inicializar el pago. Intenta nuevamente.' };
    }

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
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
