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

    if (error || !data) return { error: 'No se pudo cargar el precio de las estrellitas.' };
    return { priceCop: data.star_price_cop ?? 45000 };
}

/**
 * Creates a pending payment record for a star purchase and returns
 * the Wompi Widget parameters (reference + integrity hash).
 *
 * @param quantity - Number of stars the user wants to buy (min 1)
 */
export async function initStarPurchase(quantity: number): Promise<{
    reference: string;
    amountInCents: number;
    integrityHash: string;
    publicKey: string;
    currency: string;
} | { error: string }> {
    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
        return { error: 'La cantidad mínima es 1 estrellita.' };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Debes iniciar sesión para comprar estrellitas.' };

    // Fetch star price from settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings } = await (supabase as any)
        .from('settings')
        .select('star_price_cop')
        .single();

    const priceCop: number = settings?.star_price_cop ?? 45000;
    const amountInCents = quantity * priceCop * 100; // Wompi uses centavos
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
            stars_to_credit: quantity,
            amount_in_cents: amountInCents,
            currency,
        });

    if (insertErr) {
        console.error('[initStarPurchase] DB insert error:', insertErr);
        return { error: 'Error al inicializar el pago. Intenta nuevamente.' };
    }

    const publicKey = process.env.NEXT_WOMPI_PUBLIC_KEY;
    if (!publicKey) return { error: 'Configuración de pasarela incompleta.' };

    return { reference, amountInCents, integrityHash, publicKey, currency };
}
