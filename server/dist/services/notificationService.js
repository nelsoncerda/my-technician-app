"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingCreatedToCustomer = sendBookingCreatedToCustomer;
exports.sendBookingCreatedToTechnician = sendBookingCreatedToTechnician;
exports.sendBookingConfirmed = sendBookingConfirmed;
exports.sendBookingCompleted = sendBookingCompleted;
exports.sendBookingCancelled = sendBookingCancelled;
exports.sendBookingReminder = sendBookingReminder;
exports.sendAchievementUnlocked = sendAchievementUnlocked;
exports.sendLevelUp = sendLevelUp;
exports.sendPointsEarned = sendPointsEarned;
const emailService_1 = require("./emailService");
// Format date for display
function formatDate(date) {
    return new Intl.DateTimeFormat('es-DO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(date));
}
// Format time for display
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}
// Send booking created notification to customer
function sendBookingCreatedToCustomer(booking) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `Reserva Confirmada - Técnicos en RD`;
        const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Técnicos en RD</h1>
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: booking.customer.email,
            subject,
            html,
        });
    });
}
// Send booking notification to technician
function sendBookingCreatedToTechnician(booking) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `Nueva Reserva - Técnicos en RD`;
        const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Técnicos en RD</h1>
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: booking.technician.user.email,
            subject,
            html,
        });
    });
}
// Send booking confirmed notification
function sendBookingConfirmed(booking) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `Reserva Confirmada - Técnicos en RD`;
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: booking.customer.email,
            subject,
            html,
        });
    });
}
// Send booking completed notification
function sendBookingCompleted(booking) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `Servicio Completado - Técnicos en RD`;
        const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎉 Servicio Completado</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">¡Gracias por usar Técnicos en RD!</h2>

        <p style="color: #4b5563;">Hola ${booking.customer.name},</p>

        <p style="color: #4b5563;">Tu servicio con ${booking.technician.user.name} ha sido completado.</p>

        <div style="background: #FEF3C7; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #F59E0B;">
          <p style="margin: 0; color: #92400E;"><strong>🌟 ¡Gana puntos extra!</strong></p>
          <p style="margin: 10px 0 0 0; color: #92400E;">Deja una reseña y gana 20 puntos. ¡Las reseñas de 5 estrellas dan 50 puntos extra al técnico!</p>
        </div>

        <p style="color: #4b5563;">También has ganado <strong>50 puntos</strong> por completar esta reserva.</p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: booking.customer.email,
            subject,
            html,
        });
    });
}
// Send booking cancelled notification
function sendBookingCancelled(booking, cancelledBy, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        const recipientEmail = cancelledBy === 'technician' ? booking.customer.email : booking.technician.user.email;
        const recipientName = cancelledBy === 'technician' ? booking.customer.name : booking.technician.user.name;
        const subject = `Reserva Cancelada - Técnicos en RD`;
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: recipientEmail,
            subject,
            html,
        });
    });
}
// Send booking reminder
function sendBookingReminder(booking, hoursUntil) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `Recordatorio: Reserva en ${hoursUntil} horas - Técnicos en RD`;
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: booking.customer.email,
            subject,
            html,
        });
    });
}
// Send achievement unlocked notification
function sendAchievementUnlocked(userEmail, userName, achievement) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `🏆 ¡Logro Desbloqueado! - Técnicos en RD`;
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: userEmail,
            subject,
            html,
        });
    });
}
// Send level up notification
function sendLevelUp(userEmail, userName, newLevel) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `🎉 ¡Subiste de Nivel! - Técnicos en RD`;
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: userEmail,
            subject,
            html,
        });
    });
}
// Send points earned notification
function sendPointsEarned(userEmail, userName, points, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = `+${points} Puntos - Técnicos en RD`;
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
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2025 Técnicos en RD. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
        yield (0, emailService_1.sendEmail)({
            to: userEmail,
            subject,
            html,
        });
    });
}
