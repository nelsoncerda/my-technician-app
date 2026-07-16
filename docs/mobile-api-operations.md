# Mobile API operations

Last verified: 2026-07-15.

## Current topology

- `tecnicosenrd.com` and `www.tecnicosenrd.com` currently serve DriveForm on port 3002.
- `api.tecnicosenrd.com` proxies to the Técnicos en RD API on `127.0.0.1:3001`.
- PM2 process: `technician-api`.
- Application symlink: `/home/bitnami/apps/technician-current`.
- Shared environment: `/home/bitnami/apps/shared/server.env`.
- PostgreSQL cluster: 13/main on port 5433.

Do not install `deploy/nginx/tecnicosenrd.com.conf` on the shared instance while DriveForm owns the main virtual host. That historical configuration would replace the other application. Preserve the combined active Nginx file and update only the `api.tecnicosenrd.com` server block until domain ownership is decided.

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

Until the main-domain conflict is resolved, a mobile API release must preserve the active combined Nginx configuration:

1. Build and test the server locally.
2. Create a new immutable release directory from a committed revision.
3. Link `server/.env` to the shared environment.
4. Install dependencies, generate Prisma Client, build, back up the database, and apply migrations.
5. Switch `technician-current` atomically.
6. Restart `technician-api` with the repository ecosystem file and run all health checks.
7. Do **not** install the repository’s historical main-domain Nginx file.

The public mobile pages expected after deployment are:

- `/support`
- `/privacy`
- `/terms`
- `/account-deletion`
- `/reset-password?token=...`

## Required operations follow-up

- Confirm and set a monitored `SUPPORT_EMAIL` in `server.env` before store review.
- Decide whether Técnicos en RD should recover `tecnicosenrd.com` or use a new public website domain.
- Keep automated database backups and verify restore archives regularly.
- Confirm PM2 startup persists `technician-api` as online after instance reboot.
