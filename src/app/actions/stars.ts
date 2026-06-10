'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { generateWompiReference, generateIntegrityHash } from '@/lib/wompi';

/**
 * Returns the star price (COP) from settings.
 * Used by the client to display pricing before initiating a purchase.
 */
export async function getStarPricing(): Promise<{ priceCop: number } | { error: string }> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('settings')
        .select('star_price_cop')
        .single();

    if (error || !data) return { error: 'No se pudo cargar el precio de las sesiones.' };
    return { priceCop: data.star_price_cop ?? 45000 };
}

/**
 * Creates a pending payment record for a star purchase and returns
 * the Wompi Widget parameters (reference + integrity hash).
 *
 * @param quantity - Number of stars the user wants to buy (min 1)
 */
export async function initStarPurchase(
    quantity: number,
    couponCode?: string
): Promise<{
    reference: string;
    amountInCents: number;
    integrityHash: string;
    publicKey: string;
    currency: string;
} | { error: string }> {
    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
        return { error: 'La cantidad mínima es 1 sesión.' };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Debes iniciar sesión para comprar sesiones.' };

    // Fetch star price from settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings } = await (supabase as any)
        .from('settings')
        .select('star_price_cop')
        .single();

    const priceCop: number = settings?.star_price_cop ?? 45000;
    
    let couponId: string | null = null;
    let discountAmountPerStar = 0;
    let starsToCredit = quantity;

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

        // Calculate discount or promo based on type
        if (coupon.discount_type === '2_for_1') {
            starsToCredit = quantity + 1; // Extra 1 star credited! Price remains unchanged.
            discountAmountPerStar = 0;
        } else if (coupon.discount_type === 'percentage') {
            discountAmountPerStar = priceCop * (Number(coupon.discount_value || 0) / 100);
        } else if (coupon.discount_type === 'fixed_amount') {
            discountAmountPerStar = Number(coupon.discount_value || 0);
        }
    }

    const finalPricePerStar = Math.max(0, priceCop - discountAmountPerStar);
    const amountInCents = quantity * finalPricePerStar * 100; // Wompi uses centavos
    const currency = 'COP';

    const reference = generateWompiReference('star', user.id);

    // Generate integrity hash server-side (secret never leaves server)
    const integrityHash = generateIntegrityHash(reference, amountInCents, currency);

    // Store the pending payment record
    const adminSupabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (adminSupabase as any)
        .from('payments')
        .insert({
            member_id:       user.id,
            wompi_reference: reference,
            purpose:         'star_purchase',
            status:          'pending',
            stars_to_credit: starsToCredit,
            amount_in_cents: amountInCents,
            currency,
            coupon_id:       couponId,
        });

    if (insertErr) {
        console.error('[initStarPurchase] DB insert error:', insertErr);
        return { error: 'Error al inicializar el pago. Intenta nuevamente.' };
    }

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    if (!publicKey) return { error: 'Configuración de pasarela incompleta.' };

    return { reference, amountInCents, integrityHash, publicKey, currency };
}
