#!/usr/bin/env bash

set -Eeuo pipefail

REVISION=${1:?Usage: deploy/release-mobile-api.sh <git-revision>}
APP_ROOT=${APP_ROOT:-/home/bitnami/apps}
SOURCE=${SOURCE:-$APP_ROOT/release-source}
RELEASES=$APP_ROOT/releases
SHARED=$APP_ROOT/shared
ENV_FILE=$SHARED/server.env

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
BACKUP=$APP_ROOT/backups/${STAMP}-mobile-api
PREVIOUS=''
CUTOVER_COMPLETE=0

rollback_code() {
  local status=$?
  trap - ERR
  if [[ $CUTOVER_COMPLETE -eq 1 && -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$APP_ROOT/technician-current.next"
    mv -Tf "$APP_ROOT/technician-current.next" "$APP_ROOT/technician-current"
    cd "$APP_ROOT/technician-current"
    pm2 startOrReload deploy/ecosystem.config.cjs --env production --update-env
    pm2 save
  fi
  printf 'Release failed; code cutover rolled back when possible. Database migrations were not reversed.\n' >&2
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

ln -s "$ENV_FILE" "$RELEASE/server/.env"
node "$RELEASE/deploy/prepare-production-env.cjs" "$ENV_FILE"

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

npx prisma migrate deploy
npm prune --omit=dev

sudo nginx -t
ln -sfn "$RELEASE" "$APP_ROOT/technician-current.next"
mv -Tf "$APP_ROOT/technician-current.next" "$APP_ROOT/technician-current"
CUTOVER_COMPLETE=1

cd "$APP_ROOT/technician-current"
pm2 startOrReload deploy/ecosystem.config.cjs --env production --update-env
pm2 save

curl --retry 10 --retry-connrefused --retry-delay 1 \
  --fail --silent --show-error http://127.0.0.1:3001/health >/dev/null
for endpoint in support privacy terms account-deletion reset-password; do
  curl --fail --silent --show-error "http://127.0.0.1:3001/$endpoint" >/dev/null
done

cd "$APP_ROOT/technician-current/server"
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

sudo nginx -t
printf 'Released %s to %s; backup: %s\n' "$REVISION" "$RELEASE" "$BACKUP"
