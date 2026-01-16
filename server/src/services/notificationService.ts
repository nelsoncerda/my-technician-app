import { sendEmail } from './emailService';

interface BookingNotificationData {
  id: string;
  scheduledDate: Date;
  scheduledTime: string;
  serviceType: string;
  address: string;
  city: string;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  technician: {
    user: {
      name: string;
      email: string;
      phone?: string | null;
    };
  };
}

interface AchievementNotificationData {
  name: string;
  nameEs: string;
  description: string;
  pointsReward: number;
}

interface LevelUpNotificationData {
  levelNumber: number;
  name: string;
  nameEs: string;
}

// Format date for display
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

// Format time for display
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Send booking created notification to customer
export async function sendBookingCreatedToCustomer(booking: BookingNotificationData) {
  const subject = `Reserva Confirmada - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Santiago Tech RD</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">¡Reserva Creada!</h2>

        <p style="color: #4b5563;">Hola ${booking.customer.name},</p>

        <p style="color: #4b5563;">Tu reserva ha sido creada exitosamente. Aquí están los detalles:</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 5px 0;"><strong>Técnico:</strong> ${booking.technician.user.name}</p>
          <p style="margin: 5px 0;"><strong>Servicio:</strong> ${booking.serviceType}</p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formatDate(booking.scheduledDate)}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${formatTime(booking.scheduledTime)}</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> ${booking.address}, ${booking.city}</p>
        </div>

        <p style="color: #4b5563;">El técnico confirmará tu reserva pronto. Te notificaremos cuando lo haga.</p>

        <p style="color: #6b7280; font-size: 14px;">¿Tienes preguntas? Responde a este correo.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: booking.customer.email,
    subject,
    html,
  });
}

// Send booking notification to technician
export async function sendBookingCreatedToTechnician(booking: BookingNotificationData) {
  const subject = `Nueva Reserva - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Santiago Tech RD</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">¡Nueva Reserva!</h2>

        <p style="color: #4b5563;">Hola ${booking.technician.user.name},</p>

        <p style="color: #4b5563;">Tienes una nueva solicitud de reserva:</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 5px 0;"><strong>Cliente:</strong> ${booking.customer.name}</p>
          <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${booking.customer.phone || 'No proporcionado'}</p>
          <p style="margin: 5px 0;"><strong>Servicio:</strong> ${booking.serviceType}</p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formatDate(booking.scheduledDate)}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${formatTime(booking.scheduledTime)}</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> ${booking.address}, ${booking.city}</p>
        </div>

        <p style="color: #4b5563;"><strong>⚡ Responde en menos de 1 hora para ganar puntos extra!</strong></p>

        <p style="color: #6b7280; font-size: 14px;">Inicia sesión en la plataforma para confirmar o rechazar esta reserva.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: booking.technician.user.email,
    subject,
    html,
  });
}

// Send booking confirmed notification
export async function sendBookingConfirmed(booking: BookingNotificationData) {
  const subject = `Reserva Confirmada - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">✓ Reserva Confirmada</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">¡Tu reserva ha sido confirmada!</h2>

        <p style="color: #4b5563;">Hola ${booking.customer.name},</p>

        <p style="color: #4b5563;">${booking.technician.user.name} ha confirmado tu reserva:</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 5px 0;"><strong>Servicio:</strong> ${booking.serviceType}</p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formatDate(booking.scheduledDate)}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${formatTime(booking.scheduledTime)}</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> ${booking.address}, ${booking.city}</p>
          <p style="margin: 5px 0;"><strong>Teléfono del técnico:</strong> ${booking.technician.user.phone || 'No disponible'}</p>
        </div>

        <p style="color: #4b5563;">Te enviaremos un recordatorio antes de la cita.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: booking.customer.email,
    subject,
    html,
  });
}

// Send booking completed notification
export async function sendBookingCompleted(booking: BookingNotificationData) {
  const subject = `Servicio Completado - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎉 Servicio Completado</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">¡Gracias por usar Santiago Tech RD!</h2>

        <p style="color: #4b5563;">Hola ${booking.customer.name},</p>

        <p style="color: #4b5563;">Tu servicio con ${booking.technician.user.name} ha sido completado.</p>

        <div style="background: #FEF3C7; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #F59E0B;">
          <p style="margin: 0; color: #92400E;"><strong>🌟 ¡Gana puntos extra!</strong></p>
          <p style="margin: 10px 0 0 0; color: #92400E;">Deja una reseña y gana 20 puntos. ¡Las reseñas de 5 estrellas dan 50 puntos extra al técnico!</p>
        </div>

        <p style="color: #4b5563;">También has ganado <strong>50 puntos</strong> por completar esta reserva.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: booking.customer.email,
    subject,
    html,
  });
}

