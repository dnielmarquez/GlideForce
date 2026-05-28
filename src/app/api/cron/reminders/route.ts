import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendClassReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Security Check
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient() as any;

  try {
    // 2. Query bookings that are confirmed and reminder has not been sent yet
    const { data: bookings, error: bErr } = await adminSupabase
      .from('bookings')
      .select(`
        id,
        member_id,
        machine_id,
        machines ( label ),
        class_sessions (
          id,
          title,
          date,
          start_time,
          duration_minutes,
          instructors ( name )
        )
      `)
      .eq('status', 'confirmed')
      .eq('reminder_sent', false);

    if (bErr) throw bErr;

    const now = new Date();
    const remindersToSend = [];

    // 3. Filter bookings starting in ~3 hours in Colombia Time (UTC-5)
    if (bookings && bookings.length > 0) {
      for (const b of bookings) {
        const session = b.class_sessions;
        if (!session) continue;

        // Colombia America/Bogota is UTC-5 all year round
        const classStart = new Date(`${session.date}T${session.start_time}-05:00`);
        const diffMinutes = (classStart.getTime() - now.getTime()) / 60000;

        // Target starting time: 3 hours (180 minutes)
        // Check window: between 2h 45m (165m) and 3h 15m (195m)
        if (diffMinutes >= 165 && diffMinutes <= 195) {
          remindersToSend.push(b);
        }
      }
    }

    let successCount = 0;

    // 4. Send emails and update status
    for (const b of remindersToSend) {
      const session = b.class_sessions;
      const machineLabel = b.machines?.label || 'Spot/Máquina';

      try {
        await sendClassReminderEmail(b.member_id, session, machineLabel);

        // Update database to mark reminder as sent
        const { error: updErr } = await adminSupabase
          .from('bookings')
          .update({ reminder_sent: true })
          .eq('id', b.id);

        if (updErr) {
          console.error(`[CronReminders] Failed to update booking ${b.id} reminder_sent state:`, updErr);
        } else {
          successCount++;
        }
      } catch (sendErr) {
        console.error(`[CronReminders] Failed to process reminder for booking ${b.id}:`, sendErr);
      }
    }

    return NextResponse.json({
      success: true,
      processed: remindersToSend.length,
      sent_successfully: successCount
    });

  } catch (error: any) {
    console.error('[CronReminders] Error running reminders cron:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
