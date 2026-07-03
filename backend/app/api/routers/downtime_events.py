from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import DowntimeEvent, DowntimeEventCreate
from ...services import DowntimeService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/downtime-events", tags=["Downtime Events"])
service = DowntimeService()


@router.get("", response_model=None)
def list_downtime_events(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(
        service.list(),
        search_fields=["asset_name", "reason", "description", "failure_code"],
        filter_aliases={"asset": ["asset_id", "equipment_id", "asset_name"], "status": ["status"], "site": ["site", "location"]},
        date_fields=["start_time", "end_time", "created_at"],
    )


@router.post("", response_model=DowntimeEvent, status_code=201)
def create_downtime_event(downtime: DowntimeEventCreate, _=Depends(require_permission("work_orders:update"))):
    return service.create(downtime)
