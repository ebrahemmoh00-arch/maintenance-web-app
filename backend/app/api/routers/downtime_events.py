from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import DowntimeEvent, DowntimeEventCreate
from ...services import DowntimeService

router = APIRouter(prefix="/downtime-events", tags=["Downtime Events"])
service = DowntimeService()


@router.get("", response_model=list[DowntimeEvent])
def list_downtime_events(_=Depends(require_permission("assets:read"))):
    return service.list()


@router.post("", response_model=DowntimeEvent, status_code=201)
def create_downtime_event(downtime: DowntimeEventCreate, _=Depends(require_permission("work_orders:update"))):
    return service.create(downtime)
