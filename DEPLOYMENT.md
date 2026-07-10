# Production deployment: AWS Lightsail

This runbook deploys **Técnicos en RD** to the existing Lightsail instance at
`tecnicosenrd.com`. Deployments use immutable release directories and an atomic
symlink cutover:

```text
/home/bitnami/apps/
├── my-technician-app/        # legacy live checkout; preserve for first rollback
├── release-source/           # clean Git checkout used to build releases
├── releases/                 # versioned releases
├── shared/server.env         # production environment; never committed
├── backups/                  # database and configuration backups
└── technician-current -> releases/<timestamp>-<commit>
```

Nginx serves `technician-current/build`, proxies same-origin `/api/` requests
to the API on port `3001`, and exposes `/health`. PM2 runs the API as
`technician-api` from the same stable symlink.

## Prerequisites

- The Lightsail static IP is assigned and DNS for `tecnicosenrd.com`,
  `www.tecnicosenrd.com`, and the legacy `api.tecnicosenrd.com` points to it.
- Ports 80 and 443 are open in the Lightsail firewall.
- PostgreSQL, Nginx, Git, NVM, and PM2 are installed.
- `sudo certbot certificates` confirms the existing certificate covers the
  configured hostnames. Do not request a replacement certificate during a
  normal deployment.
- The release commit is pushed to `origin/master` and `npm run check` passes
  locally.

## One-time server setup

SSH in as `bitnami`, select Node 20 through NVM, and create the shared paths:

```bash
ssh bitnami@tecnicosenrd.com
source "$HOME/.nvm/nvm.sh"
nvm install 20
nvm alias default 20
nvm use 20
npm install --global pm2

APP_ROOT=/home/bitnami/apps
LEGACY="$APP_ROOT/my-technician-app"
SOURCE="$APP_ROOT/release-source"
mkdir -p "$APP_ROOT/releases" "$APP_ROOT/shared" "$APP_ROOT/backups"

if [ ! -f "$APP_ROOT/shared/server.env" ]; then
  if [ -f "$LEGACY/server/.env" ]; then
    install -m 600 "$LEGACY/server/.env" "$APP_ROOT/shared/server.env"
  else
    install -m 600 /dev/null "$APP_ROOT/shared/server.env"
  fi
fi

if [ ! -d "$SOURCE/.git" ]; then
  git clone https://github.com/nelsoncerda/my-technician-app.git "$SOURCE"
fi
```

Edit `/home/bitnami/apps/shared/server.env` and verify these keys. Keep actual
credentials out of Git, terminal history, screenshots, and deployment logs.

```dotenv
DATABASE_URL=
AUTH_SECRET=
NODE_ENV=production
APP_URL=https://tecnicosenrd.com
API_URL=https://tecnicosenrd.com
CORS_ORIGIN=https://tecnicosenrd.com,https://www.tecnicosenrd.com
PORT=3001
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

`AUTH_SECRET` must be a securely generated value of at least 32 characters.
Run `chmod 600 /home/bitnami/apps/shared/server.env` after editing it. Configure
PM2 startup once with `pm2 startup`, follow the command it prints, and run
`pm2 save` after the first successful release.

## Version-controlled production configuration

The repository is the source of truth for both service definitions:

- `deploy/nginx/tecnicosenrd.com.conf` serves the frontend, keeps the legacy API
  hostname working, proxies `/api/` without stripping the prefix, forwards the
  standard proxy headers, limits request bodies to 10 MB, and uses the existing
  Certbot certificate.
- `deploy/ecosystem.config.cjs` runs `server/dist/index.js` as
  `technician-api`, with its working directory under `technician-current`.

If Certbot reports a suffixed certificate directory, update the versioned Nginx
file to those exact paths and review the change before deployment. Do not
maintain a divergent hand-edited production copy.

## Deploy a release

Run this as `bitnami`. It verifies the tracked source is clean, builds the root
frontend and server before cutover, and backs up PostgreSQL and Nginx before
applying migrations.

```bash
set -euo pipefail
source "$HOME/.nvm/nvm.sh"
nvm use 20

APP_ROOT=/home/bitnami/apps
LEGACY="$APP_ROOT/my-technician-app"
SOURCE="$APP_ROOT/release-source"
RELEASES="$APP_ROOT/releases"
SHARED="$APP_ROOT/shared"

cd "$SOURCE"
git diff --quiet
git diff --cached --quiet
PREVIOUS_SOURCE_REVISION=$(git rev-parse HEAD)
git fetch origin
git checkout master
git pull --ff-only origin master

REVISION=$(git rev-parse HEAD)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE="$RELEASES/${STAMP}-${REVISION:0:7}"
BACKUP="$APP_ROOT/backups/$STAMP"
mkdir "$RELEASE" "$BACKUP"

