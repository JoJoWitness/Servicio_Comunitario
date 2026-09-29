# Notas Operatorias — Servicio de Oftalmología, Hospital Central

- `server/`: API en Go + PostgreSQL (endpoints en `server/ENDPOINTS.md`).
- `frontend/`: React + Vite. Se distribuye como app de escritorio (Tauri, ver
  `.github/workflows/release.yml`) y como web.

## Levantar todo con Docker

```sh
cp .env.example .env        # poner POSTGRES_PASSWORD; opcionalmente ENVIRONMENT=PROD
docker compose up --build
```

| Servicio   | URL                     |
|------------|-------------------------|
| Frontend   | http://localhost:3000   |
| API        | http://localhost:8080   |
| PostgreSQL | localhost:5432 (solo loopback) |
| S3 local   | http://localhost:9000 (solo loopback) |

El frontend web reenvía `/api/*` a la API por nginx, así que el navegador solo
habla con un origen y la cookie de sesión es de primera parte.

Sin `ENVIRONMENT=PROD` la API arranca en modo desarrollo: **borra la base en
cada arranque** y carga las cuentas de prueba (`ryuk@test.com` / `ryuk2026`).
Con `ENVIRONMENT=PROD` no borra nada y solo aplica el esquema y el catálogo.

Comandos útiles:

```sh
docker compose logs -f server        # logs de la API
docker compose down                  # parar (conserva la base en el volumen pgdata)
docker compose down -v               # parar y borrar la base
docker compose build server          # reconstruir solo la API tras cambiar código Go
```

## Bucket: fotos de cédula y respaldos

Las **fotos de cédula de los pacientes** (la imagen que se imprime en la hoja
de la nota) se guardan en un bucket S3, no en la base. En local lo da el
contenedor `s3` (Versity Gateway); en Railway, un **Bucket** del proyecto. La
API lo configura con `BUCKET_NAME`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY` y `AWS_REGION` (acepta también los nombres que expone el
Bucket de Railway: `BUCKET`, `ENDPOINT`, `ACCESS_KEY_ID`...). Sin `BUCKET_NAME`
las fotos se guardan en la base, como hasta v0.5.0, y al arrancar con bucket el
servidor mueve allá las que hubieran quedado.

En el mismo bucket van los **respaldos de la base**: `backup/backup.sh` hace un
`pg_dump` comprimido, lo sube a `respaldos/` y borra los de más de
`BACKUP_KEEP_DAYS` días (30 por defecto).

```sh
docker compose run --rm backup     # respaldo a mano en local
```

En Railway el mismo contenedor corre como cron (ver `backup/railway.json`,
07:00 UTC = 03:00 Venezuela). Para restaurar un respaldo:

```sh
aws s3 cp s3://<bucket>/respaldos/notas-<fecha>.sql.gz - | gunzip | psql "$DATABASE_URI"
```

### Solo la API

```sh
docker build -t notas-api ./server
docker run --rm -p 8080:8080 -e ENVIRONMENT=PROD \
  -e DATABASE_URI=postgres://usuario:clave@host:5432/notas_operatorias notas-api
```

### Solo el frontend web contra otra API

La URL de la API se congela al compilar (`VITE_API_URL`, por defecto `/api`), y
nginx reenvía `/api/*` a `API_UPSTREAM` (por defecto `http://server:8080`):

```sh
docker build -t notas-web ./frontend
docker run --rm -p 3000:80 -e API_UPSTREAM=https://mi-api.example notas-web
```
