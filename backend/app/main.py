from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .database import init_db
from .routers import customers, dashboard, engineers, equipment, inventory, job_titles, maintenance_alerts, preventive_maintenance, schedule, work_orders

app = FastAPI(
    title="Maintenance Management API",
    version="1.0.0",
    description="REST API for departments, assets, resources, work orders, inventory, preventive maintenance, schedule, and dashboard metrics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://cmms-system-1.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/server-time")
def server_time():
    now = datetime.now()
    return {
        "date": now.date().isoformat(),
        "time": now.strftime("%H:%M"),
        "display": now.strftime("%d-%m-%Y %I:%M %p"),
    }


app.include_router(customers.router, prefix="/api")
app.include_router(engineers.router, prefix="/api")
app.include_router(job_titles.router, prefix="/api")
app.include_router(equipment.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(maintenance_alerts.router, prefix="/api")
app.include_router(preventive_maintenance.router, prefix="/api")
app.include_router(work_orders.router, prefix="/api")
app.include_router(schedule.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
