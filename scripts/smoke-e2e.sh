#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001/api}"
ROLE_HEADER="${ROLE_HEADER:-admin}"
KMZ_PATH="${KMZ_PATH:-/Users/lucasdealmeida/Downloads/Escuelas Posadas 2025.kmz}"
REUNIONES_XLSX="${REUNIONES_XLSX:-/Users/lucasdealmeida/Downloads/LISTADO DE REUNIONES.xlsx}"
REFERENTES_XLSX="${REFERENTES_XLSX:-/Users/lucasdealmeida/Downloads/LISTADO REFERENTES.xlsx}"

echo "==> Health check"
curl -sS "${API_URL}/health" >/dev/null

echo "==> Crear campana"
CAMPAIGN_JSON="$(curl -sS -X POST "${API_URL}/campaigns" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Smoke E2E","anio":2026,"estado":"activa"}')"
CAMPAIGN_ID="$(python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' <<<"${CAMPAIGN_JSON}")"
echo "campaignId=${CAMPAIGN_ID}"

echo "==> Preview KMZ"
curl -sS -X POST "${API_URL}/imports/territory/kmz/preview" \
  -F "file=@${KMZ_PATH}" >/dev/null

echo "==> Commit KMZ"
curl -sS -X POST "${API_URL}/imports/territory/kmz/commit" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -F "campaignId=${CAMPAIGN_ID}" \
  -F "file=@${KMZ_PATH}" >/dev/null

echo "==> Import reuniones"
curl -sS -X POST "${API_URL}/imports/operations/reuniones/commit" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -F "campaignId=${CAMPAIGN_ID}" \
  -F "file=@${REUNIONES_XLSX}" >/dev/null

echo "==> Import referentes"
curl -sS -X POST "${API_URL}/imports/operations/referentes/commit" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -F "campaignId=${CAMPAIGN_ID}" \
  -F "file=@${REFERENTES_XLSX}" >/dev/null

echo "==> Crear roles base"
ROLE_TITULAR="$(curl -sS -X POST "${API_URL}/fiscalization/roles" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"${CAMPAIGN_ID}\",\"codigo\":\"FISCAL_MESA_TITULAR\",\"nombre\":\"Fiscal de Mesa Titular\",\"nivel\":\"mesa\"}")"
ROLE_SUPLENTE="$(curl -sS -X POST "${API_URL}/fiscalization/roles" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"${CAMPAIGN_ID}\",\"codigo\":\"FISCAL_MESA_SUPLENTE\",\"nombre\":\"Fiscal de Mesa Suplente\",\"nivel\":\"mesa\"}")"
ROLE_TITULAR_ID="$(python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' <<<"${ROLE_TITULAR}")"
ROLE_SUPLENTE_ID="$(python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' <<<"${ROLE_SUPLENTE}")"

echo "==> Crear persona fiscal"
PERSON_JSON="$(curl -sS -X POST "${API_URL}/fiscalization/people" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"${CAMPAIGN_ID}\",\"dni\":\"40111222\",\"nombre\":\"Fiscal\",\"apellido\":\"Demo\",\"telefono\":\"3764000000\"}")"
PERSON_ID="$(python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' <<<"${PERSON_JSON}")"

echo "==> Tomar primera mesa"
TABLE_ID="$(curl -sS "${API_URL}/tables?campaignId=${CAMPAIGN_ID}" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")')"
if [ -z "${TABLE_ID}" ]; then
  echo "No se encontraron mesas para asignar." >&2
  exit 1
fi

echo "==> Asignar titular y suplente"
curl -sS -X POST "${API_URL}/fiscalization/assignments" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"${CAMPAIGN_ID}\",\"personId\":\"${PERSON_ID}\",\"roleId\":\"${ROLE_TITULAR_ID}\",\"tableId\":\"${TABLE_ID}\"}" >/dev/null
curl -sS -X POST "${API_URL}/fiscalization/assignments" \
  -H "x-user-role: ${ROLE_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"${CAMPAIGN_ID}\",\"personId\":\"${PERSON_ID}\",\"roleId\":\"${ROLE_SUPLENTE_ID}\",\"tableId\":\"${TABLE_ID}\"}" >/dev/null

echo "==> Consultar dashboard de cobertura"
curl -sS "${API_URL}/fiscalization/coverage/dashboard?campaignId=${CAMPAIGN_ID}" >/dev/null

echo "==> Consultar dataset de mapa"
curl -sS "${API_URL}/map/dataset?campaignId=${CAMPAIGN_ID}&coverageStatus=parcial" \
  -H "x-territory-circuits: 7A,7B,4" >/dev/null

echo ""
echo "Smoke E2E OK. campaignId=${CAMPAIGN_ID}"
