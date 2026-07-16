import { LegalScreen, type LegalSection } from '@/components/legal';

const sections: LegalSection[] = [
  {
    title: '1. Información que recopilamos',
    paragraphs: ['Recopilamos únicamente los datos necesarios para crear cuentas, mostrar profesionales y coordinar servicios.'],
    bullets: [
      'Nombre, correo electrónico, teléfono y credenciales protegidas de la cuenta.',
      'Dirección, ciudad, fecha, hora y descripción que proporcionas al solicitar un servicio.',
      'Perfiles profesionales, especialidades, fotos opcionales, reservas y reseñas.',
      'Procesamiento temporal de la ubicación solo cuando pulsas “Usar mi ubicación”. Las coordenadas no se guardan en nuestra API y no usamos ubicación en segundo plano.',
      'Datos técnicos básicos necesarios para seguridad, diagnóstico y prevención de abuso.',
    ],
  },
  {
    title: '2. Cómo usamos la información',
    paragraphs: ['Usamos estos datos para operar la aplicación, conectar clientes con técnicos, gestionar reservas, enviar avisos del servicio, mantener la seguridad y cumplir obligaciones legales. No vendemos información personal.'],
  },
  {
    title: '3. Cuándo compartimos datos',
    paragraphs: ['Compartimos los detalles necesarios de una reserva entre el cliente y el técnico seleccionado. También podemos utilizar proveedores que alojan la aplicación, la base de datos o el correo, sujetos a obligaciones de confidencialidad y seguridad.'],
  },
  {
    title: '4. Ubicación y sensores',
    paragraphs: ['El acceso al GPS es opcional, ocurre en primer plano y sirve para sugerir una zona o completar una dirección. Puedes negar el permiso y escribir la ubicación manualmente. La aplicación no utiliza acelerómetro, cámara ni micrófono.'],
  },
  {
    title: '5. Conservación y seguridad',
    paragraphs: ['Conservamos la información mientras la cuenta esté activa o sea necesaria para prestar el servicio, resolver disputas y cumplir la ley. Aplicamos controles de acceso, conexiones cifradas y almacenamiento seguro del token de sesión en el dispositivo. Ningún sistema puede garantizar seguridad absoluta.'],
  },
  {
    title: '6. Tus opciones y derechos',
    paragraphs: ['Puedes cerrar sesión, negar el permiso de ubicación y eliminar permanentemente tu cuenta desde Cuenta → Eliminar cuenta. La eliminación borra el perfil y los datos asociados según lo permita la ley.'],
  },
  {
    title: '7. Menores y cambios',
    paragraphs: ['Técnicos en RD no está dirigida a menores de 13 años. Podemos actualizar esta política cuando cambien la aplicación o las obligaciones aplicables; mostraremos la nueva fecha de vigencia.'],
  },
];

export default function PrivacyScreen() {
  return (
    <LegalScreen
      effectiveDate="15 de julio de 2026"
      intro="Esta política explica cómo Técnicos en RD trata la información de clientes y profesionales dentro de la aplicación móvil."
      sections={sections}
      title="Política de privacidad"
    />
  );
}
