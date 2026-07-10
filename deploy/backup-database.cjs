const { spawnSync } = require('node:child_process');

const outputFile = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (!outputFile || !databaseUrl) {
  console.error('Usage: node --env-file=<server.env> deploy/backup-database.cjs <output.dump>');
  process.exit(2);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL is not a valid PostgreSQL URL');
  process.exit(2);
}

const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
if (!parsed.hostname || !parsed.username || !database) {
  console.error('DATABASE_URL must include a host, user, and database name');
  process.exit(2);
}

const env = {
  ...process.env,
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || '5432',
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
  PGDATABASE: database,
};

const sslMode = parsed.searchParams.get('sslmode');
if (sslMode) env.PGSSLMODE = sslMode;

const result = spawnSync(process.env.PG_DUMP_BIN || 'pg_dump', [
  '--format=custom',
  '--file',
  outputFile,
], {
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Unable to run pg_dump: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
