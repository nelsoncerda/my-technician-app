const config = require('./store.config.json');

const reviewPassword = process.env.APPLE_REVIEW_PASSWORD?.trim();

if (reviewPassword) {
  config.apple.review = {
    firstName: 'Nelson',
    lastName: 'Cerda',
    email: 'ncerda@hotmail.com',
    phone: '+14072850993',
    demoUsername: 'apple-review@tecnicosenrd.com',
    demoPassword: reviewPassword,
    demoRequired: true,
    notes: [
      'Técnicos en RD conecta clientes con profesionales locales en Santiago y el Cibao.',
      'Para probar una reserva: inicia sesión, abre Buscar, selecciona un técnico, pulsa Reservar, elige fecha y hora y completa la dirección.',
      'El GPS es opcional y solo se solicita al pulsar “Usar mi ubicación”; la dirección también puede escribirse manualmente.',
      'Después de completar un servicio, el cliente puede elegir de 1 a 5 estrellas y una frase de experiencia predefinida. La app no permite escribir ni mostrar comentarios libres.',
      'La foto de perfil es opcional y usa únicamente el selector de la biblioteca; la app no solicita cámara ni micrófono. Toda foto nueva queda pendiente y no se publica hasta la aprobación administrativa.',
      'Los usuarios aceptan expresamente las normas de la comunidad. Reportar y Bloquear son acciones separadas en perfiles y contactos de reservas; Cuenta permite consultar reportes y administrar bloqueos.',
      'La cuenta administrativa incluye una cola con SLA, notas de resolución, aprobación/rechazo, retiro de contenido, advertencias y suspensión.',
      'La eliminación permanente está en Cuenta → Zona de cuidado → Eliminar cuenta.',
      'Las cuentas profesionales pueden gestionar solicitudes y disponibilidad. Las herramientas administrativas solo aparecen para cuentas con rol admin.',
    ].join('\n\n'),
  };
}

module.exports = config;
