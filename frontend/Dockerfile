# Imagen de la versión web del frontend (la app de escritorio Tauri se compila
# aparte, en .github/workflows/release.yml).
#
# Etapa 1 compila el bundle con Vite; etapa 2 lo sirve con nginx, que además
# reenvía /api/* a la API. Así el navegador solo habla con un origen, la cookie
# de sesión es de primera parte y no hay CORS que configurar (mismo esquema que
# el rewrite de vercel.json).

# ---------- Etapa 1: build ----------
FROM node:22-alpine AS build

WORKDIR /src

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 300000

COPY . .

# src/api/config.ts congela la URL de la API en tiempo de compilación. "/api"
# hace que todas las peticiones pasen por el proxy de nginx de abajo.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN yarn build

# ---------- Etapa 2: nginx ----------
FROM nginx:1.27-alpine

# El entrypoint de la imagen oficial pasa los *.template por envsubst y los
# deja en /etc/nginx/conf.d, así que API_UPSTREAM se puede cambiar sin
# reconstruir la imagen.
ENV API_UPSTREAM=http://server:8080

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 nginx/05-resolver.envsh /docker-entrypoint.d/05-resolver.envsh
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
