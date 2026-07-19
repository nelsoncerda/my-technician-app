import { LegalScreen, type LegalSection } from '@/components/legal';

const sections: LegalSection[] = [
  {
    title: '1. Uso de la plataforma',
    paragraphs: ['Técnicos en RD facilita el contacto y la coordinación de servicios entre clientes y profesionales independientes en República Dominicana. Debes proporcionar información correcta, proteger tu cuenta y utilizar la aplicación de forma lícita.'],
  },
  {
    title: '2. Normas de la comunidad y consentimiento',
    paragraphs: ['Antes de crear una cuenta o publicar contenido debes aceptar expresamente estas normas. La casilla no aparece preseleccionada. Si actualizamos sustancialmente las reglas, podremos solicitar una nueva aceptación antes de permitir publicaciones adicionales.'],
    bullets: [
      'Publica únicamente información, fotos y descripciones que tengas derecho a compartir.',
      'Describe servicios y experiencias de forma auténtica, clara y respetuosa.',
      'Protege la privacidad: no publiques contraseñas, datos bancarios, información médica ni domicilios de otras personas.',
    ],
  },
  {
    title: '3. Contenido y conductas prohibidas',
    paragraphs: ['No toleramos contenido ilegal, engañoso, dañino u objetable. Podemos rechazarlo o retirarlo aunque no aparezca exactamente en esta lista.'],
    bullets: [
      'Spam, publicidad engañosa, fraude, estafas, suplantación o perfiles falsos.',
      'Acoso, amenazas, violencia, odio, discriminación o explotación.',
      'Contenido sexual, imágenes de menores, material gráfico o promoción de actividades ilegales.',
      'Exposición de datos privados, propiedad intelectual ajena, manipulación de calificaciones o intentos de evadir controles de seguridad.',
    ],
  },
  {
    title: '4. Reportar y bloquear',
    paragraphs: ['Cada perfil e interacción elegible ofrece acciones separadas para Reportar y Bloquear. Reportar envía un motivo controlado y detalles opcionales al equipo de moderación; la identidad del reportante no se muestra al usuario reportado. Bloquear oculta nuevas interacciones entre ambas cuentas y puede deshacerse desde Cuenta → Usuarios bloqueados. Bloquear no cancela automáticamente una reserva ya existente ni elimina su historial protegido.'],
  },
  {
    title: '5. Revisión, medidas y apelaciones',
    paragraphs: ['Los perfiles profesionales y las fotos nuevas se mantienen fuera de la experiencia pública hasta ser aprobados. Priorizamos reportes y elementos pendientes con un objetivo operativo de revisión de 24 horas. Según la gravedad y reincidencia, podemos advertir, rechazar o retirar contenido, suspender un perfil profesional, limitar funciones o eliminar una cuenta. Conservamos un registro interno de la decisión para seguridad y rendición de cuentas.'],
    bullets: [
      'Puedes consultar el estado de tus reportes desde Cuenta → Mis reportes.',
      'Para apelar una decisión o informar una urgencia de seguridad, escribe a ncerda@hotmail.com desde el correo de tu cuenta e incluye el contexto relevante.',
      'Los reportes falsos, coordinados o abusivos también incumplen estas normas.',
    ],
  },
  {
    title: '6. Técnicos independientes',
    paragraphs: ['Los técnicos ofrecen sus servicios de manera independiente. Cada cliente debe revisar el perfil, experiencia, disponibilidad, alcance y precio antes de autorizar un trabajo. La aprobación de contenido o verificación de un perfil no garantiza un resultado específico.'],
  },
  {
    title: '7. Reservas, precios y cancelaciones',
    paragraphs: ['Una solicitud queda pendiente hasta que el técnico la confirme. El alcance, materiales, precio final y forma de pago deben acordarse entre las partes. Las reservas pendientes o confirmadas pueden cancelarse desde la aplicación; las partes deben comunicar cualquier cambio con antelación razonable.'],
  },
  {
    title: '8. Emergencias y seguridad personal',
    paragraphs: ['La aplicación no es un servicio de emergencia. Ante fuego, fuga peligrosa, riesgo eléctrico, violencia o una urgencia médica, contacta primero a las autoridades o servicios de emergencia correspondientes. No te reúnas ni continúes un servicio si la situación parece insegura.'],
  },
  {
    title: '9. Disponibilidad, suspensión y eliminación',
    paragraphs: ['Procuramos mantener la aplicación disponible y segura, pero puede haber interrupciones. Puedes eliminar tu cuenta desde la aplicación. También podemos suspender o eliminar cuentas por fraude, abuso, riesgo para terceros o incumplimiento. En la medida permitida por la ley, Técnicos en RD no responde por acuerdos, pagos, daños o disputas derivados directamente del trabajo independiente entre usuarios.'],
  },
  {
    title: '10. Cambios y ley aplicable',
    paragraphs: ['Podemos actualizar estos términos y mostraremos una nueva fecha de vigencia. Se interpretan conforme a las leyes de la República Dominicana, sin perjuicio de los derechos obligatorios que correspondan al usuario.'],
  },
];

export default function TermsScreen() {
  return (
    <LegalScreen
      effectiveDate="18 de julio de 2026"
      intro="Al crear una cuenta o usar Técnicos en RD, aceptas estas reglas de uso y de seguridad de la comunidad."
      sections={sections}
      title="Términos y normas de la comunidad"
    />
  );
}
