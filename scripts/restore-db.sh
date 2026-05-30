#!/usr/bin/env bash
# Restaura un dump en PostgreSQL (local o remoto vía variables de entorno).
# Uso local:  bash scripts/restore-db.sh elecciones.dump
# Uso remoto: DB_HOST=... DB_PORT=5432 POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_DB=... bash scripts/restore-db.sh dump
set -euo pipefail

DUMP="${1:?Indicá el archivo .dump o .sql}"

DB_HOST="${DB_HOST:-}"
DB_USER="${POSTGRES_USER:-elecciones}"
DB_NAME="${POSTGRES_DB:-elecciones}"
DB_PASSWORD="${POSTGRES_PASSWORD:-elecciones}"
CONTAINER="${DB_CONTAINER:-elecciones_db}"

restore_local() {
  echo "→ Restaurando en contenedor ${CONTAINER}..."
  docker cp "$DUMP" "${CONTAINER}:/tmp/restore.dump"
  docker exec "$CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists /tmp/restore.dump || true
  docker exec "$CONTAINER" rm -f /tmp/restore.dump
}

restore_remote() {
  echo "→ Restaurando en ${DB_HOST}..."
  export PGPASSWORD="$DB_PASSWORD"
  pg_restore -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists "$DUMP" || true
  unset PGPASSWORD
}

if [[ -n "$DB_HOST" ]]; then
  restore_remote
else
  restore_local
fi

echo "✓ Restauración completada"
