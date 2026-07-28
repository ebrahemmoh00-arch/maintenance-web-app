# CMMS Deployment Guide

This guide documents the production deployment path for the CMMS platform without changing application features, APIs, database logic, or UI behavior.

## Deployment Targets

The project currently supports two deployment styles:

- Render deployment using `render.yaml`.
- Container deployment using the backend and frontend Dockerfiles.

Local Docker Compose is configured for development and daily local work. It uses hot reload and is not a hardened production Compose profile.

## Required Production Environment Variables

Set these variables in the production hosting provider dashboard. Do not commit real values to Git.

```text
APP_ENV=production
DATABASE_URL
ADMIN_USERNAME
ADMIN_PASSWORD
JWT_SECRET_KEY
FRONTEND_ORIGINS
VITE_API_BASE_URL
```

Recommended optional variables:

```text
ADMIN_EMAIL
ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS
PM_SCHEDULER_ENABLED
PM_SCHEDULER_STARTUP_DELAY_SECONDS
PM_SCHEDULER_INTERVAL_SECONDS
SMTP_HOST
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM_EMAIL
SMTP_USE_TLS
```

For Render PostgreSQL, use the Internal Database URL for the backend `DATABASE_URL`.

For frontend builds, set `VITE_API_BASE_URL` to the public backend API base URL.

Example:

```text
https://your-backend.example.com/api
```

## Render Deployment

1. Create a PostgreSQL database in Render.
2. Copy the Internal Database URL.
3. Open the backend web service environment variables.
4. Set:

```text
APP_ENV=production
DATABASE_URL=<Render Internal Database URL>
ADMIN_USERNAME=<production admin username>
ADMIN_PASSWORD=<strong production admin password>
JWT_SECRET_KEY=<long random secret>
FRONTEND_ORIGINS=<frontend public URL>
```

5. Open the frontend static service environment variables.
6. Set:

```text
VITE_API_BASE_URL=<backend public URL>/api
```

7. Deploy the backend.
8. Verify the backend health endpoint:

```text
GET /api/health
```

Expected response:

```json
{"status":"ok"}
```

9. Deploy the frontend.
10. Open the frontend URL and verify login.

## Docker Deployment

The backend Dockerfile is production-capable and starts FastAPI through Uvicorn.

Build backend:

```powershell
docker build -f backend/Dockerfile -t cmms-backend .
```

Run backend:

```powershell
docker run --rm -p 8000:8000 --env-file .env cmms-backend
```

The frontend Dockerfile includes a production Nginx target.

Build frontend production image:

```powershell
docker build -f frontend/Dockerfile --target production -t cmms-frontend .
```

Run frontend:

```powershell
docker run --rm -p 8080:80 cmms-frontend
```

For local development, use:

```powershell
docker compose up --build
```

Development URLs:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:8000
Swagger:  http://127.0.0.1:8000/docs
Mailpit:  http://127.0.0.1:8025
```

## Health Checks

Backend health endpoints:

```text
/health
/api/health
```

Docker backend health check uses:

```text
http://127.0.0.1:8000/health
```

Render backend health check uses:

```text
/api/health
```

Frontend Docker health check verifies that the frontend HTTP server responds.

PostgreSQL Docker health check uses:

```text
pg_isready
```

## Alembic Migration Readiness

Alembic is configured in:

```text
backend/alembic.ini
```

Migration scripts are located in:

```text
backend/alembic/versions/
```

Before production deployment, verify there is a single migration head:

```powershell
cd backend
python -m alembic heads
```

Apply migrations:

```powershell
cd backend
python -m alembic upgrade head
```

The backend still performs startup schema initialization for backward compatibility. Future schema changes should continue to be delivered through Alembic migrations.

## Backup Readiness

Local Docker backups are available through:

```text
tools/Backup-Database.bat
```

Backups are written to:

```text
backups/
```

Backup logs are written to:

```text
logs/backup.log
```

For hosted PostgreSQL, enable provider-managed backups. For Render PostgreSQL, configure scheduled backups according to the Render plan.

Manual hosted backup example:

```powershell
pg_dump --clean --if-exists "<External Database URL>" > backup.sql
```

Always create a database backup before:

- Applying migrations.
- Changing production environment variables.
- Deploying backend changes that touch database behavior.

## Logging

The backend writes logs to stdout and stderr. Docker and Render collect these logs automatically.

Current logging coverage includes:

- Startup failures.
- PM scheduler failures.
- Email alert send failures.
- Uvicorn access and error logs.

Recommended production improvement for a future task:

- Structured JSON logs.
- Request correlation IDs.
- Central log retention.
- Alerting on repeated 401, 403, 500, scheduler, and SMTP failures.

## Production Smoke Test

After each deployment, verify:

1. Backend health:

```text
GET /api/health
```

2. Frontend opens successfully.
3. Login works using the production admin credentials.
4. Dashboard loads data without `Failed to fetch`.
5. Assets page loads.
6. Work Orders page loads.
7. PM Plans page loads.
8. Reports page loads.
9. Audit Logs page loads for an admin user.
10. Inventory low-stock email alerts work if SMTP is configured.

## Rollback Plan

If a deployment fails:

1. Redeploy the previous known-good Git commit.
2. Do not roll back the database unless a verified backup exists.
3. If schema changes were applied, restore from backup only after confirming the data loss impact.
4. Check backend logs before retrying deployment.

## Current Production Readiness Notes

Ready:

- Dockerfiles exist for backend and frontend.
- Docker health checks exist.
- Docker Compose waits for PostgreSQL.
- Render deployment file exists.
- Production startup validates critical secrets.
- Environment template exists.
- Alembic migrations exist.
- Local backup and restore tools exist.

Needs future hardening:

- Add a dedicated production Docker Compose profile.
- Run Alembic migrations automatically in the deployment pipeline.
- Add structured logging and request IDs.
- Add hosted scheduled backup documentation per provider plan.
- Consider custom Nginx configuration if direct frontend path routing is introduced.
