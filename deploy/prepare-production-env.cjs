const crypto = require('node:crypto');
const fs = require('node:fs');

const envFile = process.argv[2];
if (!envFile) {
  console.error('Usage: node deploy/prepare-production-env.cjs <server.env>');
  process.exit(2);
}

process.loadEnvFile(envFile);

for (const key of ['DATABASE_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
  if (!process.env[key]?.trim()) {
    console.error(`Required production setting is missing: ${key}`);
    process.exit(1);
  }
}

const existingSecret = process.env.AUTH_SECRET?.trim();
const authSecret = existingSecret && existingSecret.length >= 32
  ? existingSecret
  : crypto.randomBytes(32).toString('hex');

const requiredValues = new Map([
  ['NODE_ENV', 'production'],
  ['PORT', '3001'],
  ['AUTH_SECRET', authSecret],
  ['APP_URL', 'https://api.tecnicosenrd.com'],
  ['API_URL', 'https://api.tecnicosenrd.com'],
  ['CORS_ORIGIN', 'https://api.tecnicosenrd.com'],
]);

const originalLines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
const seen = new Set();
const updatedLines = [];

for (const line of originalLines) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
  const key = match?.[1];
  if (!key || !requiredValues.has(key)) {
    updatedLines.push(line);
    continue;
  }
  if (!seen.has(key)) {
    updatedLines.push(`${key}=${requiredValues.get(key)}`);
    seen.add(key);
  }
}

for (const [key, value] of requiredValues) {
  if (!seen.has(key)) updatedLines.push(`${key}=${value}`);
}

fs.writeFileSync(envFile, `${updatedLines.filter((line, index, lines) => line || index < lines.length - 1).join('\n')}\n`, {
  mode: 0o600,
});
fs.chmodSync(envFile, 0o600);

console.log(`Production environment prepared; AUTH_SECRET ${existingSecret?.length >= 32 ? 'preserved' : 'generated'}.`);
