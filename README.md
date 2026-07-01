# Maintenance Management Web App

Full-stack maintenance management system with a FastAPI REST backend, SQLite database, and React + Tailwind CSS frontend.

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

Required admin variables:

```text
ADMIN_USERNAME
ADMIN_PASSWORD
JWT_SECRET_KEY
```

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

Never place real secrets in:

```text
README.md
render.yaml
start-app.ps1
Git history
```

## Database

SQLite database is created automatically at:

```text
backend/maintenance.db
```

The backend seeds sample operational data on first startup. Login users are controlled by environment-driven admin configuration and user management.
