from fastapi import APIRouter

from ..schemas import WorkOrder
from ..services import WorkOrderService

router = APIRouter(prefix="/schedule", tags=["Schedule"])
service = WorkOrderService()


@router.get("", response_model=list[WorkOrder])
def schedule():
    return service.schedule()
