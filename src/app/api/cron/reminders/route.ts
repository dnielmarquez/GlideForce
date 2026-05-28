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

    // Colombia America/Bogota is UTC-5 all year round
    // Calculate current Colombia date string YYYY-MM-DD
    const bogotaDateStr = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
    const remindersToSend = [];

    // 3. Filter bookings scheduled for today in Colombia Time (UTC-5)
    if (bookings && bookings.length > 0) {
      for (const b of bookings) {
        const session = b.class_sessions;
        if (!session) continue;

        if (session.date === bogotaDateStr) {
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