// Send booking cancelled notification
export async function sendBookingCancelled(
  booking: BookingNotificationData,
  cancelledBy: string,
  reason?: string
) {
  const recipientEmail = cancelledBy === 'technician' ? booking.customer.email : booking.technician.user.email;
  const recipientName = cancelledBy === 'technician' ? booking.customer.name : booking.technician.user.name;

  const subject = `Reserva Cancelada - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Reserva Cancelada</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <p style="color: #4b5563;">Hola ${recipientName},</p>

        <p style="color: #4b5563;">Lamentamos informarte que la reserva para ${formatDate(booking.scheduledDate)} a las ${formatTime(booking.scheduledTime)} ha sido cancelada.</p>

        ${reason ? `<p style="color: #4b5563;"><strong>Razón:</strong> ${reason}</p>` : ''}

        <p style="color: #4b5563;">Si tienes preguntas, no dudes en contactarnos.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

// Send booking reminder
export async function sendBookingReminder(booking: BookingNotificationData, hoursUntil: number) {
  const subject = `Recordatorio: Reserva en ${hoursUntil} horas - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">⏰ Recordatorio de Reserva</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <p style="color: #4b5563;">Hola ${booking.customer.name},</p>

        <p style="color: #4b5563;">Te recordamos que tienes una reserva programada en <strong>${hoursUntil} horas</strong>:</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 5px 0;"><strong>Técnico:</strong> ${booking.technician.user.name}</p>
          <p style="margin: 5px 0;"><strong>Servicio:</strong> ${booking.serviceType}</p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formatDate(booking.scheduledDate)}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${formatTime(booking.scheduledTime)}</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> ${booking.address}, ${booking.city}</p>
        </div>

        <p style="color: #4b5563;">Asegúrate de estar disponible en la dirección indicada.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: booking.customer.email,
    subject,
    html,
  });
}

// Send achievement unlocked notification
export async function sendAchievementUnlocked(
  userEmail: string,
  userName: string,
  achievement: AchievementNotificationData
) {
  const subject = `🏆 ¡Logro Desbloqueado! - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🏆 ¡Logro Desbloqueado!</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb; text-align: center;">
        <p style="color: #4b5563;">¡Felicidades ${userName}!</p>

        <div style="background: white; border-radius: 12px; padding: 30px; margin: 20px 0; border: 2px solid #8B5CF6;">
          <h2 style="color: #7C3AED; margin: 0;">${achievement.nameEs}</h2>
          <p style="color: #6b7280; margin: 10px 0 0 0;">${achievement.description}</p>
          ${achievement.pointsReward > 0 ? `<p style="color: #10B981; font-weight: bold; margin-top: 15px;">+${achievement.pointsReward} puntos</p>` : ''}
        </div>

        <p style="color: #4b5563;">¡Sigue así para desbloquear más logros!</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

// Send level up notification
export async function sendLevelUp(userEmail: string, userName: string, newLevel: LevelUpNotificationData) {
  const subject = `🎉 ¡Subiste de Nivel! - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎉 ¡Nuevo Nivel!</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb; text-align: center;">
        <p style="color: #4b5563;">¡Felicidades ${userName}!</p>

        <div style="background: white; border-radius: 12px; padding: 30px; margin: 20px 0; border: 2px solid #F59E0B;">
          <p style="color: #6b7280; margin: 0;">Has alcanzado el nivel</p>
          <h1 style="color: #D97706; margin: 10px 0; font-size: 48px;">${newLevel.levelNumber}</h1>
          <h2 style="color: #1f2937; margin: 0;">${newLevel.nameEs}</h2>
        </div>

        <p style="color: #4b5563;">¡Continúa acumulando puntos para desbloquear más beneficios!</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

// Send points earned notification
export async function sendPointsEarned(
  userEmail: string,
  userName: string,
  points: number,
  reason: string
) {
  const subject = `+${points} Puntos - Santiago Tech RD`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">+${points} Puntos</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb; text-align: center;">
        <p style="color: #4b5563;">¡Bien hecho ${userName}!</p>

        <p style="color: #4b5563;">Has ganado <strong>${points} puntos</strong> por: ${reason}</p>

        <p style="color: #6b7280; font-size: 14px;">Acumula puntos para canjear recompensas increíbles.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Santiago Tech RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    html,
  });
}
