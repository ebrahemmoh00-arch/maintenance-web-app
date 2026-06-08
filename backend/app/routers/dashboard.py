from fastapi import APIRouter, Depends

from ..auth import require_permission
from ..schemas import DashboardStats
from ..services import WorkOrderService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
service = WorkOrderService()


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(_=Depends(require_permission("dashboard:read"))):
    return service.dashboard()
