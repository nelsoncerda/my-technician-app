const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPPORT_EMAIL = 'soporte@example.com';
const app = require('../dist/app').default;

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('privacy, terms, and account-deletion pages are public Spanish HTML', async () => {
  for (const [path, expected] of [
    ['/', 'Resuelve lo de tu hogar'],
    ['/privacy', 'Política de privacidad'],
    ['/terms', 'Términos de uso'],
    ['/support', 'Contactar soporte'],
    ['/account-deletion', 'Eliminar tu cuenta'],
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    const body = await response.text();
    assert.match(body, new RegExp(expected));
    if (path !== '/') assert.match(body, /soporte@example\.com/);
  }
});

test('account-deletion page provides a same-origin self-service deletion flow', async () => {
  const response = await fetch(`${baseUrl}/account-deletion`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy') || '', /connect-src 'self'/);
  assert.match(body, /id="delete-form"/);
  assert.match(body, /fetch\('\/api\/auth\/login'/);
  assert.match(body, /fetch\('\/api\/users\/'/);
  assert.match(body, /Escribe ELIMINAR/);
});

test('privacy policy discloses the 30-day residual database-backup window', async () => {
  const response = await fetch(`${baseUrl}/privacy`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /16 de julio de 2026/);
  assert.match(body, /respaldos[^<]+base de datos[^<]+se eliminan dentro de 30 días/);
});

test('password reset page escapes an untrusted token', async () => {
  const response = await fetch(`${baseUrl}/reset-password?token=${encodeURIComponent('"<script>bad()</script>')}`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.doesNotMatch(body, /value="<script>/);
  assert.match(body, /&quot;&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.match(body, /\/api\/auth\/reset-password/);
});
