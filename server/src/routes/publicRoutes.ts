import { Router } from 'express';

const router = Router();
const EFFECTIVE_DATE = '15 de julio de 2026';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function page(title: string, description: string, content: string): string {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${safeDescription}">
  <title>${safeTitle} | Técnicos en RD</title>
  <style>
    :root{color-scheme:light;--ink:#17233c;--text:#1f2937;--muted:#667085;--sand:#f6efe5;--cream:#fffdf8;--border:#e3d7c7;--clay:#b94a35;--ocean:#2a6f97}
    *{box-sizing:border-box}body{margin:0;background:var(--sand);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65}
    header{background:var(--ink);color:var(--cream);padding:22px 20px}header div,main,footer div{max-width:820px;margin:auto}.brand{font-size:19px;font-weight:850}.tag{color:#bcc4d2;font-size:13px;margin-top:2px}
    main{padding:36px 20px 54px}article{background:var(--cream);border:1px solid var(--border);border-radius:22px;padding:clamp(22px,5vw,44px);box-shadow:0 12px 34px rgba(23,35,60,.08)}
    h1{color:var(--ink);font-size:clamp(30px,6vw,46px);letter-spacing:-.035em;line-height:1.08;margin:0 0 8px}h2{color:var(--ink);font-size:21px;line-height:1.25;margin:30px 0 9px}p{margin:0 0 13px}ul,ol{padding-left:24px}li{margin:8px 0}.date{color:var(--muted);font-size:14px;margin-bottom:26px}.notice{background:#eaf3f7;border:1px solid #c6dce7;border-radius:14px;padding:16px}.danger{background:#fee4e2;border:1px solid #fda29b;border-radius:14px;padding:16px}
    a{color:var(--ocean);font-weight:700}.button{align-items:center;background:var(--clay);border:0;border-radius:12px;color:white;cursor:pointer;display:inline-flex;font:inherit;font-weight:800;justify-content:center;min-height:48px;padding:10px 20px;text-decoration:none}.button:disabled{cursor:not-allowed;opacity:.6}
    label{display:block;font-weight:750;margin:16px 0 6px}input{background:white;border:1px solid var(--border);border-radius:11px;font:inherit;min-height:48px;padding:10px 12px;width:100%}.form-row{margin-top:20px}.message{border-radius:12px;display:none;margin-top:16px;padding:14px}.message.show{display:block}.message.ok{background:#d1eae5;color:#21665d}.message.error{background:#fee4e2;color:#b42318}
    footer{background:var(--ink);color:#bcc4d2;padding:24px 20px;font-size:13px}nav{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px}nav a{color:#e6edf7}
    @media(max-width:520px){main{padding:18px 12px 36px}article{border-radius:16px;padding:22px 18px}}
  </style>
</head>
<body>
  <header><div><div class="brand">Técnicos en RD</div><div class="tag">Profesionales locales, perfiles claros</div></div></header>
  <main><article>${content}</article></main>
  <footer><div>© 2026 Técnicos en RD<nav><a href="/support">Soporte</a><a href="/privacy">Privacidad</a><a href="/terms">Términos</a><a href="/account-deletion">Eliminar cuenta</a></nav></div></footer>
</body>
</html>`;
}

function contactParagraph(): string {
  const email = process.env.SUPPORT_EMAIL?.trim();
  if (!email) {
    return '<p>Para ejercer tus derechos, utiliza la opción de eliminación dentro de la aplicación o el canal de soporte publicado en la ficha de la tienda.</p>';
  }
  const safeEmail = escapeHtml(email);
  return `<p>Para solicitudes de privacidad o soporte, escribe a <a href="mailto:${safeEmail}">${safeEmail}</a>.</p>`;
}

router.get('/', (_req, res) => {
  res.type('html').send(page(
    'Técnicos en RD',
    'Encuentra profesionales locales y administra tus servicios desde Técnicos en RD.',
    `<h1>Resuelve lo de tu hogar con gente de aquí.</h1>
    <p>Técnicos en RD conecta clientes con profesionales locales en Santiago y el Cibao.</p>
    <div class="notice">La aplicación móvil se encuentra en preparación para TestFlight y Google Play. Si ya participas en las pruebas, abre Técnicos en RD desde tu teléfono.</div>
    <h2>¿Necesitas ayuda?</h2>
    <p>Consulta la página de <a href="/support">ayuda y soporte</a>, revisa la <a href="/privacy">política de privacidad</a> o aprende a <a href="/account-deletion">eliminar tu cuenta</a>.</p>`
  ));
});

router.get('/privacy', (_req, res) => {
  res.type('html').send(page(
    'Política de privacidad',
    'Política de privacidad de la aplicación móvil Técnicos en RD.',
    `<h1>Política de privacidad</h1>
    <p class="date">Vigente desde ${EFFECTIVE_DATE}</p>
    <p>Esta política explica cómo Técnicos en RD trata la información de clientes y profesionales dentro de la aplicación móvil.</p>
    <h2>1. Información que recopilamos</h2>
    <ul>
      <li>Nombre, correo electrónico, teléfono y credenciales protegidas de la cuenta.</li>
      <li>Dirección, ciudad, fecha, hora y descripción que proporcionas al solicitar un servicio.</li>
      <li>Perfiles profesionales, especialidades, fotos opcionales, reservas y reseñas.</li>
      <li>Procesamiento temporal de la ubicación solo cuando pulsas “Usar mi ubicación”. Las coordenadas no se guardan en nuestra API y no usamos ubicación en segundo plano.</li>
      <li>Datos técnicos básicos necesarios para seguridad, diagnóstico y prevención de abuso.</li>
    </ul>
    <h2>2. Cómo usamos la información</h2>
    <p>Usamos estos datos para operar la aplicación, conectar clientes con técnicos, gestionar reservas, enviar avisos del servicio, mantener la seguridad y cumplir obligaciones legales. No vendemos información personal.</p>
    <h2>3. Cuándo compartimos datos</h2>
    <p>Compartimos los detalles necesarios de una reserva entre el cliente y el técnico seleccionado. Amazon Web Services aloja la aplicación y la base de datos en Lightsail y procesa el correo transaccional mediante Amazon Simple Email Service (SES). Estos proveedores tratan la información únicamente para operar el servicio y están sujetos a obligaciones de confidencialidad y seguridad.</p>
    <h2>4. Ubicación y sensores</h2>
    <p>El GPS es opcional, se usa en primer plano y sirve para sugerir una zona o completar una dirección. Puedes negar el permiso y escribir la ubicación manualmente. La aplicación no utiliza acelerómetro, cámara ni micrófono.</p>
    <h2>5. Conservación y seguridad</h2>
    <p>Conservamos la información mientras la cuenta esté activa o sea necesaria para prestar el servicio, resolver disputas y cumplir la ley. Los registros técnicos de acceso, que pueden incluir dirección IP, ruta solicitada, fecha, agente de usuario y resultado HTTP, rotan diariamente y se conservan durante 14 días salvo que sean necesarios para investigar un incidente de seguridad o cumplir una obligación legal. Aplicamos controles de acceso, conexiones cifradas y almacenamiento seguro del token de sesión en el dispositivo.</p>
    <h2>6. Tus opciones y derechos</h2>
    <p>Puedes cerrar sesión, negar el permiso de ubicación y eliminar permanentemente tu cuenta desde Cuenta → Eliminar cuenta. La eliminación borra el perfil y los datos asociados según lo permita la ley.</p>
    ${contactParagraph()}
    <h2>7. Menores y cambios</h2>
    <p>Técnicos en RD no está dirigida a menores de 13 años. Podemos actualizar esta política cuando cambien la aplicación o las obligaciones aplicables; mostraremos la nueva fecha de vigencia.</p>`
  ));
});

router.get('/terms', (_req, res) => {
  res.type('html').send(page(
    'Términos de uso',
    'Términos de uso de la aplicación móvil Técnicos en RD.',
    `<h1>Términos de uso</h1>
    <p class="date">Vigentes desde ${EFFECTIVE_DATE}</p>
    <p>Al crear una cuenta o usar Técnicos en RD, aceptas estas reglas de uso.</p>
    <h2>1. Uso de la plataforma</h2>
    <p>Técnicos en RD facilita el contacto y la coordinación de servicios entre clientes y profesionales independientes en República Dominicana. Debes proporcionar información correcta, proteger tu cuenta y utilizar la aplicación de forma lícita.</p>
    <h2>2. Técnicos independientes</h2>
    <p>Los técnicos ofrecen sus servicios de manera independiente. Cada cliente debe revisar el perfil, experiencia, disponibilidad, alcance y precio antes de autorizar un trabajo. La publicación de un perfil no garantiza un resultado específico.</p>
    <h2>3. Reservas, precios y cancelaciones</h2>
    <p>Una solicitud queda pendiente hasta que el técnico la confirme. El alcance, materiales, precio final y pago deben acordarse entre las partes. Las reservas pendientes o confirmadas pueden cancelarse desde la aplicación.</p>
    <h2>4. Conducta y contenido</h2>
    <p>No puedes suplantar personas, publicar información falsa, acosar, defraudar, vulnerar sistemas, usar datos de otros fuera del servicio ni publicar reseñas engañosas. Podemos retirar contenido o limitar cuentas para proteger a usuarios y a la plataforma.</p>
    <h2>5. Emergencias y seguridad</h2>
    <p>La aplicación no es un servicio de emergencia. Ante fuego, fuga peligrosa, riesgo eléctrico, violencia o una urgencia médica, contacta primero a las autoridades o servicios de emergencia correspondientes.</p>
    <h2>6. Disponibilidad y responsabilidad</h2>
    <p>Procuramos mantener la aplicación disponible y segura, pero puede haber interrupciones. En la medida permitida por la ley, Técnicos en RD no responde por acuerdos, pagos, daños o disputas derivados directamente del trabajo independiente entre usuarios.</p>
    <h2>7. Suspensión, eliminación y cambios</h2>
    <p>Puedes eliminar tu cuenta desde la aplicación. También podemos suspender cuentas por fraude, abuso o incumplimiento. Podemos actualizar estos términos y mostraremos una nueva fecha de vigencia.</p>
    <h2>8. Ley aplicable</h2>
    <p>Estos términos se interpretan conforme a las leyes de la República Dominicana, sin perjuicio de los derechos obligatorios que correspondan al usuario.</p>
    ${contactParagraph()}`
  ));
});

router.get('/support', (_req, res) => {
  res.type('html').send(page(
    'Soporte',
    'Ayuda y soporte para la aplicación móvil Técnicos en RD.',
    `<h1>Soporte</h1>
    <p class="date">Ayuda para clientes y profesionales</p>
    <div class="notice">Antes de escribir, verifica tu conexión y actualiza la aplicación a la versión más reciente disponible.</div>
    <h2>No puedo iniciar sesión</h2>
    <p>Confirma que el correo esté escrito correctamente. Si olvidaste la contraseña, pulsa “Olvidé mi contraseña” en la pantalla de acceso y abre el enlace que recibirás por correo.</p>
    <h2>No encuentro un técnico</h2>
    <p>Limpia los filtros o busca por una especialidad más general. La disponibilidad depende de los perfiles publicados para cada zona.</p>
    <h2>Problemas con una reserva</h2>
    <p>Abre Reservas → selecciona la reserva para revisar el estado, la dirección y el contacto. Las solicitudes pendientes o confirmadas pueden cancelarse desde el detalle.</p>
    <h2>Permiso de ubicación</h2>
    <p>El GPS es opcional. Si no deseas utilizarlo o el permiso fue rechazado, escribe la ciudad y la dirección manualmente.</p>
    <h2>Eliminar una cuenta</h2>
    <p>Consulta las <a href="/account-deletion">instrucciones de eliminación</a>. La opción está disponible dentro de Cuenta → Zona de cuidado.</p>
    <h2>Contactar soporte</h2>
    ${contactParagraph()}`
  ));
});

router.get('/account-deletion', (_req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'");
  res.type('html').send(page(
    'Eliminación de cuenta',
    'Cómo eliminar una cuenta y sus datos de Técnicos en RD.',
    `<h1>Eliminar tu cuenta</h1>
    <p class="date">Técnicos en RD</p>
    <div class="danger"><strong>Esta acción es permanente.</strong> Al confirmar, se elimina el perfil y los datos asociados según lo permita la ley.</div>
    <h2>Desde la aplicación</h2>
    <ol>
      <li>Inicia sesión.</li>
      <li>Abre la pestaña <strong>Cuenta</strong>.</li>
      <li>Desplázate hasta <strong>Zona de cuidado</strong>.</li>
      <li>Pulsa <strong>Eliminar cuenta</strong> y confirma la acción.</li>
    </ol>
    <h2>Datos eliminados</h2>
    <p>Se eliminan los datos del perfil, las reservas y las reseñas vinculadas a la cuenta, salvo información que debamos conservar temporalmente por obligaciones legales, prevención de fraude o resolución de disputas.</p>
    <h2>Eliminar desde este sitio</h2>
    <p>Si ya no tienes la aplicación, inicia sesión aquí para eliminar inmediatamente tu cuenta y los datos asociados. La contraseña se envía únicamente a nuestra API mediante una conexión cifrada y no se guarda en esta página.</p>
    <form id="delete-form">
      <label for="delete-email">Correo de la cuenta</label>
      <input id="delete-email" type="email" autocomplete="email" required>
      <label for="delete-password">Contraseña</label>
      <input id="delete-password" type="password" autocomplete="current-password" required>
      <label for="delete-confirmation">Escribe ELIMINAR para confirmar</label>
      <input id="delete-confirmation" type="text" autocomplete="off" required>
      <div class="form-row"><button class="button" id="delete-submit" type="submit">Eliminar mi cuenta</button></div>
      <div class="message" id="delete-message" role="status" aria-live="polite"></div>
    </form>
    <h2>Si no puedes entrar</h2>
    <p>Restablece tu contraseña desde la opción “Olvidé mi contraseña” de la aplicación y vuelve a esta página. También puedes utilizar el canal siguiente para solicitar ayuda.</p>
    ${contactParagraph()}
    <script>
      const deletionForm = document.getElementById('delete-form');
      const deletionMessage = document.getElementById('delete-message');
      const deletionSubmit = document.getElementById('delete-submit');
      const showDeletionMessage = (text, kind) => {
        deletionMessage.textContent = text;
        deletionMessage.className = 'message ' + kind + ' show';
      };
      deletionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        deletionMessage.className = 'message';
        const email = document.getElementById('delete-email').value.trim();
        const password = document.getElementById('delete-password').value;
        const confirmation = document.getElementById('delete-confirmation').value.trim();
        if (confirmation !== 'ELIMINAR') {
          showDeletionMessage('Escribe ELIMINAR exactamente para confirmar.', 'error');
          return;
        }
        deletionSubmit.disabled = true;
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const session = await loginResponse.json();
          if (!loginResponse.ok || !session.token || !session.id) {
            throw new Error(loginResponse.status === 401
              ? 'El correo o la contraseña son incorrectos.'
              : 'No pudimos verificar la cuenta.');
          }
          const deleteResponse = await fetch('/api/users/' + encodeURIComponent(session.id), {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + session.token },
          });
          const result = await deleteResponse.json();
          if (!deleteResponse.ok) {
            throw new Error(result.message || 'No pudimos eliminar la cuenta.');
          }
          deletionForm.reset();
          Array.from(deletionForm.elements).forEach((element) => { element.disabled = true; });
          showDeletionMessage('Tu cuenta y los datos asociados fueron eliminados.', 'ok');
        } catch (error) {
          showDeletionMessage(error instanceof Error ? error.message : 'No pudimos eliminar la cuenta.', 'error');
          deletionSubmit.disabled = false;
        }
      });
    </script>`
  ));
});

router.get('/reset-password', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const safeToken = escapeHtml(token);
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'");
  res.type('html').send(page(
    'Restablecer contraseña',
    'Crea una nueva contraseña para tu cuenta de Técnicos en RD.',
    `<h1>Restablecer contraseña</h1>
    <p class="date">El enlace es válido durante una hora.</p>
    <form id="reset-form">
      <input id="token" type="hidden" value="${safeToken}">
      <label for="password">Nueva contraseña</label>
      <input id="password" type="password" minlength="8" autocomplete="new-password" required>
      <label for="confirm-password">Confirmar contraseña</label>
      <input id="confirm-password" type="password" minlength="8" autocomplete="new-password" required>
      <div class="form-row"><button class="button" id="submit" type="submit">Actualizar contraseña</button></div>
      <div class="message" id="message" role="status" aria-live="polite"></div>
    </form>
    <script>
      const form = document.getElementById('reset-form');
      const message = document.getElementById('message');
      const submit = document.getElementById('submit');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        message.className = 'message';
        const token = document.getElementById('token').value;
        const password = document.getElementById('password').value;
        const confirmation = document.getElementById('confirm-password').value;
        if (!token) { message.textContent = 'El enlace no contiene un token válido.'; message.className = 'message error show'; return; }
        if (password.length < 8) { message.textContent = 'La contraseña debe tener al menos 8 caracteres.'; message.className = 'message error show'; return; }
        if (password !== confirmation) { message.textContent = 'Las contraseñas no coinciden.'; message.className = 'message error show'; return; }
        submit.disabled = true;
        try {
          const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'No pudimos actualizar la contraseña.');
          form.reset();
          message.textContent = data.message || 'Contraseña actualizada. Ya puedes iniciar sesión en la aplicación.';
          message.className = 'message ok show';
        } catch (error) {
          message.textContent = error instanceof Error ? error.message : 'No pudimos actualizar la contraseña.';
          message.className = 'message error show';
        } finally { submit.disabled = false; }
      });
    </script>`
  ));
});

export default router;
