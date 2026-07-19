import { LegalScreen, type LegalSection } from '@/components/legal';

const sections: LegalSection[] = [
  {
    title: '1. Información que recopilamos',
    paragraphs: ['Recopilamos únicamente los datos necesarios para crear cuentas, mostrar profesionales, coordinar servicios y proteger a la comunidad.'],
    bullets: [
      'Nombre, correo electrónico, teléfono y credenciales protegidas de la cuenta.',
      'Dirección, ciudad, fecha, hora, descripción y motivo de cancelación que proporcionas para un servicio.',
      'Perfiles profesionales, especialidades, fotos opcionales, reservas y calificaciones estructuradas.',
      'Consentimiento de las normas: versión aceptada, fecha, dirección IP y agente de usuario para demostrar la aceptación.',
      'Reportes: usuario reportante y reportado, tipo de contenido, motivo, detalles opcionales, estado y decisión. La identidad del reportante se mantiene privada frente al usuario reportado.',
      'Bloqueos entre cuentas y registros internos de revisión, decisiones y acciones administrativas.',
      'La ubicación GPS del cliente se procesa temporalmente solo cuando pulsa “Usar mi ubicación”. Esas coordenadas no se guardan en nuestra API y no usamos ubicación en segundo plano.',
      'Si un técnico decide aparecer en el mapa, guardamos un marcador aproximado del área donde presta servicio. Nunca publicamos una dirección residencial ni una ubicación en vivo.',
    ],
  },
  {
    title: '2. Cómo usamos la información',
    paragraphs: ['Usamos estos datos para operar la aplicación, permitir búsquedas por área, conectar clientes con técnicos, gestionar reservas, moderar contenido, investigar abuso, aplicar bloqueos, documentar decisiones, atender apelaciones y cumplir obligaciones legales. No vendemos información personal ni la usamos para publicidad dirigida.'],
  },
  {
    title: '3. Moderación de perfiles y fotos',
    paragraphs: ['Los perfiles profesionales nuevos o modificados y las fotos candidatas pueden quedar pendientes de revisión antes de mostrarse públicamente. Mientras una foto nueva está pendiente, se conserva la última foto aprobada. Al aprobar una candidata se actualiza la foto pública y se elimina el payload temporal de la entrega; al rechazarla o reemplazarla se borra su contenido de imagen. Podemos conservar metadatos mínimos de la entrega y la decisión para seguridad, auditoría, prevención de abuso y obligaciones legales.'],
  },
  {
    title: '4. Cuándo compartimos datos',
    paragraphs: ['Compartimos los detalles necesarios de una reserva entre el cliente y el técnico seleccionado. Los perfiles aprobados muestran únicamente la información pública elegida. También podemos utilizar proveedores de alojamiento, base de datos, correo o mapas sujetos a obligaciones de seguridad. Podemos facilitar información a autoridades cuando la ley lo requiera o sea necesario para proteger a una persona.'],
  },
  {
    title: '5. Ubicación y sensores',
    paragraphs: ['Para clientes, el acceso al GPS es opcional, ocurre en primer plano y sirve para sugerir una zona o completar una dirección; puedes negar el permiso y escribirla manualmente. Para técnicos, el marcador representa un área aproximada, puede ocultarse desde el perfil y no sigue al técnico. La aplicación no utiliza acelerómetro, cámara ni micrófono. La biblioteca de fotos se abre únicamente cuando eliges una foto.'],
  },
  {
    title: '6. Conservación y seguridad',
    paragraphs: ['Conservamos la información mientras la cuenta esté activa o sea necesaria para prestar el servicio, resolver disputas, moderar reincidencias y cumplir la ley. Los reportes y registros de decisiones pueden conservarse después de cerrar un caso para prevenir abuso y demostrar actuaciones de seguridad. Al eliminar una cuenta, borramos sus datos operativos y sustituimos la identidad vinculada a evidencia necesaria por una referencia seudónima. Una instantánea mínima puede conservar el nombre público, el rol y la referencia interna que existían al reportar, pero no contiene el correo original. Si existía una suspensión activa, mantenemos un marcador seudónimo mínimo para impedir que se evada la medida volviendo a registrar la misma cuenta; la restricción puede revisarse mediante una apelación. Aplicamos controles de acceso, conexiones cifradas y almacenamiento seguro del token de sesión en el dispositivo. Ningún sistema puede garantizar seguridad absoluta.'],
  },
  {
    title: '7. Tus opciones y derechos',
    paragraphs: ['Puedes cerrar sesión, negar el permiso de ubicación, ocultar tu zona aproximada, administrar bloqueos, consultar tus reportes y eliminar permanentemente tu cuenta desde Cuenta. Puedes solicitar acceso, corrección, apelar una restricción o pedir información adicional escribiendo a ncerda@hotmail.com. La eliminación borra los datos operativos y seudonimiza únicamente la evidencia mínima que debamos conservar por seguridad, disputas o una obligación legal.'],
  },
  {
    title: '8. Menores y cambios',
    paragraphs: ['Técnicos en RD no está dirigida a menores de 13 años. Podemos actualizar esta política cuando cambien la aplicación o las obligaciones aplicables; mostraremos la nueva fecha de vigencia y, cuando corresponda, solicitaremos un consentimiento actualizado.'],
  },
];

export default function PrivacyScreen() {
  return (
    <LegalScreen
      effectiveDate="18 de julio de 2026"
      intro="Esta política explica cómo Técnicos en RD trata la información de clientes y profesionales, incluidos los controles de seguridad y moderación."
      sections={sections}
      title="Política de privacidad"
    />
  );
}
