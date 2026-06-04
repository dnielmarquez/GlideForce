'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { sendBookingEmails, sendCancellationNotificationToAdmin } from '@/lib/email';

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
    sessionIds: string[],
    machineId: string,
    paymentMethod: 'stars',
    isWaitlist: boolean
) {
    if (!sessionIds || sessionIds.length === 0) {
        return { error: 'No se seleccionaron clases para reservar.' };
    }

    const supabase = await createClient();

    // 1. Authenticate user strictly on server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Debes iniciar sesión para reservar.' };
    }

    try {
        // 2. Fetch session details securely to prevent client spoofing 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sessions, error: sessErr } = await (supabase as any)
            .from('class_sessions')
            .select('id, stars_cost, capacity')
            .in('id', sessionIds);

        if (sessErr || !sessions || sessions.length !== sessionIds.length) {
            return { error: 'Una o más clases no fueron encontradas.' };
        }

        // 3. Double check the machine isn't literally just taken
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: takenCheck } = await (supabase as any)
            .from('bookings')
            .select('id, session_id')
            .in('session_id', sessionIds)
            .eq('machine_id', machineId)
            .in('status', ['confirmed']);

        if (takenCheck && takenCheck.length > 0 && !isWaitlist) {
            return { error: 'Lo sentimos, la máquina ya está ocupada en alguna de las fechas elegidas.' };
        }

        // 4. Process Payment — stars only (online is handled via Wompi webhook)
        if (paymentMethod === 'stars') {
            // Check literal balance natively in DB
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase as any)
                .from('profiles')
                .select('stars_balance')
                .eq('id', user.id)
                .single();
            
            const totalCost = sessions.reduce((sum: number, s: any) => sum + (s.stars_cost || 1), 0);

            if (!profile || profile.stars_balance < totalCost) {
                return { error: 'No tienes estrellas suficientes (Verificación del servidor).' };
            }

            const adminSupabase = createAdminClient();

            // Log the literal transaction (Trigger will auto-deduct profile)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: txErr } = await (adminSupabase as any)
                .from('star_transactions')
                .insert({
                    member_id: user.id,
                    amount: -totalCost,
                    type: 'booking_charged',
                    reference_id: sessionIds[0],
                    reference_type: 'session',
                    note: `Reserva de ${sessionIds.length} clases recurrentes`
                });
            if (txErr) throw txErr;
        }

        // 5. Finally, insert or update the booking locks!
        const bookingsToInsert = sessions.map((s: any) => ({
            session_id: s.id,
            member_id: user.id,
            machine_id: machineId,
            status: 'confirmed',
            stars_spent: s.stars_cost || 1,
            cancelled_at: null,
            cancellation_reason: null,
            star_refunded: false
        }));

        const adminSupabase = createAdminClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: bookingErr } = await (adminSupabase as any)
            .from('bookings')
            .upsert(bookingsToInsert, { onConflict: 'session_id, member_id' });
        
        if (bookingErr) throw bookingErr;

        // Trigger email confirmation asynchronously
        sendBookingEmails(user.id, sessionIds, machineId, true);

        // Force a page re-render to reflect the new state immediately!
        revalidatePath('/classes');
        for (const sid of sessionIds) {
            revalidatePath(`/booking/${sid}`);
        }
        revalidatePath('/profile');
        revalidatePath('/stars');

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
            .select('id, status, stars_spent, payment_id')
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
            .select('cancel_time, timezone')
            .single();

        if (!session || !settings) return { error: 'Error al cargar los datos de la clase.' };

        // 4. Calculate cutoff time
        const timezone = settings.timezone || 'America/Bogota';
        let classStart = new Date(`${session.date}T${session.start_time}`);
        
        try {
            const tempDate = new Date(`${session.date}T00:00:00Z`);
            const formatter = new Intl.DateTimeFormat("en-US", {
                timeZone: timezone,
                timeZoneName: "longOffset"
            });
            const parts = formatter.formatToParts(tempDate);
            const tzPart = parts.find(p => p.type === 'timeZoneName');
            if (tzPart) {
                const val = tzPart.value;
                const match = val.match(/GMT([+-])(\d+)(?::(\d+))?/);
                if (match) {
                    const sign = match[1] === '-' ? -1 : 1;
                    const hours = parseInt(match[2], 10);
                    const minutes = match[3] ? parseInt(match[3], 10) : 0;
                    const offsetMinutes = sign * (hours * 60 + minutes);
                    
                    const localUTC = new Date(`${session.date}T${session.start_time}Z`);
                    classStart = new Date(localUTC.getTime() - offsetMinutes * 60000);
                }
            }
        } catch (tzErr) {
            console.error('Timezone parsing error in cancelBooking:', tzErr);
            classStart = new Date(`${session.date}T${session.start_time}-05:00`);
        }

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

        // Trigger cancellation email to admin asynchronously
        sendCancellationNotificationToAdmin(user.id, sessionId, qualifiesForRefund);

        // 6. Process refund if applicable
        if (qualifiesForRefund) {
            // Refund the stars_spent if > 0, or refund 1 star if they paid in COP (payment_id exists)
            const refundAmount = booking.stars_spent > 0 
                ? booking.stars_spent 
                : (booking.payment_id ? 1 : 0);

            if (refundAmount > 0) {
                const adminSupabase = createAdminClient();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: txErr } = await (adminSupabase as any)
                    .from('star_transactions')
                    .insert({
                        member_id: user.id,
                        amount: refundAmount,
                        type: 'cancellation_refund',
                        reference_id: sessionId,
                        reference_type: 'session',
                        note: booking.stars_spent > 0
                            ? 'Reembolso por cancelación a tiempo'
                            : 'Reembolso en estrella por cancelación a tiempo de clase pagada online'
                    });
                if (txErr) console.error('Error processing refund transaction:', txErr);
            }
        }

        revalidatePath('/classes');
        revalidatePath(`/booking/${sessionId}`);
        revalidatePath('/stars');
        revalidatePath('/profile');

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

