FROM node:20-alpine AS dependencies

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

FROM dependencies AS development

WORKDIR /app

ENV HOST=0.0.0.0 \
    PORT=5173

COPY frontend/ ./

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:5173 || exit 1

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM dependencies AS build

WORKDIR /app

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1 || exit 1
