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
      'La eliminación permanente está en Cuenta → Zona de cuidado → Eliminar cuenta.',
      'Esta versión muestra calificaciones agregadas y no permite publicar comentarios o reseñas escritas desde la aplicación móvil.',
    ].join('\n\n'),
  };
}

module.exports = config;
