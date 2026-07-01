# Maintenance Management Web App

Full-stack maintenance management system with a FastAPI REST backend, PostgreSQL or SQLite database, and React + Tailwind CSS frontend.

## Structure

```text
maintenance-web-app/
  backend/
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
    public/
    src/
    package.json
    tailwind.config.js
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

## Local PostgreSQL Setup

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

Edit `.env` and keep the local database URL enabled:

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
