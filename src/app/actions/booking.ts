'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function processBooking(
    sessionId: string,
    machineId: string,
    paymentMethod: 'stars' | 'online',
    isWaitlist: boolean
) {
    const supabase = await createClient();

    // 1. Authenticate user strictly on server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Debes iniciar sesión para reservar.' };
    }

    try {
        // 2. Fetch session details securely to prevent client spoofing 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: session, error: sessErr } = await (supabase as any)
            .from('class_sessions')
            .select('stars_cost, capacity')
            .eq('id', sessionId)
            .single();

        if (sessErr || !session) return { error: 'Clase no encontrada.' };

        // 3. Double check the machine isn't literally just taken
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: takenCheck } = await (supabase as any)
            .from('bookings')
            .select('id')
            .eq('session_id', sessionId)
            .eq('machine_id', machineId)
            .in('status', ['confirmed']);

        if (takenCheck && takenCheck.length > 0 && !isWaitlist) {
            return { error: 'Lo sentimos, esta máquina acaba de ser reservada por alguien más.' };
        }

        // 4. Process Payment Modality
        if (paymentMethod === 'stars') {
            // Check literal balance natively in DB
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase as any)
                .from('profiles')
                .select('stars_balance')
                .eq('id', user.id)
                .single();
            
            const cost = session?.stars_cost || 1;

            if (!profile || profile.stars_balance < cost) {
                return { error: 'No tienes estrellas suficientes (Verificación del servidor).' };
            }

            const adminSupabase = createAdminClient();

            // Log the literal transaction (Trigger will auto-deduct profile)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: txErr } = await (adminSupabase as any)
                .from('star_transactions')
                .insert({
                    member_id: user.id,
                    amount: -cost,
                    type: 'booking_charged',
                    reference_id: sessionId,
                    reference_type: 'session'
                });
            if (txErr) throw txErr;
        }

        // 5. Finally, insert the booking lock!
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: bookingErr } = await (supabase as any)
            .from('bookings')
            .insert({
                session_id: sessionId,
                member_id: user.id,
                machine_id: machineId,
                status: 'confirmed', // MVP Logic
                stars_spent: session?.stars_cost || 1,
            });
        
        if (bookingErr) throw bookingErr;

        // Force a page re-render to reflect the new state immediately!
        revalidatePath('/classes');
        revalidatePath(`/booking/${sessionId}`);

        return { success: true };
    } catch (e) {
        console.error('Booking Transaction Error: ', e);
        return { error: 'Ocurrió un error al procesar tu reserva.' };
    }
}