git archive "$REVISION" | tar -x -C "$RELEASE"
printf '%s\n' "$REVISION" > "$RELEASE/REVISION"
printf '%s\n' "$PREVIOUS_SOURCE_REVISION" > "$BACKUP/previous-source-revision"
ln -s "$SHARED/server.env" "$RELEASE/server/.env"

cd "$RELEASE"
npm ci
npm run build

cd "$RELEASE/server"
npm ci
npx prisma generate
npm run build
test -f "$RELEASE/build/index.html"
test -f "$RELEASE/server/dist/index.js"

sudo cp /etc/nginx/sites-available/tecnicosenrd.com \
  "$BACKUP/nginx-tecnicosenrd.com"
if [ -L "$APP_ROOT/technician-current" ]; then
  readlink -f "$APP_ROOT/technician-current" > "$BACKUP/previous-release"
elif [ -d "$LEGACY/frontend" ]; then
  cp -a "$LEGACY/frontend" "$BACKUP/legacy-frontend"
fi

cd "$RELEASE"
node --env-file="$SHARED/server.env" deploy/backup-database.cjs \
  "$BACKUP/database.dump"
pg_restore --list "$BACKUP/database.dump" >/dev/null

cd "$RELEASE/server"
npx prisma migrate deploy

ln -sfn "$RELEASE" "$APP_ROOT/technician-current.next"
mv -Tf "$APP_ROOT/technician-current.next" "$APP_ROOT/technician-current"

cd "$APP_ROOT/technician-current"
pm2 startOrReload deploy/ecosystem.config.cjs --env production --update-env
pm2 save
curl --retry 10 --retry-connrefused --retry-delay 1 \
  --fail --silent --show-error http://127.0.0.1:3001/health

sudo install -m 644 deploy/nginx/tecnicosenrd.com.conf \
  /etc/nginx/sites-available/tecnicosenrd.com
test -e /etc/nginx/sites-enabled/tecnicosenrd.com || \
  sudo ln -s /etc/nginx/sites-available/tecnicosenrd.com \
  /etc/nginx/sites-enabled/tecnicosenrd.com
sudo nginx -t
sudo systemctl reload nginx
```

Seeding is not part of every production deployment. Run
`npm run db:seed` from `/home/bitnami/apps/technician-current/server` only when
the release explicitly requires reference-data changes and the seed is known
to be idempotent.

## Verify the deployment

All checks must pass before declaring the release complete:

```bash
cat /home/bitnami/apps/technician-current/REVISION
pm2 status technician-api
pm2 logs technician-api --lines 50 --nostream
curl -fsS http://127.0.0.1:3001/health
curl -fsS https://tecnicosenrd.com/health
curl -fsSI https://tecnicosenrd.com/
sudo nginx -t
```

The health responses should be `{"status":"ok"}`, the homepage should return
HTTP 200, PM2 should remain `online`, and the logs should contain no restart
loop or database errors. Also test sign-in and one read-only API flow in the
browser.

## Roll back application code

Choose the previous known-good directory from `/home/bitnami/apps/releases`.
Validate its build before changing the stable symlink:

```bash
set -euo pipefail
APP_ROOT=/home/bitnami/apps
ls -1dt "$APP_ROOT"/releases/*
PREVIOUS=/home/bitnami/apps/releases/<known-good-release>
test -f "$PREVIOUS/build/index.html"
test -f "$PREVIOUS/server/dist/index.js"
test -f "$PREVIOUS/deploy/nginx/tecnicosenrd.com.conf"

ln -sfn "$PREVIOUS" "$APP_ROOT/technician-current.next"
mv -Tf "$APP_ROOT/technician-current.next" "$APP_ROOT/technician-current"

cd "$APP_ROOT/technician-current"
pm2 startOrReload deploy/ecosystem.config.cjs --env production --update-env
pm2 save
sudo install -m 644 deploy/nginx/tecnicosenrd.com.conf \
  /etc/nginx/sites-available/tecnicosenrd.com
sudo nginx -t
sudo systemctl reload nginx

curl -fsS http://127.0.0.1:3001/health
curl -fsS https://tecnicosenrd.com/health
```

The first migration to versioned releases has no earlier release directory, so
its rollback assets are the `legacy-frontend`, previous source revision, Nginx
copy, and database dump saved under that deployment's backup directory. Do not
remove the legacy application until the first release has been verified.

A code rollback does **not** reverse Prisma migrations. Prefer a forward fix
when the migrated schema remains compatible. Restoring
`backups/<timestamp>/database.dump` overwrites production data and must only be
done during an approved maintenance window after application writes are
stopped. Keep at least the current release, the previous known-good release,
and their matching backups.

The first hardened release transparently upgrades legacy plaintext passwords
to scrypt hashes when users sign in. Once that happens, the legacy API cannot
authenticate those users. Roll back that release with a forward-compatible API
fix whenever possible; restoring its predeployment database dump would also
discard every production write made after the backup.
