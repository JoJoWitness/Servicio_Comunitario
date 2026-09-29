#!/bin/sh
# Respaldo de la base de datos al bucket.
#
# Hace un pg_dump comprimido, lo sube a s3://<bucket>/<BACKUP_PREFIX>/ y borra
# los respaldos con más de BACKUP_KEEP_DAYS días. Pensado para correr como cron
# de Railway (el proceso termina al acabar) o con `docker compose run backup`.
#
# Variables:
#   DATABASE_URI        conexión a Postgres (en Railway: ${{Postgres.DATABASE_URL}})
#   BUCKET_NAME         nombre del bucket (o AWS_S3_BUCKET_NAME / BUCKET)
#   AWS_ENDPOINT_URL    endpoint S3 (o ENDPOINT)
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (o ACCESS_KEY_ID / SECRET_ACCESS_KEY)
#   AWS_REGION          región (o REGION); por defecto "auto"
#   AWS_S3_URL_STYLE    "path" para MinIO; por defecto virtual-host (Railway)
#   BACKUP_PREFIX       carpeta dentro del bucket; por defecto "respaldos"
#   BACKUP_KEEP_DAYS    retención en días; por defecto 30 (0 = no borrar nada)
set -eu

: "${DATABASE_URI:?Falta DATABASE_URI}"

BUCKET="${BUCKET_NAME:-${AWS_S3_BUCKET_NAME:-${BUCKET:-}}}"
[ -n "$BUCKET" ] || { echo "Falta BUCKET_NAME" >&2; exit 1; }

# Los mismos nombres que acepta el servidor: estándar de AWS o los del Bucket
# de Railway, lo que haya.
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-${ACCESS_KEY_ID:-}}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-${SECRET_ACCESS_KEY:-}}"
export AWS_ENDPOINT_URL="${AWS_ENDPOINT_URL:-${ENDPOINT:-}}"
export AWS_DEFAULT_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-${REGION:-auto}}}"
# Sin esto, la CLI intenta cargar checksums CRC que no todos los S3 aceptan.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
if [ "${AWS_S3_URL_STYLE:-}" = "path" ]; then
  aws configure set default.s3.addressing_style path
fi

PREFIX="${BACKUP_PREFIX:-respaldos}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
FECHA="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
ARCHIVO="/tmp/notas-$FECHA.sql.gz"
CLAVE="$PREFIX/notas-$FECHA.sql.gz"

echo "[$(date -u +%FT%TZ)] Volcando la base..."
# --no-owner/--no-privileges: el restore no depende del usuario de Railway.
# El volcado va a disco primero para comprobar que pg_dump terminó bien antes
# de subir nada (en un pipe, su error se perdería detrás de gzip).
set -o pipefail
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URI" | gzip -9 > "$ARCHIVO"
set +o pipefail

TAMANO=$(stat -c %s "$ARCHIVO")
[ "$TAMANO" -gt 200 ] || { echo "El volcado salió vacío ($TAMANO bytes); no se sube" >&2; exit 1; }

echo "[$(date -u +%FT%TZ)] Subiendo $CLAVE ($TAMANO bytes)..."
aws s3 cp "$ARCHIVO" "s3://$BUCKET/$CLAVE" --content-type application/gzip --only-show-errors
aws s3api head-object --bucket "$BUCKET" --key "$CLAVE" >/dev/null
rm -f "$ARCHIVO"

if [ "$KEEP_DAYS" -gt 0 ] 2>/dev/null; then
  CORTE="$(date -u -d "@$(( $(date +%s) - KEEP_DAYS * 86400 ))" +%Y-%m-%dT%H:%M:%SZ)"
  echo "[$(date -u +%FT%TZ)] Borrando respaldos anteriores a $CORTE..."
  aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$PREFIX/" \
      --query "Contents[?LastModified<'$CORTE'].Key" --output text 2>/dev/null \
    | tr '\t' '\n' | grep -v '^None$' | grep . | while read -r viejo; do
        echo "  - $viejo"
        aws s3 rm "s3://$BUCKET/$viejo" --only-show-errors
      done || true
fi

echo "[$(date -u +%FT%TZ)] Respaldo listo: s3://$BUCKET/$CLAVE"
