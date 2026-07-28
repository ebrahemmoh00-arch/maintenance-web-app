FROM node:20-alpine AS dependencies

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

FROM dependencies AS development

WORKDIR /app

ENV VITE_DEV_HOST=0.0.0.0 \
    FRONTEND_CONTAINER_PORT=5173

COPY frontend/ ./

EXPOSE ${FRONTEND_CONTAINER_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider "http://127.0.0.1:${FRONTEND_CONTAINER_PORT:-5173}" || exit 1

CMD sh -c 'npm run dev -- --host "${VITE_DEV_HOST:-0.0.0.0}" --port "${FRONTEND_CONTAINER_PORT:-5173}"'

FROM dependencies AS build

WORKDIR /app

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS production

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

ENV NGINX_CONTAINER_PORT=80

EXPOSE ${NGINX_CONTAINER_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider "http://127.0.0.1:${NGINX_CONTAINER_PORT:-80}" || exit 1
