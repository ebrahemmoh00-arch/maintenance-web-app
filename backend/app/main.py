from datetime import datetime
import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .audit import client_ip, device_info, reset_audit_context, set_audit_context
from .auth import authenticate_access_header, require_permission
from .database import init_db
from .routers import audit_logs, auth, customers, dashboard, engineers, equipment, inventory, job_titles, maintenance_alerts, preventive_maintenance, schedule, work_orders

app = FastAPI(
    title="Maintenance Management API",
    version="1.0.0",
    description="REST API for departments, assets, resources, work orders, inventory, preventive maintenance, schedule, and dashboard metrics.",
)

PUBLIC_API_PATHS = {
    "/api/login",
    "/api/refresh-token",
    "/api/health",
    "/health",
}

frontend_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://cmms-system-1.onrender.com",
    "https://cmms-system.onrender.com",
    "https://maintenance-frontend.onrender.com",
]
frontend_origin_env = os.getenv("FRONTEND_ORIGINS", "")
if frontend_origin_env:
    frontend_origins.extend(origin.strip() for origin in frontend_origin_env.split(",") if origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def protect_api_routes(request: Request, call_next):
    path = request.url.path.rstrip("/") or "/"
    if request.method == "OPTIONS" or path in PUBLIC_API_PATHS or not path.startswith("/api"):
        return await call_next(request)
    try:
        current_user = authenticate_access_header(request.headers.get("Authorization"))
        request.state.current_user = current_user
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": "Access Denied"})
    token = set_audit_context(current_user, ip_address=client_ip(request), device_info=device_info(request))
    try:
        return await call_next(request)
    finally:
        reset_audit_context(token)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/health")
def root_health_check():
    return {"status": "ok"}


@app.get("/api/server-time")
def server_time(_=Depends(require_permission("server_time:read"))):
    now = datetime.now()
    return {
        "date": now.date().isoformat(),
        "time": now.strftime("%H:%M"),
        "display": now.strftime("%d-%m-%Y %I:%M %p"),
    }


app.include_router(auth.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")
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
