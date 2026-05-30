#!/usr/bin/env bash
# Construye y sube imágenes a Docker Hub (públicas → Coolify hace pull sin login).
#
# Uso:
#   docker login
#   bash scripts/docker-push.sh
#
# Opcional: DOCKERHUB_USER=otro_usuario bash scripts/docker-push.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER="${DOCKERHUB_USER:-lucasdealmeida123}"
TAG="${TAG:-latest}"

BACKEND="${USER}/referentes-backend:${TAG}"
FRONTEND="${USER}/referentes-frontend:${TAG}"

echo "→ Build backend  → ${BACKEND}"
docker build -f "${ROOT}/backend/Dockerfile.prod" -t "${BACKEND}" "${ROOT}"

echo "→ Build frontend → ${FRONTEND}"
docker build -f "${ROOT}/frontend/Dockerfile.prod" \
  --build-arg VITE_API_URL= \
  -t "${FRONTEND}" \
  "${ROOT}"

echo "→ Push..."
docker push "${BACKEND}"
docker push "${FRONTEND}"

echo ""
echo "✓ Listo. Imágenes públicas en Docker Hub:"
echo "  docker pull ${BACKEND}"
echo "  docker pull ${FRONTEND}"
echo ""
echo "Ahora redeploy en Coolify."
