# Despliegue en Coolify

Guía para publicar **Referentes** en [Coolify](https://coolify.io) con Docker Compose.

## Arquitectura

| Servicio   | Imagen / build              | Público |
|-----------|-----------------------------|---------|
| `db`      | `postgis/postgis:16-3.4`    | No      |
| `backend` | `backend/Dockerfile.prod`   | No (solo red interna) |
| `frontend`| `frontend/Dockerfile.prod`  | Sí (dominio principal) |

El **frontend** (Nginx) sirve la app React y hace proxy de `/api/*` al backend.  
Un solo dominio alcanza (ej. `https://referentes.tudominio.com`).

## Repositorio privado en GitHub

No hay problema: Coolify puede clonar repos privados si le das acceso **una sola vez**.

1. En Coolify: **Settings** → **Source Providers** (o **GitHub**).
2. **Connect GitHub** e instalá la app **Coolify** en tu cuenta u organización.
3. Al instalar, marcá el repo `referentes` (o dale acceso a **All repositories** / **Selected repositories**).
4. Volvé a crear el recurso Docker Compose y elegí el repo desde la lista.

Si no querés usar la app de GitHub:

- **Deploy Key**: Coolify te muestra una clave pública → en GitHub: repo → **Settings** → **Deploy keys** → Add.
- **Personal Access Token (classic)**: permiso `repo` → pegarlo en Coolify como source.

Los **webhooks** (auto-deploy al hacer `git push`) también funcionan con repo privado, siempre que la integración GitHub esté conectada.

## 1. Crear el proyecto en Coolify

1. Conectá tu servidor Coolify.
2. **+ New Resource** → **Docker Compose**.
3. Source: GitHub → `lucasdealmeida123/referentes`.
4. Branch: `main`.
5. **Base Directory**: `/` (raíz del repo, **no** `frontend` ni `backend`).
6. **Docker Compose file**: `docker-compose.prod.yml`.
7. Activá **Persistent Storage** para el servicio `db` (volumen `db_data`).

## 2. Variables de entorno

En Coolify, en el recurso Compose, agregá:

| Variable | Valor | Notas |
|----------|-------|-------|
| `POSTGRES_DB` | `elecciones` | |
| `POSTGRES_USER` | `elecciones` | |
| `POSTGRES_PASSWORD` | *(generá una segura)* | **Obligatoria** |
| `DB_SYNCHRONIZE` | `false` | No alterar schema en prod |
| `VITE_API_URL` | *(vacío)* | Vacío = mismo dominio vía Nginx |

Podés copiar desde `.env.example`.

## 3. Dominio

1. En Coolify, asigná un dominio al servicio **`frontend`** (puerto 80).
2. Activá HTTPS (Let's Encrypt).
3. **No** hace falta exponer `backend` ni `db` a internet.

## 4. Primer deploy

1. **Deploy** → Coolify construye las 3 imágenes y levanta el stack.
2. Verificá: `https://tu-dominio/api/health` → debe responder OK.
3. La base arranca **vacía** (solo tablas si restaurás dump).

## 5. Migrar datos desde local

### Exportar (en tu Mac, con Docker local corriendo)

```bash
bash scripts/backup-db.sh
# Genera: elecciones-YYYYMMDD-HHMM.dump
```

### Restaurar en Coolify

**Opción A — Terminal del contenedor `db` en Coolify**

1. Subí el `.dump` al servidor (scp).
2. Copiá al contenedor: `docker cp elecciones.dump <container_db>:/tmp/`
3. Dentro del contenedor:

```bash
pg_restore -U elecciones -d elecciones --clean --if-exists /tmp/elecciones.dump
```

**Opción B — Desde tu máquina** (si Coolify expone Postgres solo en red interna, usá túnel SSH):

```bash
DB_HOST=127.0.0.1 DB_PORT=5432 POSTGRES_PASSWORD=... bash scripts/restore-db.sh elecciones.dump
```

## 6. Actualizaciones

Cada push a `main`:

- Coolify puede redeployar automático (webhook).
- La base **persiste** en el volumen `db_data` si configuraste storage.

```bash
git push origin main
```

## Desarrollo local (sin cambios)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:3001/api/health  
- Postgres: localhost:55432  

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Frontend carga pero API falla | Revisá que el dominio apunte al servicio `frontend`, no al backend |
| `/api/health` 502 | Backend no levantó; revisá logs y credenciales DB |
| Mapa sin polígonos | Confirmá PostGIS (`postgis/postgis`) y que el dump incluya circuitos |
| Build frontend falla | Revisá logs; `npm run build` debe pasar en local |

## Build manual (opcional)

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Requiere `.env` con `POSTGRES_PASSWORD` definido.
