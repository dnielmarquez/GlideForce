'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getOccupiedMachines(sessionId: string) {
    const adminSupabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (adminSupabase as any)
        .from('bookings')
        .select('machine_id')
        .eq('session_id', sessionId)
        .in('status', ['confirmed']);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data ? (data as any[]).map((b) => b.machine_id) : [];
}

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

export async function cancelBooking(sessionId: string) {
    const supabase = await createClient();

    // 1. Authenticate user strictly on server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Debes iniciar sesión para cancelar.' };
    }

    try {
        // 2. Fetch user's active booking
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: booking, error: bkErr } = await (supabase as any)
            .from('bookings')
            .select('id, status, stars_spent')
            .eq('session_id', sessionId)
            .eq('member_id', user.id)
            .in('status', ['confirmed'])
            .single();

        if (bkErr || !booking) return { error: 'No se encontró una reserva activa para esta clase.' };

        // 3. Fetch session details and settings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: session } = await (supabase as any)
            .from('class_sessions')
            .select('date, start_time')
            .eq('id', sessionId)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: settings } = await (supabase as any)
            .from('settings')
            .select('cancel_time')
            .single();

        if (!session || !settings) return { error: 'Error al cargar los datos de la clase.' };

        // 4. Calculate cutoff time
        const classStart = new Date(`${session.date}T${session.start_time}`);
        const cancelTimeMinutes = settings.cancel_time || 0;
        
        // current time + cancelTimeMinutes MUST BE < classStart to get a refund.
        // equivalent to: classStart - currentTime >= cancelTimeMinutes
        const now = new Date();
        const diffMinutes = (classStart.getTime() - now.getTime()) / 60000;
        const qualifiesForRefund = diffMinutes >= cancelTimeMinutes;

        // 5. Update booking status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updErr } = await (supabase as any)
            .from('bookings')
            .update({
                status: 'cancelled',
                cancellation_reason: 'member',
                star_refunded: qualifiesForRefund,
                cancelled_at: new Date().toISOString()
            })
            .eq('id', booking.id);

        if (updErr) throw updErr;

        // 6. Process refund if applicable
        if (qualifiesForRefund && booking.stars_spent > 0) {
            const adminSupabase = createAdminClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: txErr } = await (adminSupabase as any)
                .from('star_transactions')
                .insert({
                    member_id: user.id,
                    amount: booking.stars_spent,
                    type: 'cancellation_refund',
                    reference_id: sessionId,
                    reference_type: 'session',
                    note: 'Reembolso por cancelación a tiempo'
                });
            if (txErr) console.error('Error processing refund transaction:', txErr);
        }

        revalidatePath('/classes');
        revalidatePath(`/booking/${sessionId}`);
        revalidatePath('/stars');

        return { success: true, refunded: qualifiesForRefund };
    } catch (e) {
        console.error('Cancellation Error: ', e);
        return { error: 'Ocurrió un error al cancelar la reserva.' };
    }
}

export async function adminCancelClass(sessionId: string) {
    const adminSupabase = createAdminClient();

    try {
        // 1. Mark session as cancelled
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: sessErr } = await (adminSupabase as any)
            .from('class_sessions')
            .update({ status: 'cancelled' })
            .eq('id', sessionId);
        if (sessErr) throw sessErr;

        // 2. Fetch all confirmed bookings for this session
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: bookings, error: bksErr } = await (adminSupabase as any)
            .from('bookings')
            .select('id, member_id, stars_spent')
            .eq('session_id', sessionId)
            .in('status', ['confirmed']);
        
        if (bksErr) throw bksErr;

        if (bookings && bookings.length > 0) {
            // 3. Mark all those bookings as cancelled
            const bookingIds = bookings.map((b: any) => b.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updErr } = await (adminSupabase as any)
                .from('bookings')
                .update({ 
                    status: 'cancelled',
                    cancellation_reason: 'admin',
                    star_refunded: true,
                    cancelled_at: new Date().toISOString()
                })
                .in('id', bookingIds);
            if (updErr) throw updErr;

            // 4. Refund stars for each booking
            const transactions = bookings.filter((b: any) => b.stars_spent > 0).map((b: any) => ({
                member_id: b.member_id,
                amount: b.stars_spent,
                type: 'admin_cancellation_refund',
                reference_id: sessionId,
                reference_type: 'session',
                note: 'Reembolso por cancelación de clase por administrador'
            }));

            if (transactions.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: txErr } = await (adminSupabase as any)
                    .from('star_transactions')
                    .insert(transactions);
                if (txErr) throw txErr;
            }
        }

        revalidatePath('/classes');
        revalidatePath('/admin');
        revalidatePath(`/booking/${sessionId}`);

        return { success: true };
    } catch (e) {
        console.error('Admin Cancel Error: ', e);
        return { error: 'Ocurrió un error al cancelar la clase y procesar reembolsos.' };
    }
}
