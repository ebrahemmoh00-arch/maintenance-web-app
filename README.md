# Maintenance Management Web App

Full-stack maintenance management system with a FastAPI REST backend, PostgreSQL or SQLite database, and React + Tailwind CSS frontend.

## Structure

```text
maintenance-web-app/
  backend/
    alembic/
    alembic.ini
    Dockerfile
    docker-entrypoint.sh
    app/
      api/
      core/
      database/
      middleware/
      repositories/
      schemas/
      services/
      main.py
    requirements.txt
  frontend/
    Dockerfile
    public/
    src/
    package.json
    tailwind.config.js
  tools/
    Start-CMMS.bat
    Stop-CMMS.bat
    Restart-CMMS.bat
    Rebuild-CMMS.bat
    Backup-Database.bat
    Restore-Database.bat
    Update-Project.bat
    HealthCheck.bat
  backups/
  docker-compose.yml
```

## Features

- Customers CRUD
- Equipment CRUD with maintenance intervals and running hours
- Engineers CRUD
- Work Orders CRUD with customer, equipment, and engineer assignment
- Schedule view grouped by calendar date
- Dashboard metrics:
  - Total orders
  - Pending orders
  - Completed orders
  - Equipment interval alerts
- Professional dark SCADA/SAP-style UI with sidebar navigation
- REST API with separated backend/frontend architecture

## Docker Local Development

Docker is the recommended daily development workflow.

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace all placeholder values.

For Docker Compose, keep:

```text
DATABASE_URL=postgresql://cmms_user:replace-with-local-db-password@127.0.0.1:5432/cmms_dev
DOCKER_DATABASE_URL=postgresql://cmms_user:replace-with-local-db-password@postgres:5432/cmms_dev
VITE_API_BASE=http://127.0.0.1:8000/api
```

Start the complete platform:

```powershell
docker compose up --build
```

Frontend URL:

```text
http://127.0.0.1:5173
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

API docs:

```text
http://127.0.0.1:8000/docs
```

Stop containers without deleting the database:

```powershell
docker compose down
```

Stop containers and delete the PostgreSQL volume:

```powershell
docker compose down -v
```

PostgreSQL data is persisted in the Docker volume:

```text
postgres_data
```

The backend waits for PostgreSQL before starting.

The backend and frontend run with hot reload through mounted source folders.

## Local Development Toolkit

Windows launchers are available in:

```text
tools/
```

Use these files on Windows 10 or Windows 11 after Docker Desktop is installed and running.

| Tool | Purpose |
| --- | --- |
| `Start-CMMS.bat` | Checks Docker Desktop, starts Docker Compose in detached mode, waits for healthy services, opens the frontend and Swagger. |
| `Stop-CMMS.bat` | Stops all local CMMS Docker services with `docker compose down`. |
| `Restart-CMMS.bat` | Stops and starts all services, then waits for health checks. |
| `Rebuild-CMMS.bat` | Rebuilds containers and starts services after code or Dockerfile changes. |
| `Backup-Database.bat` | Creates a timestamped PostgreSQL `.sql` backup inside `backups/`. |
| `Restore-Database.bat` | Lists available `.sql` backups and restores the selected one after confirmation. |
| `Update-Project.bat` | Runs `git pull`, rebuilds containers, and starts the platform. |
| `HealthCheck.bat` | Shows the health status of Docker, PostgreSQL, Backend, and Frontend. |

Backup files are intentionally ignored by Git.

The backup folder is:

```text
backups/
```

Example backup file:

```text
backup_2026-07-02_15-30.sql
```

If Docker Desktop is not running, the tools show a clear failure message instead of changing the project.

## Local PostgreSQL Setup

Use this section only when running the backend directly on Windows instead of Docker.

Install PostgreSQL locally, then create a development database and user.

```powershell
psql -U postgres
```

```sql
CREATE USER cmms_user WITH PASSWORD 'replace-with-local-db-password';
CREATE DATABASE cmms_dev OWNER cmms_user;
GRANT ALL PRIVILEGES ON DATABASE cmms_dev TO cmms_user;
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and keep the local Windows database URL enabled:

```text
APP_ENV=development
DATABASE_URL=postgresql://cmms_user:replace-with-local-db-password@127.0.0.1:5432/cmms_dev
ADMIN_USERNAME=replace-with-admin-username
ADMIN_PASSWORD=replace-with-strong-admin-password
JWT_SECRET_KEY=replace-with-a-long-random-secret-at-least-32-characters
```

Generate a local JWT secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Never commit `.env`.

## Run Backend

Create a local development environment file first:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace all placeholder values before starting the backend.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Run Frontend

```powershell
.\start-frontend.ps1
```

Frontend URL:

```text
http://127.0.0.1:5173
```

Admin login credentials are read from environment variables and must not be committed to Git.

Required local and production variables:

```text
APP_ENV
DATABASE_URL
DOCKER_DATABASE_URL
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
ADMIN_USERNAME
ADMIN_PASSWORD
JWT_SECRET_KEY
```

If `DATABASE_URL` is set, the backend uses PostgreSQL.

If `DATABASE_URL` is not set, the backend falls back to SQLite for backward compatibility.

## Production Configuration

Production mode is enabled with:

```text
APP_ENV=production
```

In production, the backend refuses to start unless all required variables are set:

```text
ADMIN_USERNAME
ADMIN_PASSWORD
JWT_SECRET_KEY
```

Set these values in the hosting provider dashboard, for example Render Environment Variables.

For Render PostgreSQL, set:

```text
DATABASE_URL
```

Use the Render Internal Database URL for the backend service.

Render compatibility is preserved.

The Docker files are for local and enterprise container deployment and do not replace `render.yaml`.

Never place real secrets in:

```text
README.md
render.yaml
start-app.ps1
Git history
```

## Database

Local development should use PostgreSQL through:

```text
DATABASE_URL
```

SQLite fallback is still available when `DATABASE_URL` is not set.

The SQLite file is created automatically at:

```text
backend/maintenance.db
```

The backend seeds sample operational data on first startup. Login users are controlled by environment-driven admin configuration and user management.

## Database Migrations

Alembic is configured for future schema changes.

Migration config:

```text
backend/alembic.ini
```

Initial schema baseline:

```text
backend/alembic/versions/0001_initial_schema.py
```

Run migrations from the backend folder:

```powershell
cd backend
alembic upgrade head
```

Create future migrations with:

```powershell
cd backend
alembic revision -m "describe schema change"
```

Apply future schema changes through Alembic migrations instead of editing the database manually.

The existing startup schema creation remains in place for backward compatibility.
