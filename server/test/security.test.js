const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} = require('../dist/security/password');
const { createAuthToken, verifyAuthToken } = require('../dist/security/token');

test('scrypt password records verify without exposing plaintext', async () => {
  const hash = await hashPassword('correct horse battery staple');

  assert.equal(isHashedPassword(hash), true);
  assert.equal(hash.includes('correct horse battery staple'), false);
  assert.deepEqual(await verifyPassword('correct horse battery staple', hash), {
    valid: true,
    needsRehash: false,
  });
  assert.deepEqual(await verifyPassword('wrong password', hash), {
    valid: false,
    needsRehash: false,
  });
});

test('legacy plaintext passwords are marked for upgrade only after a valid login', async () => {
  assert.deepEqual(await verifyPassword('legacy-password', 'legacy-password'), {
    valid: true,
    needsRehash: true,
  });
  assert.deepEqual(await verifyPassword('not-the-password', 'legacy-password'), {
    valid: false,
    needsRehash: false,
  });
});

test('bearer tokens reject payload and signature tampering', () => {
  const token = createAuthToken('user-123', 'technician');
  const payload = verifyAuthToken(token);

  assert.equal(payload?.sub, 'user-123');
  assert.equal(payload?.role, 'technician');
  assert.ok(payload.exp > payload.iat);

  const [encodedPayload, signature] = token.split('.');
  const tamperedPayload = `${encodedPayload.slice(0, -1)}${encodedPayload.endsWith('A') ? 'B' : 'A'}`;
  const tamperedSignature = `${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`;
  assert.equal(verifyAuthToken(`${tamperedPayload}.${signature}`), null);
  assert.equal(verifyAuthToken(`${encodedPayload}.${tamperedSignature}`), null);
});

test('production refuses to start token signing without a strong AUTH_SECRET', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "require('./dist/security/token')"],
    {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', AUTH_SECRET: '' },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUTH_SECRET/);
});
