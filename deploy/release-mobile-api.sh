#!/usr/bin/env bash

set -Eeuo pipefail

REVISION=${1:?Usage: deploy/release-mobile-api.sh <git-revision>}
DEPLOY_WEB=${DEPLOY_WEB:-0}
APP_ROOT=${APP_ROOT:-/home/bitnami/apps}
SOURCE=${SOURCE:-$APP_ROOT/release-source}
RELEASES=$APP_ROOT/releases
SHARED=$APP_ROOT/shared
ENV_FILE=$SHARED/server.env
BACKUP_ROOT=$APP_ROOT/backups

if [[ "$DEPLOY_WEB" != 0 && "$DEPLOY_WEB" != 1 ]]; then
  printf 'DEPLOY_WEB must be 0 or 1.\n' >&2
  exit 2
fi

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
  nvm use 20 >/dev/null
fi

test -d "$SOURCE/.git"
test -f "$ENV_FILE"
git -C "$SOURCE" cat-file -e "${REVISION}^{commit}"
REVISION=$(git -C "$SOURCE" rev-parse "${REVISION}^{commit}")

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE=$RELEASES/${STAMP}-${REVISION:0:7}
BACKUP=$BACKUP_ROOT/${STAMP}-mobile-api
PREVIOUS=''
CUTOVER_COMPLETE=0
MIGRATION_COMPLETE=0
API_STOPPED=0

rollback_code() {
  local status=$?
  trap - ERR
  set +e
  if [[ $MIGRATION_COMPLETE -eq 1 ]]; then
    # The previous API does not understand moderation states and could expose a
    # newly pending or suspended profile. After the forward-only migration,
    # keep recovery on the new release instead of blindly rolling code back.
    ln -sfn "$RELEASE" "$APP_ROOT/technician-current.next"
    mv -Tf "$APP_ROOT/technician-current.next" "$APP_ROOT/technician-current"
    cd "$APP_ROOT/technician-current"
    pm2 startOrReload deploy/ecosystem.config.cjs --env production --update-env
    pm2 save
    printf 'Release failed after the database migration; forward recovery was attempted and old code was not restored.\n' >&2
  elif [[ $API_STOPPED -eq 1 ]]; then
    cd "$APP_ROOT/technician-current"
    pm2 startOrReload deploy/ecosystem.config.cjs --env production --update-env
    pm2 save
    printf 'Release failed before migration; the previous API was restarted.\n' >&2
  else
    printf 'Release failed before migration; production code was not changed.\n' >&2
  fi
  exit "$status"
}
trap rollback_code ERR

mkdir "$RELEASE" "$BACKUP"
chmod 711 "$RELEASES" "$RELEASE"
chmod 700 "$BACKUP"
git -C "$SOURCE" archive "$REVISION" | tar -x -C "$RELEASE"
printf '%s\n' "$REVISION" > "$RELEASE/REVISION"
install -m 600 "$ENV_FILE" "$BACKUP/server.env"

if [[ -L "$APP_ROOT/technician-current" ]]; then
  PREVIOUS=$(readlink -f "$APP_ROOT/technician-current")
  printf '%s\n' "$PREVIOUS" > "$BACKUP/previous-release"
fi

# By default this remains a backend-only release and preserves the validated
# React artifact. DEPLOY_WEB=1 builds the matching frontend inside the same
# immutable release so API and browser contracts switch atomically.
if [[ "$DEPLOY_WEB" == 0 && -f "$APP_ROOT/technician-current/build/index.html" ]]; then
  cp -a "$APP_ROOT/technician-current/build" "$RELEASE/build"
  test -f "$RELEASE/build/index.html"
fi

ln -s "$ENV_FILE" "$RELEASE/server/.env"
node "$RELEASE/deploy/prepare-production-env.cjs" "$ENV_FILE"

if [[ "$DEPLOY_WEB" == 1 ]]; then
  cd "$RELEASE"
  npm ci
  npm run typecheck
  CI=true npm run test:ci
  npm run build
  test -f "$RELEASE/build/index.html"
fi

cd "$RELEASE/server"
npm ci
npx prisma generate
npm test
test -f dist/index.js

PG_DUMP_BIN=/usr/lib/postgresql/13/bin/pg_dump \
  node --env-file="$ENV_FILE" "$RELEASE/deploy/backup-database.cjs" \
  "$BACKUP/database.dump"
chmod 600 "$BACKUP/database.dump"
/usr/lib/postgresql/13/bin/pg_restore --list "$BACKUP/database.dump" >/dev/null

# A fresh, validated rollback dump now exists. Prune only expired database
# dumps from standard release backup directories; configuration and recovery
# metadata stored beside them remain untouched.
/usr/bin/flock -x "$SHARED/database-backup-retention.lock" \
  "$RELEASE/deploy/prune-database-backups.sh" "$APP_ROOT"

npm prune --omit=dev

sudo nginx -t

cd "$RELEASE/server"
node --env-file="$ENV_FILE" <<'NODE'
const nodemailer = require('nodemailer');

const port = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify()
  .then(() => {
    console.log('SMTP verification passed.');
  })
  .catch((error) => {
    console.error(`SMTP verification failed: ${error.message}`);
    process.exit(1);
  });
NODE

# Prevent the legacy API from accepting writes after the new moderation
# defaults exist but before the matching code is active. The expected downtime
# is only the migration and atomic symlink cutover.
pm2 stop technician-api
API_STOPPED=1
npx prisma migrate deploy
MIGRATION_COMPLETE=1

ln -sfn "$RELEASE" "$APP_ROOT/technician-current.next"
mv -Tf "$APP_ROOT/technician-current.next" "$APP_ROOT/technician-current"
CUTOVER_COMPLETE=1

cd "$APP_ROOT/technician-current"
pm2 startOrReload deploy/ecosystem.config.cjs --env production --update-env
pm2 save
API_STOPPED=0

curl --retry 10 --retry-connrefused --retry-delay 1 \
  --fail --silent --show-error http://127.0.0.1:3001/health >/dev/null
for endpoint in support privacy terms account-deletion reset-password; do
  curl --fail --silent --show-error "http://127.0.0.1:3001/$endpoint" >/dev/null
done
if [[ "$DEPLOY_WEB" == 1 ]]; then
  curl --fail --silent --show-error -H 'Host: tecnicosenrd.com' http://127.0.0.1/ >/dev/null
fi

sudo nginx -t
printf 'Released %s to %s; backup: %s\n' "$REVISION" "$RELEASE" "$BACKUP"
