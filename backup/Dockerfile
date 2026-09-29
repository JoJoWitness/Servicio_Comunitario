# Respaldo programado de PostgreSQL al bucket (ver backup.sh).
#
# El cliente de Postgres debe ser igual o más nuevo que el servidor: pg_dump 17
# vuelca bases 17 y anteriores. Si Railway sube la base a 18, cambiar aquí.
FROM alpine:3.21

# La CLI de AWS escribe su configuración en $HOME: el usuario necesita uno.
RUN apk add --no-cache postgresql17-client aws-cli gzip ca-certificates tzdata \
    && adduser -D -u 10001 backup

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

USER backup
ENV HOME=/home/backup
WORKDIR /tmp

CMD ["/usr/local/bin/backup.sh"]
