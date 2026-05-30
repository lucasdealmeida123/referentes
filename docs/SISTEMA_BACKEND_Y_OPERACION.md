# Sistema Elecciones Misiones - Documentacion completa

## 1) Que es este sistema

Este proyecto es una plataforma de operacion electoral territorial para equipos de campana en Misiones.

Su objetivo es centralizar en un solo lugar:

- estructura territorial (circuitos, escuelas, mesas),
- fiscalizacion (personas, roles, asignaciones, cobertura),
- agenda operativa (eventos de prensa y barriales),
- visualizacion geografica (mapa interactivo),
- importaciones de datos reales (KMZ/KML, Excel),
- trazabilidad de acciones (auditoria).

La solucion esta pensada para trabajo de campo y coordinacion politica real, con datos por circuito/escuela/mesa.

---

## 2) Stack y arquitectura

### Backend

- Framework: NestJS (TypeScript)
- ORM: TypeORM
- Base de datos: PostgreSQL + PostGIS (imagen `postgis/postgis`)
- API: REST con prefijo global `/api`

### Frontend

- React + Vite + TypeScript
- Mapa interactivo con Leaflet

### Infraestructura

- Docker Compose para todo el entorno
- Sin necesidad de ejecutar npm local para operar la plataforma

### Puertos de ejecucion

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`
- Postgres/PostGIS: `localhost:55432`

---

## 3) Estructura funcional del sistema

El backend esta separado por modulos:

- `campaigns`: campanas electorales
- `territory`: circuitos, escuelas, mesas + importador KMZ/KML
- `fiscalization`: personas, roles, asignaciones, cobertura
- `operations`: importador de reuniones y referentes desde Excel
- `map`: dataset unificado para dashboard geoespacial
- `audit`: bitacora de acciones
- `security`: reglas simples de permisos por rol y alcance territorial

---

## 4) Modelo de datos (resumen)

### Campana

- `campaigns`
  - `id`, `nombre`, `anio`, `estado`, `fechaEleccion`

### Territorio

- `circuits`
  - `campaignId`, `codigo`, `nombre`, `zona`,
  - `electoresNacionales`, `electoresExtranjeros`,
  - `cantidadEscuelas`, `cantidadMesas`,
  - `polygonCoordinates`

- `schools`
  - `campaignId`, `circuitId`, `nombre`, `direccion`,
  - `lat`, `lng`, `cantMesasDeclaradas`

- `tables`
  - `campaignId`, `schoolId`, `numero`, `tipo`, `estadoCobertura`
  - restriccion unica: `(campaignId, schoolId, numero)`

### Fiscalizacion

- `people`
  - `campaignId`, `dni`, `nombre`, `apellido`, `telefono`
  - restriccion unica: `(campaignId, dni)`

- `roles_catalog`
  - `campaignId`, `codigo`, `nombre`, `nivel`
  - restriccion unica: `(campaignId, codigo)`

- `assignments`
  - `campaignId`, `personId`, `roleId`,
  - `circuitId`, `schoolId`, `tableId`,
  - `estado`

### Operaciones (agenda y referentes)

- `events`
  - `campaignId`, `tipo`, `fechaHora`,
  - `lugar`, `direccion`, `programa`, `contacto`, `observacion`,
  - `anfitrion`, `celular`, `barrio`, `circuitoCodigo`, `referente`, `ubicacionUrl`

- `referents`
  - `campaignId`, `nombreApellido`, `celular`, `direccion`,
  - `barrio`, `circuitoCodigo`, `ubicacionUrl`, `referenteDe`

### Auditoria

- `audit_logs`
  - `campaignId`, `module`, `action`, `userRole`, `details`, `createdAt`

---

## 5) Como funciona cada modulo backend

## 5.1 Campaigns

Permite crear y listar campanas.

Endpoints:

- `GET /api/campaigns`
- `POST /api/campaigns`

Uso: toda operacion del sistema cuelga de `campaignId`.

## 5.2 Territory

Gestiona estructura geografica base: circuitos, escuelas y mesas.

Endpoints:

- `GET /api/circuits`
- `POST /api/circuits`
- `GET /api/schools`
- `POST /api/schools`
- `GET /api/tables`
- `POST /api/tables`

### Importador territorial KMZ/KML

Endpoints:

- `POST /api/imports/territory/kmz/preview`
- `POST /api/imports/territory/kmz/commit`

Pipeline:

1. Lee archivo KMZ/KML.
2. Detecta poligonos (circuitos) y puntos (escuelas).
3. Extrae metadatos del `description`.
4. En commit: crea/actualiza circuitos, escuelas y mesas (rango desde/hasta).

## 5.3 Fiscalization

Permite registrar fiscales, roles y asignaciones operativas.

Endpoints:

- `POST /api/fiscalization/people`
- `GET /api/fiscalization/people`
- `POST /api/fiscalization/roles`
- `GET /api/fiscalization/roles`
- `POST /api/fiscalization/assignments`
- `GET /api/fiscalization/assignments`
- `GET /api/fiscalization/coverage`
- `GET /api/fiscalization/coverage/dashboard`

Reglas clave:

- DNI normalizado y unico por campana.
- Codigo de rol unico por campana.
- Si rol es de nivel `mesa`, `tableId` es obligatorio.
- Se evita asignacion activa duplicada persona/rol/mesa.
- Cuando hay `tableId`, sistema hereda escuela y circuito para mantener consistencia territorial.

Semaforo de cobertura por mesa:

- `critico`: sin titular
- `parcial`: con titular sin suplente
- `optimo`: titular y suplente

## 5.4 Operations (Excel reuniones y referentes)

Importa planillas operativas reales del equipo.

Endpoints:

- `POST /api/imports/operations/reuniones/preview`
- `POST /api/imports/operations/reuniones/commit`
- `POST /api/imports/operations/referentes/preview`
- `POST /api/imports/operations/referentes/commit`

El importador:

- normaliza encabezados de Excel (acentos, espacios, variantes),
- mapea reuniones de prensa y barriales a `events`,
- mapea referentes territoriales a `referents`.

## 5.5 Map

Consolida todo para el dashboard.

Endpoint:

- `GET /api/map/dataset`

Filtros soportados:

- `campaignId` (obligatorio),
- `circuitCode`,
- `schoolId`,
- `coverageStatus`,
- `eventType`.

Respuesta incluye:

- `circuits` (con poligono GeoJSON cuando existe),
- `schools` con cobertura agregada,
- `events`,
- `coverageSummary`.

## 5.6 Audit

Registra acciones relevantes del sistema (trazabilidad minima).

Se audita:

- commits de importaciones,
- altas de fiscalizacion,
- lecturas de dataset de mapa.

---

## 6) Seguridad y permisos

Modelo actual (simple, por headers):

- Escritura permitida solo a roles:
  - `x-user-role: admin`
  - `x-user-role: coordinador`

- Alcance territorial en lectura de mapa:
  - `x-territory-circuits: 7A,7B,4`
  - limita la respuesta solo a esos circuitos

Nota: es un control de aplicacion MVP. Para produccion se recomienda JWT + ACL por usuario.

---

## 7) Frontend dashboard: que muestra

La UI principal en React muestra:

- filtros de campana/circuito/cobertura/evento,
- KPIs de cobertura,
- mapa interactivo (Leaflet) con:
  - poligonos de circuitos,
  - escuelas por estado de cobertura,
- agenda configurable por tipos de evento,
- tablas de escuelas y eventos.

---

## 8) Flujo operativo recomendado

1. Crear o seleccionar campana.
2. Importar KMZ/KML territorial.
3. Importar reuniones y referentes desde Excel.
4. Crear roles y personas de fiscalizacion.
5. Asignar fiscales a mesas.
6. Monitorear cobertura en dashboard/mapa.
7. Exportar dataset territorial para analisis externo.

---

## 9) Exportacion de datos territoriales

Script incluido:

- `scripts/export-map-data.py`

Ejemplo:

```bash
./scripts/export-map-data.py --campaign-id TU_CAMPAIGN_ID --out-dir ./exports
```

Salida:

- `exports/map-dataset.json`
- `exports/circuits.csv`
- `exports/schools.csv`

---

## 10) Pruebas rapidas E2E

Script:

- `scripts/smoke-e2e.sh`

Ejecuta:

1. health check
2. crear campana
3. preview+commit KMZ
4. import reuniones/referentes
5. crear roles/persona/asignaciones
6. consultar cobertura y dataset mapa

---

## 11) Estado actual del MVP

El sistema ya cubre el ciclo base completo:

- carga territorial,
- carga operativa de agenda,
- carga de referentes,
- asignacion de fiscales,
- medicion de cobertura,
- visualizacion geoespacial.

Para siguiente iteracion se recomienda:

- autenticacion formal con JWT,
- permisos por usuario persistidos en DB,
- exportaciones desde UI,
- mapa con capas encendibles y buscador avanzado,
- dashboard ejecutivo con metricas temporales.
