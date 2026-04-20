'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function purchaseStars(amount: number) {
    const supabase = await createClient();

    // Authenticate user strictly on server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Debes iniciar sesión para recargar estrellitas.' };
    }

    try {
        const adminSupabase = createAdminClient();

        // Insert credit transaction. 
        // NOTE: Postgres Trigger `trg_sync_stars_balance` will automatically increment the wallet profile!
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: txErr } = await (adminSupabase as any)
            .from('star_transactions')
            .insert({
                member_id: user.id,
                amount: amount,
                type: 'star_purchase',
            });
            
        if (txErr) throw txErr;

        // Force a page re-render to reflect the new wallet balance immediately
        revalidatePath('/stars');
        revalidatePath('/classes');

        return { success: true };
    } catch (e) {
        console.error('Star Purchase Error: ', e);
        return { error: 'Ocurrió un error procesando el pago. Intenta nuevamente.' };
    }
}
