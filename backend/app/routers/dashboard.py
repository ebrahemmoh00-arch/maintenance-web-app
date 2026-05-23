from fastapi import APIRouter

from ..schemas import DashboardStats
from ..services import WorkOrderService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
service = WorkOrderService()


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats():
    return service.dashboard()
