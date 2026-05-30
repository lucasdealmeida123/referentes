# Sistema Elecciones (Base Docker)

Documentacion completa del sistema:

- `docs/SISTEMA_BACKEND_Y_OPERACION.md`

Proyecto inicial orientado a operacion territorial electoral, con stack:

- Backend: NestJS (TypeScript)
- Frontend: React + Vite (TypeScript)
- Base de datos: PostgreSQL + PostGIS
- Orquestacion: Docker Compose

## Requisito unico

- Tener Docker Desktop (o Docker Engine + Compose plugin).

No hace falta instalar ni ejecutar `npm` localmente.

## Levantar entorno

```bash
docker compose up --build
```

Servicios:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001/api/health`
- Postgres/PostGIS: `localhost:55432`

## Bajar entorno

```bash
docker compose down
```

## Estructura

- `backend/`: API NestJS
- `frontend/`: interfaz React
- `docker-compose.yml`: orquestacion completa

## Siguiente paso sugerido

Implementar endpoint de importacion `KMZ/KML`.

## Etapa 2 disponible (nucleo territorial)

El backend ya expone CRUD inicial para:

- `campaigns`
- `circuits`
- `schools`
- `tables`

Todos los endpoints viven bajo prefijo ` /api`.

Ejemplos rapidos:

1. Crear campana:

```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Legislativas Misiones","anio":2025,"estado":"activa"}'
```

2. Crear circuito:

```bash
curl -X POST http://localhost:3001/api/circuits \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"UUID_CAMPAIGN","codigo":"7A","nombre":"Circuito 7A","zona":"Itaembe Guazu","cantidadEscuelas":3,"cantidadMesas":22}'
```

## Etapa 3 disponible (importador KMZ/KML)

Preview sin persistir:

```bash
curl -X POST http://localhost:3001/api/imports/territory/kmz/preview \
  -F "file=@/ruta/Escuelas Posadas 2025.kmz"
```

Commit con persistencia (circuitos + escuelas + mesas):

```bash
curl -X POST http://localhost:3001/api/imports/territory/kmz/commit \
  -F "campaignId=UUID_CAMPAIGN" \
  -F "file=@/ruta/Escuelas Posadas 2025.kmz"
```

## Etapa 4 inicial disponible (fiscalizacion base)

- `POST /api/fiscalization/people`
- `GET /api/fiscalization/people?campaignId=...`
- `POST /api/fiscalization/roles`
- `GET /api/fiscalization/roles?campaignId=...`
- `POST /api/fiscalization/assignments`
- `GET /api/fiscalization/assignments?campaignId=...`
- `GET /api/fiscalization/coverage?campaignId=...`
- `GET /api/fiscalization/coverage/dashboard?campaignId=...`

Reglas operativas aplicadas:

- DNI unico por campana.
- Codigo de rol unico por campana.
- Para rol de nivel `mesa`, `tableId` es obligatorio.
- Se evita asignacion activa duplicada para la misma persona/rol/mesa.

## Etapa 5 disponible (reuniones y referentes desde Excel)

Reuniones:

- `POST /api/imports/operations/reuniones/preview`
- `POST /api/imports/operations/reuniones/commit` (requiere `campaignId`)

Referentes:

- `POST /api/imports/operations/referentes/preview`
- `POST /api/imports/operations/referentes/commit` (requiere `campaignId`)

Ejemplo de uso:

```bash
curl -X POST http://localhost:3001/api/imports/operations/reuniones/preview \
  -F "file=@/Users/lucasdealmeida/Downloads/LISTADO DE REUNIONES.xlsx"
```

## Etapa 6 disponible (dataset de mapa operativo)

Endpoint principal:

- `GET /api/map/dataset?campaignId=...`

Filtros soportados:

- `circuitCode` (ej: `7A`)
- `schoolId`
- `coverageStatus` (`critico|parcial|optimo`)
- `eventType` (`prensa|barrial|...`)

Respuesta incluye:

- `circuits` (con poligono GeoJSON si existe)
- `schools` (con cobertura agregada por escuela)
- `events` (agenda georreferenciable por circuito/link)
- `coverageSummary` general

## Etapa 7 disponible (permisos, auditoria y tablero)

Permisos por rol (headers):

- Operaciones de escritura (imports, altas fiscalizacion) requieren:
  - `x-user-role: admin` o `x-user-role: coordinador`

Alcance territorial en lectura de mapa:

- `x-territory-circuits: 7A,7B,4`
- Si se envia, el dataset de mapa solo devuelve esos circuitos.

Auditoria basica:

- Se registra en `audit_logs`:
  - commits de importaciones
  - altas de fiscalizacion
  - lecturas de dataset de mapa

Tablero frontend:

- La app en `http://localhost:5173` ahora consulta `GET /api/map/dataset` y permite filtrar por circuito, estado de cobertura y tipo de evento.

## Pruebas rapidas E2E (flujo completo)

Script automatizado:

```bash
bash ./scripts/smoke-e2e.sh
```

El script ejecuta:

1. health check
2. crea campaña nueva
3. preview + commit de KMZ territorial
4. commit de reuniones y referentes
5. crea roles y persona de fiscalizacion
6. asigna titular y suplente en una mesa
7. consulta cobertura dashboard
8. consulta dataset de mapa con filtro territorial

Variables opcionales:

- `API_URL` (default `http://localhost:3001/api`)
- `ROLE_HEADER` (default `admin`)
- `KMZ_PATH`
- `REUNIONES_XLSX`
- `REFERENTES_XLSX`

Ejemplo:

```bash
API_URL=http://localhost:3001/api \
ROLE_HEADER=admin \
KMZ_PATH="/Users/lucasdealmeida/Downloads/Escuelas Posadas 2025.kmz" \
REUNIONES_XLSX="/Users/lucasdealmeida/Downloads/LISTADO DE REUNIONES.xlsx" \
REFERENTES_XLSX="/Users/lucasdealmeida/Downloads/LISTADO REFERENTES.xlsx" \
bash ./scripts/smoke-e2e.sh
```
