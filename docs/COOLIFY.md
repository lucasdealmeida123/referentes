# Despliegue en Coolify

Guía para publicar **Referentes** en [Coolify](https://coolify.io) con Docker Compose.

## Arquitectura

| Servicio   | Imagen                                      | Público |
|-----------|---------------------------------------------|---------|
| `db`      | `postgis/postgis:16-3.4`                    | No      |
| `backend` | `ghcr.io/lucasdealmeida123/referentes-backend:latest` | No |
| `frontend`| `ghcr.io/lucasdealmeida123/referentes-frontend:latest` | Sí (dominio) |

Las imágenes **backend** y **frontend** se construyen en **GitHub Actions** al hacer push a `main`.  
Coolify solo las descarga (no compila en el servidor — evita errores de `backend not found`).

El **frontend** (Nginx) sirve la app React y hace proxy de `/api/*` al backend.  
Un solo dominio alcanza (ej. `https://referentes.tudominio.com`).

## 0. Primera vez: imágenes en GitHub Container Registry

### A) Permiso para que Actions publique (obligatorio una vez)

En GitHub → repo **referentes** → **Settings** → **Actions** → **General**:

1. **Workflow permissions** → elegí **Read and write permissions**
2. Guardá

Sin esto el workflow corre pero **no sube las imágenes** y Coolify responde `denied`.

### B) Generar las imágenes

1. **Actions** → **Publish Docker images** → **Run workflow** (botón manual)
2. Esperá el check **verde**
3. Verificá en **Packages** (tu perfil o el repo) que existan:
   - `referentes-backend`
   - `referentes-frontend`

El workflow las deja **públicas** automáticamente. Si falla ese paso, hacelas public manual en Package settings.

### C) Registry en Coolify (solo si siguen privadas)

- **Settings** → **Docker Registries** → `ghcr.io` + token con `read:packages`

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

Ya no hace falta `VITE_API_URL` en Coolify (va embebida vacía en la imagen del frontend).

Podés copiar desde `.env.example`.

## 3. Dominio

1. En Coolify, asigná un dominio al servicio **`frontend`** (puerto 80).
2. Activá HTTPS (Let's Encrypt).
3. **No** hace falta exponer `backend` ni `db` a internet.

## 4. Primer deploy

1. Confirmá que GitHub Actions terminó OK (imágenes en GHCR).
2. **Deploy** en Coolify → solo descarga imágenes + levanta PostGIS.
3. Verificá: `https://tu-dominio/api/health` → debe responder OK.
4. La base arranca **vacía** (restaurá dump si tenés datos locales).

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
| `backend: no such file or directory` | Normal con build en servidor; usá imágenes GHCR (este repo ya está configurado así) |
| `pull access denied` / `manifest unknown` | Esperá GitHub Actions o configurá registry GHCR en Coolify |
| Frontend carga pero API falla | Dominio debe apuntar al servicio `frontend`, no al backend |
| `/api/health` 502 | Backend no levantó; revisá logs y credenciales DB |
| Mapa sin polígonos | Confirmá PostGIS (`postgis/postgis`) y que el dump incluya circuitos |
| Build frontend falla | Revisá logs; `npm run build` debe pasar en local |

## Build manual (opcional)

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Requiere `.env` con `POSTGRES_PASSWORD` definido.
