from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import DashboardStats
from ...services import ReliabilityService, WorkOrderService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
service = WorkOrderService()
reliability = ReliabilityService()


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(_=Depends(require_permission("dashboard:read"))):
    return service.dashboard()


@router.get("/reliability")
def dashboard_reliability(_=Depends(require_permission("dashboard:read"))):
    return reliability.dashboard()
