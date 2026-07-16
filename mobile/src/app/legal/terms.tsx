import { LegalScreen, type LegalSection } from '@/components/legal';

const sections: LegalSection[] = [
  {
    title: '1. Uso de la plataforma',
    paragraphs: ['Técnicos en RD facilita el contacto y la coordinación de servicios entre clientes y profesionales independientes en República Dominicana. Debes proporcionar información correcta, proteger tu cuenta y utilizar la aplicación de forma lícita.'],
  },
  {
    title: '2. Técnicos independientes',
    paragraphs: ['Los técnicos ofrecen sus servicios de manera independiente. Cada cliente debe revisar el perfil, experiencia, disponibilidad, alcance y precio antes de autorizar un trabajo. La publicación de un perfil no constituye garantía sobre un resultado específico.'],
  },
  {
    title: '3. Reservas, precios y cancelaciones',
    paragraphs: ['Una solicitud queda pendiente hasta que el técnico la confirme. El alcance, materiales, precio final y forma de pago deben acordarse entre las partes. Las reservas pendientes o confirmadas pueden cancelarse desde la aplicación; las partes deben comunicar cualquier cambio con antelación razonable.'],
  },
  {
    title: '4. Conducta y contenido',
    paragraphs: ['No puedes suplantar personas, publicar información falsa, acosar, defraudar, vulnerar sistemas, usar datos de otros fuera del servicio ni manipular calificaciones. Podemos retirar contenido o limitar cuentas para proteger a usuarios y a la plataforma.'],
  },
  {
    title: '5. Emergencias y seguridad',
    paragraphs: ['La aplicación no es un servicio de emergencia. Ante fuego, fuga peligrosa, riesgo eléctrico, violencia o una urgencia médica, contacta primero a las autoridades o servicios de emergencia correspondientes.'],
  },
  {
    title: '6. Disponibilidad y responsabilidad',
    paragraphs: ['Procuramos mantener la aplicación disponible y segura, pero puede haber interrupciones. En la medida permitida por la ley, Técnicos en RD no responde por acuerdos, pagos, daños o disputas derivados directamente del trabajo independiente entre usuarios. Nada en estos términos limita derechos que la ley no permita excluir.'],
  },
  {
    title: '7. Suspensión, eliminación y cambios',
    paragraphs: ['Puedes eliminar tu cuenta desde la aplicación. También podemos suspender cuentas por fraude, abuso o incumplimiento. Podemos actualizar estos términos y mostraremos una nueva fecha de vigencia cuando ocurra.'],
  },
  {
    title: '8. Ley aplicable',
    paragraphs: ['Estos términos se interpretan conforme a las leyes de la República Dominicana, sin perjuicio de los derechos obligatorios que correspondan al usuario.'],
  },
];

export default function TermsScreen() {
  return (
    <LegalScreen
      effectiveDate="15 de julio de 2026"
      intro="Al crear una cuenta o usar Técnicos en RD, aceptas estas reglas de uso de la plataforma."
      sections={sections}
      title="Términos de uso"
    />
  );
}
