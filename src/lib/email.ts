import nodemailer from 'nodemailer';
import { createAdminClient } from '../utils/supabase/admin';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const fromEmail = process.env.GMAIL_EMAIL || 'glideandlift@gmail.com';
  
  try {
    const mailOptions = {
      from: `"GlideForce" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    return { success: false, error };
  }
}

// Helper to format hour
function formatEmailTime(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(min)) return timeStr;
  
  const ampm = hour >= 12 ? 'pm' : 'am';
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  const displayMin = min.toString().padStart(2, '0');
  return `${displayHour}:${displayMin}${ampm}`;
}

// Helper to format date
function formatEmailDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * 1. Booking Confirmation Email to User (and optionally Admin)
 */
export async function sendBookingEmails(
  memberId: string,
  sessionIds: string[],
  machineId: string,
  notifyAdmin: boolean
) {
  const adminEmail = process.env.GMAIL_EMAIL || 'glideandlift@gmail.com';
  const adminSupabase = createAdminClient() as any;

  try {
    // A. Fetch User Profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', memberId)
      .single();

    if (!profile) throw new Error('User profile not found for booking emails.');

    // B. Fetch Sessions info
    const { data: sessions } = await adminSupabase
      .from('class_sessions')
      .select('id, title, date, start_time, duration_minutes, instructors(name)')
      .in('id', sessionIds);

    if (!sessions || sessions.length === 0) throw new Error('Sessions not found for booking emails.');

    // C. Fetch Machine info
    const { data: machine } = await adminSupabase
      .from('machines')
      .select('label')
      .eq('id', machineId)
      .single();

    const machineLabel = machine?.label || `Spot/Máquina`;

    // D. Build Session Blocks for HTML
    const sessionBlocks = sessions.map((s: any) => {
      const formattedDate = formatEmailDate(s.date);
      const formattedTime = formatEmailTime(s.start_time);
      const instructorName = s.instructors?.name || 'Instructor';
      return {
        title: s.title,
        instructorName,
        date: formattedDate,
        time: formattedTime,
        duration: s.duration_minutes || 60,
        machineLabel
      };
    });

    const sessionsHtml = sessionBlocks.map((b: any) => `
      <div style="background-color: #FEF0E6; border-left: 4px solid #ea7034; border-radius: 12px; padding: 18px; margin-bottom: 16px; text-align: left;">
        <h3 style="color: #ea7034; font-size: 16px; font-weight: 800; margin: 0 0 10px 0;">${b.title}</h3>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #555;">
          <tr>
            <td style="padding: 4px 0; font-weight: 700; width: 100px;">Profesora:</td>
            <td style="padding: 4px 0;">${b.instructorName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 700;">Fecha:</td>
            <td style="padding: 4px 0; text-transform: capitalize;">${b.date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 700;">Hora:</td>
            <td style="padding: 4px 0;">${b.time} (${b.duration} min)</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 700;">Máquina:</td>
            <td style="padding: 4px 0; font-weight: 800; color: #ea7034;">${b.machineLabel}</td>
          </tr>
        </table>
      </div>
    `).join('');

    // E. Send Confirmation to User
    const userHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #ea7034; border-radius: 20px; background-color: #ffffff; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ea7034; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">GlideForce</h1>
          <p style="color: #666; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Reserva Confirmada</p>
        </div>
        <div style="height: 1px; background-color: #f0f0f0; margin-bottom: 24px;"></div>
        
        <h2 style="color: #333; font-size: 20px; font-weight: 800; margin-top: 0; text-align: left;">¡Hola ${profile.full_name}!</h2>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 20px; text-align: left;">
          Tu lugar ha sido asegurado con éxito. Aquí tienes los detalles de tu reserva:
        </p>

        ${sessionsHtml}
        
        <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 24px; text-align: left;">
          Recuerda llegar 5 minutos antes de la clase. Si necesitas cancelar, recuerda hacerlo dentro del plazo permitido para recibir tu reembolso.
        </p>
        
        <div style="height: 1px; background-color: #f0f0f0; margin-top: 24px; margin-bottom: 20px;"></div>
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          GlideForce — Studio de Fitness. Todos los derechos reservados.
        </p>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Reserva Confirmada · GlideForce`,
      html: userHtml,
      text: `Hola ${profile.full_name}, tu reserva ha sido confirmada para ${sessions.map((s: any)=>s.title).join(', ')}.`,
    });

    // F. Optionally Send Notification to Admin (only if triggered by user)
    if (notifyAdmin) {
      const adminHtml = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #ea7034; border-radius: 20px; background-color: #ffffff; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ea7034; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">GlideForce Admin</h1>
            <p style="color: #666; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Nueva Reserva Realizada</p>
          </div>
          <div style="height: 1px; background-color: #f0f0f0; margin-bottom: 24px;"></div>
          
          <h2 style="color: #333; font-size: 18px; font-weight: 800; margin-top: 0; text-align: left;">Reserva Realizada por Usuario</h2>
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 20px; text-align: left;">
            El usuario <strong>${profile.full_name}</strong> (${profile.email}) ha realizado una nueva reserva:
          </p>

          ${sessionsHtml}
          
          <div style="height: 1px; background-color: #f0f0f0; margin-top: 24px; margin-bottom: 20px;"></div>
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Notificación automática de GlideForce Admin.
          </p>
        </div>
      `;

      await sendEmail({
        to: adminEmail,
        subject: `🚨 Nueva Reserva · ${profile.full_name}`,
        html: adminHtml,
        text: `El usuario ${profile.full_name} (${profile.email}) ha reservado clases: ${sessions.map((s: any)=>s.title).join(', ')}.`,
      });
    }

  } catch (err) {
    console.error('[EmailService] Error in sendBookingEmails:', err);
  }
}

/**
 * 2. User Registration Notification Email to Admin
 */
export async function sendRegistrationNotificationToAdmin(userData: {
  full_name: string;
  email: string;
  phone: string | null;
}) {
  const adminEmail = process.env.GMAIL_EMAIL || 'glideandlift@gmail.com';
  const formattedDate = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const adminHtml = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #ea7034; border-radius: 20px; background-color: #ffffff; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ea7034; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">GlideForce Admin</h1>
        <p style="color: #666; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Nuevo Registro de Usuario</p>
      </div>
      <div style="height: 1px; background-color: #f0f0f0; margin-bottom: 24px;"></div>
      
      <h2 style="color: #333; font-size: 18px; font-weight: 800; margin-top: 0; text-align: left;">¡Hola Administrador!</h2>
      <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 20px; text-align: left;">
        Un nuevo miembro se ha registrado en la plataforma. Aquí tienes los detalles:
      </p>

      <div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 12px; padding: 18px; margin-bottom: 20px; text-align: left;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #555;">
          <tr>
            <td style="padding: 6px 0; font-weight: 700; width: 140px;">Nombre Completo:</td>
            <td style="padding: 6px 0; color: #333; font-weight: 700;">${userData.full_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 700;">Correo Electrónico:</td>
            <td style="padding: 6px 0;">${userData.email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 700;">Celular / Teléfono:</td>
            <td style="padding: 6px 0;">${userData.phone || 'No provisto'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 700;">Fecha de Registro:</td>
            <td style="padding: 6px 0;">${formattedDate}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #666; line-height: 1.6; text-align: left;">
        El perfil ya se encuentra registrado en el sistema. Puedes visualizar los detalles completos desde el panel administrativo.
      </p>
      
      <div style="height: 1px; background-color: #f0f0f0; margin-top: 24px; margin-bottom: 20px;"></div>
      <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
        Notificación automática de GlideForce Admin.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: adminEmail,
      subject: `🆕 Nuevo Registro · ${userData.full_name}`,
      html: adminHtml,
      text: `Un nuevo usuario se ha registrado: ${userData.full_name} (${userData.email}).`,
    });
  } catch (err) {
    console.error('[EmailService] Error in sendRegistrationNotificationToAdmin:', err);
  }
}

/**
 * 3. Booking Cancellation Notification to Admin
 */
export async function sendCancellationNotificationToAdmin(
  memberId: string,
  sessionId: string,
  refunded: boolean
) {
  const adminEmail = process.env.GMAIL_EMAIL || 'glideandlift@gmail.com';
  const adminSupabase = createAdminClient() as any;

  try {
    // A. Fetch User Profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', memberId)
      .single();

    if (!profile) throw new Error('User profile not found for cancellation email.');

    // B. Fetch Session info
    const { data: session } = await adminSupabase
      .from('class_sessions')
      .select('title, date, start_time, duration_minutes, instructors(name)')
      .eq('id', sessionId)
      .single();

    if (!session) throw new Error('Session not found for cancellation email.');

    const formattedDate = formatEmailDate(session.date);
    const formattedTime = formatEmailTime(session.start_time);
    const instructorName = (session as any).instructors?.name || 'Instructor';

    const refundText = refunded ? 'Sí (1 sesión reembolsada)' : 'No (Fuera de tiempo permitido)';
    const refundColor = refunded ? '#0F8B76' : '#DC2626';

    const adminHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #dc2626; border-radius: 20px; background-color: #ffffff; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">GlideForce Admin</h1>
          <p style="color: #666; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Reserva Cancelada por Usuario</p>
        </div>
        <div style="height: 1px; background-color: #f0f0f0; margin-bottom: 24px;"></div>
        
        <h2 style="color: #333; font-size: 18px; font-weight: 800; margin-top: 0; text-align: left;">Cancelación de Reserva</h2>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 20px; text-align: left;">
          El usuario <strong>${profile.full_name}</strong> (${profile.email}) ha cancelado su reserva para la siguiente clase:
        </p>

        <div style="background-color: #FEE2E2; border-left: 4px solid #dc2626; border-radius: 12px; padding: 18px; margin-bottom: 16px; text-align: left;">
          <h3 style="color: #dc2626; font-size: 16px; font-weight: 800; margin: 0 0 10px 0;">${session.title}</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #555;">
            <tr>
              <td style="padding: 4px 0; font-weight: 700; width: 100px;">Profesora:</td>
              <td style="padding: 4px 0;">${instructorName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 700;">Fecha:</td>
              <td style="padding: 4px 0; text-transform: capitalize;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 700;">Hora:</td>
              <td style="padding: 4px 0;">${formattedTime} (${session.duration_minutes || 60} min)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 700;">Reembolsada:</td>
              <td style="padding: 4px 0; font-weight: 700; color: ${refundColor};">${refundText}</td>
            </tr>
          </table>
        </div>
        
        <div style="height: 1px; background-color: #f0f0f0; margin-top: 24px; margin-bottom: 20px;"></div>
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          Notificación automática de GlideForce Admin.
        </p>
      </div>
    `;

    await sendEmail({
      to: adminEmail,
      subject: `❌ Reserva Cancelada · ${profile.full_name}`,
      html: adminHtml,
      text: `El usuario ${profile.full_name} ha cancelado su reserva para la clase: ${session.title}. Reembolsada: ${refunded ? 'Sí' : 'No'}.`,
    });

  } catch (err) {
    console.error('[EmailService] Error in sendCancellationNotificationToAdmin:', err);
  }
}

/**
 * 4. Class Reminder Email to User (3 Hours Before)
 */
export async function sendClassReminderEmail(
  memberId: string,
  session: any,
  machineLabel: string
) {
  const adminSupabase = createAdminClient() as any;

  try {
    // Fetch User Profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', memberId)
      .single();

    if (!profile) throw new Error('User profile not found for reminder email.');

    const formattedDate = formatEmailDate(session.date);
    const formattedTime = formatEmailTime(session.start_time);
    const instructorName = session.instructors?.name || 'Instructor';

    const reminderHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #ea7034; border-radius: 20px; background-color: #ffffff; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ea7034; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">GlideForce</h1>
          <p style="color: #666; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Recordatorio de Clase</p>
        </div>
        <div style="height: 1px; background-color: #f0f0f0; margin-bottom: 24px;"></div>
        
        <h2 style="color: #333; font-size: 20px; font-weight: 800; margin-top: 0; text-align: left;">¡Hola ${profile.full_name}!</h2>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 20px; text-align: left;">
          Te recordamos que tienes una clase programada para <strong>hoy</strong>. ¡Estamos listos para entrenar contigo!
        </p>

        <div style="background-color: #FEF0E6; border-left: 4px solid #ea7034; border-radius: 12px; padding: 18px; margin-bottom: 20px; text-align: left;">
          <h3 style="color: #ea7034; font-size: 16px; font-weight: 800; margin: 0 0 10px 0;">${session.title}</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #555;">
            <tr>
              <td style="padding: 4px 0; font-weight: 700; width: 100px;">Profesora:</td>
              <td style="padding: 4px 0;">${instructorName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 700;">Fecha:</td>
              <td style="padding: 4px 0; text-transform: capitalize;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 700;">Hora:</td>
              <td style="padding: 4px 0;">${formattedTime} (${session.duration_minutes || 60} min)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 700;">Máquina:</td>
              <td style="padding: 4px 0; font-weight: 800; color: #ea7034;">${machineLabel}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #666; line-height: 1.6; text-align: left;">
          Por favor, recuerda estar listo e hidratado. Si tienes algún contratiempo, ponte en contacto con nosotros.
        </p>
        
        <div style="height: 1px; background-color: #f0f0f0; margin-top: 24px; margin-bottom: 20px;"></div>
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          GlideForce — Studio de Fitness. Todos los derechos reservados.
        </p>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `⏰ Recordatorio de Clase: ${session.title} · GlideForce`,
      html: reminderHtml,
      text: `Hola ${profile.full_name}, recuerda tu clase de ${session.title} hoy a las ${formattedTime}.`,
    });

  } catch (err) {
    console.error('[EmailService] Error in sendClassReminderEmail:', err);
  }
}

