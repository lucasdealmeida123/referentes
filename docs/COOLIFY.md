# Despliegue en Coolify (Docker Hub + docker pull)

## Resumen

1. **Vos** construís y subís imágenes a Docker Hub (una vez por cada cambio).
2. **Coolify** solo hace `docker pull` — sin build, sin GHCR, sin tokens.

| Servicio   | Imagen Docker Hub |
|-----------|-------------------|
| `db`      | `postgis/postgis:16-3.4` |
| `backend` | `lucassebastiandealmeida/referentes-backend:latest` |
| `frontend`| `lucassebastiandealmeida/referentes-frontend:latest` |

---

## 1. Subir imágenes (desde tu Mac)

```bash
# Crear cuenta en hub.docker.com si no tenés (usuario: lucassebastiandealmeida)

docker login

cd "/Users/lucasdealmeida/Documents/Sistema politico/Sistemaelecciones"
bash scripts/docker-push.sh
```

La primera vez Docker Hub crea los repos. Dejalos **Public** (Settings → Make public).

Si tu usuario de Docker Hub es otro:

```bash
DOCKERHUB_USER=tu_usuario bash scripts/docker-push.sh
```

Y en Coolify agregá variable `BACKEND_IMAGE=tu_usuario/referentes-backend:latest` (y lo mismo para frontend).

---

## 2. Coolify — Docker Compose

1. **+ New Resource** → **Docker Compose**
2. Repo GitHub → `lucasdealmeida123/referentes` → branch `main`
3. Compose file: **`docker-compose.prod.yml`**
4. **Persistent storage** en servicio `db`

### Variables de entorno

```env
POSTGRES_DB=elecciones
POSTGRES_USER=elecciones
POSTGRES_PASSWORD=RefMisiones2025!xK7pQ
DB_SYNCHRONIZE=false
```

5. Dominio + HTTPS → servicio **`frontend`** (puerto 80)
6. **Deploy**

Verificá: `https://tu-dominio.com/api/health`

---

## 3. Cuando cambiás código

```bash
bash scripts/docker-push.sh
```

Luego en Coolify: **Redeploy** (pull de `:latest`).

---

## 4. Migrar datos locales

```bash
bash scripts/backup-db.sh
# Restaurar en contenedor db de Coolify (ver scripts/restore-db.sh)
```

---

## Desarrollo local

```bash
docker compose up --build
```

Frontend: http://localhost:5173 · API: http://localhost:3001/api/health

---

## Problemas frecuentes

| Error | Qué hacer |
|-------|-----------|
| `pull access denied` | Imagen no existe → corré `bash scripts/docker-push.sh` |
| `manifest unknown` | Mismo: falta push o nombre de usuario distinto |
| API 502 | Revisá logs del backend y `POSTGRES_PASSWORD` |
| Repo privado en Docker Hub | Hacelo public o agregá registry en Coolify |