/**
 * Called exclusively by the Wompi webhook handler after a confirmed
 * APPROVED transaction event. Creates the booking row for an online payment.
 *
 * @param paymentId   - UUID of the payments row
 * @param memberId    - UUID of the member
 * @param sessionId   - UUID of the class_sessions row
 * @param machineId   - UUID of the machines row
 */
export async function fulfillBookingFromWebhook(
    paymentId: string,
    memberId: string,
    sessionId: string,
    machineId: string
) {
    const adminSupabase = createAdminClient();

    // Fetch the payment record to see if it has multi-session IDs in wompi_payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payment, error: payErr } = await (adminSupabase as any)
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (payErr || !payment) {
        console.error('[fulfillBookingFromWebhook] Payment not found:', paymentId);
        throw new Error('Payment not found');
    }

    const payload = payment.wompi_payload as any;
    const sessionIdsToBook: string[] = (payload && Array.isArray(payload.session_ids))
        ? payload.session_ids
        : [sessionId];

    // Insert or update booking records for all selected sessions
    const bookingsToInsert = sessionIdsToBook.map(sid => ({
        session_id:  sid,
        member_id:   memberId,
        machine_id:  machineId,
        status:      'confirmed',
        stars_spent: 0,          // Paid in COP, not stars
        payment_id:  paymentId,  // FK → payments table
        cancelled_at: null,
        cancellation_reason: null,
        star_refunded: false
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: bookingErr } = await (adminSupabase as any)
        .from('bookings')
        .upsert(bookingsToInsert, { onConflict: 'session_id, member_id' });

    if (bookingErr) {
        console.error('[fulfillBookingFromWebhook] Failed to insert bookings:', bookingErr);
        throw bookingErr;
    }

    // Trigger email confirmation asynchronously
    sendBookingEmails(memberId, sessionIdsToBook, machineId, true);

    // Check if a coupon was used for this payment
    try {
        if (payment.coupon_id) {
            // 1. Record coupon usage
            const { error: usageErr } = await (adminSupabase as any)
                .from('coupon_usages')
                .insert({
                    coupon_id:  payment.coupon_id,
                    user_id:    memberId,
                    metadata:   { payment_id: paymentId }
                });

            if (usageErr) {
                console.error('[fulfillBookingFromWebhook] Failed to insert coupon usage:', usageErr);
            }

            // 2. Query coupon type
            const { data: coupon } = await (adminSupabase as any)
                .from('coupons')
                .select('discount_type')
                .eq('id', payment.coupon_id)
                .single();

            // 3. Award 1 extra star if it was a 2_for_1 promo AND only 1 session was booked
            if (coupon && coupon.discount_type === '2_for_1' && sessionIdsToBook.length === 1) {
                const { error: txErr } = await (adminSupabase as any)
                    .from('star_transactions')
                    .insert({
                        member_id:      memberId,
                        amount:         1,
                        type:           'welcome_bonus',
                        payment_id:     paymentId,
                        reference_id:   sessionId,
                        reference_type: 'session',
                        note:           'Promo 2x1 - Estrellita Extra por uso de cupón en Pago de Clase'
                    });

                if (txErr) {
                    console.error('[fulfillBookingFromWebhook] Failed to credit star for 2_for_1:', txErr);
                }
            }
        }
    } catch (couponProcErr) {
        console.error('[fulfillBookingFromWebhook] Error processing coupon during fulfillment:', couponProcErr);
    }

    revalidatePath('/classes');
    for (const sid of sessionIdsToBook) {
        revalidatePath(`/booking/${sid}`);
    }
    revalidatePath('/profile');
    revalidatePath('/stars');
}

/**
 * Fetches all scheduled future sessions of the same recurrence sequence
 * where the user does not have a booking and the specific machine is free.
 * The first item in the returned array is the current session itself.
 */
export async function getRecurringSessionsForBooking(
    sessionId: string,
    machineId: string
): Promise<{ sessions: any[] } | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Debes iniciar sesión para verificar disponibilidad.' };

    try {
        // 1. Fetch current session recurrence info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: currentSession, error: sErr } = await (supabase as any)
            .from('class_sessions')
            .select('recurrence_id, date, start_time')
            .eq('id', sessionId)
            .single();

        if (sErr || !currentSession) return { error: 'Clase no encontrada.' };

        // If not a recurring class, just return the current session itself
        if (!currentSession.recurrence_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: fullSess } = await (supabase as any)
                .from('class_sessions')
                .select('id, title, date, start_time, duration_minutes')
                .eq('id', sessionId)
                .single();
            return { sessions: fullSess ? [fullSess] : [] };
        }

        // 2. Fetch all upcoming scheduled sessions in the same recurrence sequence starting from the current session's date
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: futureSessions, error: fsErr } = await (supabase as any)
            .from('class_sessions')
            .select('id, title, date, start_time, duration_minutes')
            .eq('recurrence_id', currentSession.recurrence_id)
            .eq('status', 'scheduled')
            .gte('date', currentSession.date)
            .order('date', { ascending: true });

        if (fsErr || !futureSessions || futureSessions.length === 0) {
            return { sessions: [] };
        }

        // 3. Fetch active confirmed bookings for these session IDs to verify user and machine availability
        const sessionIds = futureSessions.map((s: any) => s.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: bookings } = await (supabase as any)
            .from('bookings')
            .select('session_id, member_id, machine_id')
            .in('session_id', sessionIds)
            .in('status', ['confirmed']);

        const activeBookings = bookings || [];

        // 4. Filter sessions based on availability of the user and the specific machine
        const eligibleSessions = futureSessions.filter((session: any) => {
            // Always include the primary/selected session itself
            if (session.id === sessionId) return true;

            // User cannot have an active booking in the session
            const userBooked = activeBookings.some((b: any) => b.session_id === session.id && b.member_id === user.id);
            if (userBooked) return false;

            // The specific machine cannot be occupied in the session
            const machineOccupied = activeBookings.some((b: any) => b.session_id === session.id && b.machine_id === machineId);
            if (machineOccupied) return false;

            return true;
        });

        return { sessions: eligibleSessions };
    } catch (e) {
        console.error('[getRecurringSessionsForBooking] Error:', e);
        return { error: 'Error al consultar sesiones recurrentes.' };
    }
}

