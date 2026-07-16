#!/usr/bin/env bash

set -Eeuo pipefail

APP_ROOT=${1:?Usage: deploy/prune-database-backups.sh <app-root>}
RETENTION_MINUTES=$((30 * 24 * 60))
FIND_OLDER_THAN_MINUTES=$((RETENTION_MINUTES - 1))

fail() {
  printf 'Database backup pruning refused: %s\n' "$1" >&2
  exit 1
}

[[ "$APP_ROOT" == /* ]] || fail 'the application root must be an absolute path'
[[ "$APP_ROOT" != / ]] || fail 'the filesystem root cannot be the application root'
[[ -d "$APP_ROOT" ]] || fail 'the application root does not exist'
[[ ! -L "$APP_ROOT" ]] || fail 'the application root cannot be a symbolic link'

APP_ROOT_REAL=$(realpath -- "$APP_ROOT")
[[ "$APP_ROOT_REAL" != / ]] || fail 'the resolved application root is unsafe'

BACKUP_ROOT=$APP_ROOT/backups
[[ -d "$BACKUP_ROOT" ]] || fail 'the application backup root does not exist'
[[ ! -L "$BACKUP_ROOT" ]] || fail 'the application backup root cannot be a symbolic link'

BACKUP_ROOT_REAL=$(realpath -- "$BACKUP_ROOT")
[[ "$BACKUP_ROOT_REAL" == "$APP_ROOT_REAL/backups" ]] || \
  fail 'the backup root resolves outside the application root'

candidate_list=$(mktemp "${TMPDIR:-/tmp}/technician-database-backups.XXXXXX")
trap 'rm -f -- "$candidate_list"' EXIT

if ! find -P "$BACKUP_ROOT_REAL" \
  -mindepth 2 -maxdepth 2 \
  -type f -name database.dump \
  -mmin "+$FIND_OLDER_THAN_MINUTES" \
  -print0 > "$candidate_list"; then
  fail 'could not enumerate database backup artifacts'
fi

pruned=0
while IFS= read -r -d '' candidate; do
  relative=${candidate#"$BACKUP_ROOT_REAL"/}
  backup_directory=${relative%/database.dump}

  # Automated releases use either <UTC timestamp> or
  # <UTC timestamp>-mobile-api. Anything else may be a manual or special
  # recovery backup and must be preserved for explicit review.
  [[ "$backup_directory" =~ ^[0-9]{8}T[0-9]{6}Z(-mobile-api)?$ ]] || continue
  [[ "$relative" == "$backup_directory/database.dump" ]] || continue
  [[ ! -L "$BACKUP_ROOT_REAL/$backup_directory" ]] || continue
  [[ -f "$candidate" && ! -L "$candidate" ]] || continue
  candidate_real=$(realpath -- "$candidate")
  [[ "$candidate_real" == "$candidate" ]] || continue

  rm -- "$candidate"
  printf 'Pruned expired database backup: %s\n' "$candidate"
  pruned=$((pruned + 1))
done < "$candidate_list"

printf 'Database backup retention complete; pruned %d artifact(s).\n' "$pruned"
