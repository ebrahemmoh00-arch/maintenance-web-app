# Maintenance Management Web App

Full-stack maintenance management system with a FastAPI REST backend, SQLite database, and React + Tailwind CSS frontend.

## Structure

```text
maintenance-web-app/
  backend/
    app/
      database.py
      repositories.py
      schemas.py
      services.py
      main.py
      routers/
    requirements.txt
  frontend/
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

The frontend script uses a local portable Node.js runtime under `.tools/` if global `npm` is not available.

## Admin Login

```text
Username: ECS-ECS
Password: E5C9S2@rom
```

This login gate is handled in the frontend with full admin access for the local app. For production team access, connect it to backend authentication with user accounts and roles.

## Database

SQLite database is created automatically at:

```text
backend/maintenance.db
```

The backend seeds one customer, one engineer, one equipment item, and one work order on first startup.