/**
 * Allows administrators to manually book/block a machine/spot for a specific member.
 * Can be applied to the current session only or to the whole recurring series.
 * Supports choosing whether the booking is free or deducts 1 star from the user.
 */
export async function adminBookSpots(
    sessionId: string,
    memberId: string,
    machineId: string,
    applyToAllRecurring: boolean,
    chargeStars: boolean = false
): Promise<{ success: true; count: number } | { error: string }> {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) return { error: 'No autenticado.' };

    // Verify requesting user is admin
    const { data: profile, error: pErr } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', adminUser.id)
        .single();
    if (pErr || !profile || profile.role !== 'admin') {
        return { error: 'Acceso denegado. Se requieren permisos de administrador.' };
    }

    try {
        // 1. Fetch current session recurrence
        const { data: currentSession, error: sErr } = await (supabase as any)
            .from('class_sessions')
            .select('recurrence_id, date, stars_cost')
            .eq('id', sessionId)
            .single();

        if (sErr || !currentSession) return { error: 'Clase no encontrada.' };

        let sessionIdsToBook = [sessionId];

        if (applyToAllRecurring && currentSession.recurrence_id) {
            // Find all upcoming scheduled sessions of the same recurrence sequence starting from current session date
            const { data: futureSessions } = await (supabase as any)
                .from('class_sessions')
                .select('id')
                .eq('recurrence_id', currentSession.recurrence_id)
                .eq('status', 'scheduled')
                .gte('date', currentSession.date);

            if (futureSessions && futureSessions.length > 0) {
                sessionIdsToBook = futureSessions.map((s: any) => s.id);
            }
        }

        // 2. Fetch occupied machines in these sessions to check availability
        const { data: activeBookings } = await (supabase as any)
            .from('bookings')
            .select('session_id, machine_id, member_id')
            .in('session_id', sessionIdsToBook)
            .in('status', ['confirmed']);

        const bookingsList = activeBookings || [];

        // Check availability and compile insertable bookings
        const bookingsToInsert = [];

        for (const sid of sessionIdsToBook) {
            // If the user already has a booking in this session, skip it
            const userAlreadyBooked = bookingsList.some((b: any) => b.session_id === sid && b.member_id === memberId);
            if (userAlreadyBooked) {
                continue;
            }

            // If the machine is already occupied in this session, skip it
            const machineOccupied = bookingsList.some((b: any) => b.session_id === sid && b.machine_id === machineId);
            if (machineOccupied) {
                continue;
            }

            bookingsToInsert.push({
                session_id: sid,
                member_id: memberId,
                machine_id: machineId,
                status: 'confirmed',
                stars_spent: chargeStars ? (currentSession.stars_cost || 1) : 0,
                cancelled_at: null,
                cancellation_reason: null,
                star_refunded: false
            });
        }

        if (bookingsToInsert.length === 0) {
            return { error: 'El usuario ya tiene reservas o la máquina está ocupada en todas las fechas seleccionadas.' };
        }

        // 3. Process stars charge if enabled
        if (chargeStars) {
            // Get user profile balance
            const { data: memberProfile } = await (supabase as any)
                .from('profiles')
                .select('stars_balance')
                .eq('id', memberId)
                .single();

            const totalStarsCost = bookingsToInsert.length * (currentSession.stars_cost || 1);

            if (!memberProfile || memberProfile.stars_balance < totalStarsCost) {
                return { error: `El usuario no tiene estrellas suficientes para esta reserva (${totalStarsCost} requeridas, tiene ${memberProfile?.stars_balance || 0}).` };
            }

            const adminSupabase = createAdminClient();
            // Debit the user's stars
            const { error: txErr } = await (adminSupabase as any)
                .from('star_transactions')
                .insert({
                    member_id: memberId,
                    amount: -totalStarsCost,
                    type: 'booking_charged',
                    reference_id: sessionId,
                    reference_type: 'session',
                    note: `Reserva administrativa forzada de ${bookingsToInsert.length} clases`
                });

            if (txErr) throw txErr;
        }

        const adminSupabase = createAdminClient();
        const { error: insertErr } = await (adminSupabase as any)
            .from('bookings')
            .upsert(bookingsToInsert, { onConflict: 'session_id, member_id' });

        if (insertErr) throw insertErr;

        // Trigger email confirmation asynchronously (no admin notification, admin performed it!)
        sendBookingEmails(memberId, sessionIdsToBook, machineId, false);

        revalidatePath('/classes');
        for (const sid of sessionIdsToBook) {
            revalidatePath(`/booking/${sid}`);
        }
        revalidatePath('/profile');
        revalidatePath('/stars');
        revalidatePath('/admin');

        return { success: true, count: bookingsToInsert.length };
    } catch (e) {
        console.error('[adminBookSpots] Error:', e);
        return { error: 'Ocurrió un error al procesar las reservas administrativas.' };
    }
}

