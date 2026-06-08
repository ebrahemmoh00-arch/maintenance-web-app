from fastapi import APIRouter, Depends

from ..auth import require_permission
from ..schemas import WorkOrder
from ..services import WorkOrderService

router = APIRouter(prefix="/schedule", tags=["Schedule"])
service = WorkOrderService()


@router.get("", response_model=list[WorkOrder])
def schedule(_=Depends(require_permission("schedule:read"))):
    return service.schedule()
