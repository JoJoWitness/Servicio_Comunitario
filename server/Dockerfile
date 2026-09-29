# Imagen de la API. Dos etapas: la primera compila el binario con el toolchain
# completo de Go; la segunda es un Alpine mínimo con el binario y los scripts
# SQL, que es lo único que necesita para arrancar.

# ---------- Etapa 1: compilación ----------
FROM golang:1.25-alpine AS build

WORKDIR /src

# Las dependencias se bajan antes de copiar el código para que Docker las
# cachee y no vuelva a descargarlas con cada cambio en un .go.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

# ---------- Etapa 2: imagen final ----------
FROM alpine:3.21

# ca-certificates: por si DATABASE_URI apunta a un Postgres con TLS (Render,
# Neon, etc.). tzdata: para que Go resuelva zonas horarias por nombre.
RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -H -u 10001 app

WORKDIR /app

COPY --from=build /out/server /app/server
# models/init.go lee los .sql desde <cwd>/models/schemas en tiempo de
# ejecución, así que tienen que viajar junto al binario con esa misma ruta.
COPY --from=build /src/models/schemas /app/models/schemas

USER app

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

CMD ["/app/server"]