export async function adminCancelBooking(
    bookingId: string,
    refundStar: boolean
): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) return { error: 'No autenticado.' };

    // Verify requesting user is admin
    const { data: profile, error: pErr } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', adminUser.id)
        .single();
    if (pErr || !profile || profile.role !== 'admin') {
        return { error: 'Acceso denegado. Se requieren permisos de administrador.' };
    }

    try {
        // Fetch booking to verify existence and get details
        const { data: booking, error: bkErr } = await (supabase as any)
            .from('bookings')
            .select('id, status, member_id, session_id')
            .eq('id', bookingId)
            .single();

        if (bkErr || !booking) {
            return { error: 'Reserva no encontrada.' };
        }

        if (booking.status === 'cancelled') {
            return { error: 'Esta reserva ya está cancelada.' };
        }

        const adminSupabase = createAdminClient();

        // 1. Mark booking as cancelled
        const { error: updErr } = await (adminSupabase as any)
            .from('bookings')
            .update({
                status: 'cancelled',
                cancellation_reason: 'admin',
                star_refunded: refundStar,
                cancelled_at: new Date().toISOString()
            })
            .eq('id', bookingId);

        if (updErr) throw updErr;

        // 2. Refund 1 star if requested
        if (refundStar) {
            const { error: txErr } = await (adminSupabase as any)
                .from('star_transactions')
                .insert({
                    member_id: booking.member_id,
                    amount: 1, // always give exactly 1 star only!
                    type: 'admin_adjustment',
                    reference_id: booking.session_id,
                    reference_type: 'session',
                    note: 'Reembolso administrativo manual (1 estrella)'
                });
            if (txErr) console.error('Error processing admin refund:', txErr);
        }

        revalidatePath('/classes');
        revalidatePath(`/booking/${booking.session_id}`);
        revalidatePath('/admin');

        return { success: true };
    } catch (e) {
        console.error('[adminCancelBooking] Error:', e);
        return { error: 'Ocurrió un error al procesar la cancelación administrativa.' };
    }
}

