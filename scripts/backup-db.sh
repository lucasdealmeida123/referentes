#!/usr/bin/env bash
# Exporta la base PostgreSQL local (Docker Compose dev).
set -euo pipefail

CONTAINER="${DB_CONTAINER:-elecciones_db}"
DB_USER="${POSTGRES_USER:-elecciones}"
DB_NAME="${POSTGRES_DB:-elecciones}"
OUT="${1:-elecciones-$(date +%Y%m%d-%H%M).dump}"

echo "→ Exportando ${DB_NAME} desde ${CONTAINER} → ${OUT}"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "/tmp/backup.dump"
docker cp "${CONTAINER}:/tmp/backup.dump" "$OUT"
docker exec "$CONTAINER" rm -f /tmp/backup.dump
echo "✓ Listo: ${OUT}"
