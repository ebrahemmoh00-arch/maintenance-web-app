import asyncio
import logging
from datetime import datetime
import os
import time

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.auth import require_permission
from .core.config import frontend_origins, validate_startup_configuration
from .core.structured_logging import configure_logging, log_background_job, monotonic_ms
from .database import init_db
from .middleware.authentication import protect_api_routes
from .middleware.rate_limiting import rate_limit_api_routes
from .middleware.request_logging import log_http_requests
from .middleware.security_headers import secure_http_responses
from .api.routers import assets, audit_logs, auth, customers, dashboard, downtime_events, engineers, equipment, failure_events, inventory, job_titles, maintenance_alerts, pm_plans, preventive_maintenance, reports, schedule, work_orders
from .services import PMPlanEngineService

configure_logging()
logger = logging.getLogger("cmms.pm_scheduler")
pm_scheduler_task: asyncio.Task | None = None

app = FastAPI(
    title="Maintenance Management API",
    version="1.0.0",
    description="REST API for departments, assets, resources, work orders, inventory, preventive maintenance, schedule, and dashboard metrics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.middleware("http")(protect_api_routes)
app.middleware("http")(rate_limit_api_routes)
app.middleware("http")(secure_http_responses)
app.middleware("http")(log_http_requests)


@app.on_event("startup")
def on_startup() -> None:
    validate_startup_configuration()
    init_db()
    start_pm_scheduler()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global pm_scheduler_task
    if pm_scheduler_task:
        pm_scheduler_task.cancel()
        try:
            await pm_scheduler_task
        except asyncio.CancelledError:
            pass
        pm_scheduler_task = None


def scheduler_enabled() -> bool:
    return os.getenv("PM_SCHEDULER_ENABLED", "true").strip().lower() not in {"0", "false", "no", "off"}


def start_pm_scheduler() -> None:
    global pm_scheduler_task
    if not scheduler_enabled() or pm_scheduler_task:
        return
    pm_scheduler_task = asyncio.create_task(pm_scheduler_loop())


async def pm_scheduler_loop() -> None:
    startup_delay = max(int(os.getenv("PM_SCHEDULER_STARTUP_DELAY_SECONDS", "10") or 10), 0)
    interval = max(int(os.getenv("PM_SCHEDULER_INTERVAL_SECONDS", "3600") or 3600), 60)
    await asyncio.sleep(startup_delay)
    while True:
        started = time.perf_counter()
        try:
            result = PMPlanEngineService().run_due_plans()
            log_background_job(
                "background_job_completed",
                job_name="pm_scheduler",
                duration_ms=monotonic_ms(started),
                generated=result.get("generated", ""),
                skipped=result.get("skipped", ""),
            )
        except Exception as exc:  # pragma: no cover - defensive production loop.
            logger.warning("pm_scheduler_failed", extra={"event": "pm_scheduler_failed", "error_type": exc.__class__.__name__}, exc_info=True)
            log_background_job(
                "background_job_failed",
                job_name="pm_scheduler",
                status="FAILED",
                duration_ms=monotonic_ms(started),
                error=exc,
            )
        await asyncio.sleep(interval)


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
app.include_router(assets.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(maintenance_alerts.router, prefix="/api")
app.include_router(failure_events.router, prefix="/api")
app.include_router(downtime_events.router, prefix="/api")
app.include_router(preventive_maintenance.router, prefix="/api")
app.include_router(pm_plans.router, prefix="/api")
app.include_router(work_orders.router, prefix="/api")
app.include_router(schedule.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
