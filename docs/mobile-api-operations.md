# Mobile API operations

Last verified: 2026-07-15.

## Current topology

- `tecnicosenrd.com` and `www.tecnicosenrd.com` serve the Técnicos en RD React build from `/home/bitnami/apps/technician-current/build`.
- Same-origin `/api/` requests and `api.tecnicosenrd.com` proxy to the Técnicos en RD API on `127.0.0.1:3001`.
- PM2 process: `technician-api`.
- Application symlink: `/home/bitnami/apps/technician-current`.
- Shared environment: `/home/bitnami/apps/shared/server.env`.
- PostgreSQL cluster: 13/main on port 5433.
- The stopped `driveform` and `driveform-accounts` PM2 entries and their files are preserved until DriveForm receives its replacement domain.

The versioned `deploy/nginx/tecnicosenrd.com.conf` is the active virtual-host source of truth. Back up the installed file before changing domain ownership.

## Health checks

```bash
curl -fsS https://api.tecnicosenrd.com/health
curl -fsS https://api.tecnicosenrd.com/api/settings
ssh bitnami 'pm2 status technician-api; pg_lsclusters; sudo nginx -t'
```

Expected health response:

```json
{"status":"ok"}
```

## Reboot recovery

The July 14 reboot exposed two latent PostgreSQL problems: TCP `host` records in `pg_hba.conf` incorrectly used peer authentication, and the active cluster did not contain `technician_app`. The configuration was backed up, host authentication was corrected, and the latest validated database dump was restored. The shared `DATABASE_URL` now targets PostgreSQL port 5433.

After a reboot, verify in this order:

```bash
ssh bitnami
pg_lsclusters
pm2 status technician-api
curl -fsS http://127.0.0.1:3001/health
curl -fsS https://api.tecnicosenrd.com/health
```

If PostgreSQL is down, inspect its unit and log before changing state:

```bash
sudo systemctl status postgresql@13-main
sudo tail -100 /var/log/postgresql/postgresql-13-main.log
```

Never restore a dump over a populated production database without an approved maintenance window and a fresh backup.

## Backend-only release

Backend-only releases must preserve the active main-domain Nginx configuration:

1. Build and test the server locally.
2. Transfer or fetch the committed revision into `/home/bitnami/apps/release-source`.
3. Run `deploy/release-mobile-api.sh <revision>` as `bitnami`.
4. Verify the external API and public pages after the command completes.

The release script creates an immutable release, preserves the shared environment
and the currently deployed React build, backs up PostgreSQL, applies migrations,
switches `technician-current` atomically, restarts PM2, and verifies SMTP and all
mobile publication pages. It deliberately does **not** install or reload Nginx.

### Database-backup retention

After creating and validating the current release's PostgreSQL dump, the release
workflow removes `database.dump` files older than 30 days from standard automated
backup directories directly below `/home/bitnami/apps/backups`. The cleanup has
strict path and filename guards. It does not remove backup directories, `server.env`,
Nginx copies, release pointers, or manual/special recovery artifacts.

Use `deploy/prune-database-backups.sh /home/bitnami/apps` for a guarded retention
run outside a release. Do not replace it with a broad `find ... -delete` command.
The helper intentionally refuses symbolic-link backup roots and paths outside the
application-owned backup tree.

Production also runs the helper daily through the systemd units in
`deploy/systemd/` so the 30-day maximum does not depend on release frequency.
The timer is persistent, runs the service as `bitnami`, and catches up after
downtime. Both the timer and the release workflow use the same lock:

```text
/home/bitnami/apps/shared/database-backup-retention.lock
```

Install or update the units after deploying the release, then validate and enable
the timer:

```bash
sudo install -m 0644 deploy/systemd/technician-backup-retention.service /etc/systemd/system/
sudo install -m 0644 deploy/systemd/technician-backup-retention.timer /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/technician-backup-retention.{service,timer}
sudo systemctl daemon-reload
sudo systemctl start technician-backup-retention.service
sudo systemctl enable --now technician-backup-retention.timer
systemctl list-timers technician-backup-retention.timer --no-pager
```

Keep the release-side `flock -x` call and the service-side `flock -w 300` call in
place. The shared lock prevents a daily cleanup and a deployment from racing on
the same dump.

The public mobile pages expected after deployment are:

- `/support`
- `/privacy`
- `/terms`
- `/account-deletion`
- `/reset-password?token=...`

## Required operations follow-up

- Keep the confirmed monitored `SUPPORT_EMAIL` (`ncerda@hotmail.com`) in `server.env` for store review.
- Assign DriveForm its replacement public domain before restarting its preserved PM2 processes.
- Verify recent database restore archives regularly; automated database dumps are
  retained for no more than 30 days.
- Confirm PM2 startup persists `technician-api` as online after instance reboot.
