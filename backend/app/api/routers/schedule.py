from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import WorkOrder
from ...services import WorkOrderService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/schedule", tags=["Schedule"])
service = WorkOrderService()


@router.get("", response_model=None)
def schedule(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("schedule:read")),
):
    return query.apply(
        service.schedule(),
        search_fields=["title", "description", "work_order_number", "asset_name", "technician_name"],
        filter_aliases={
            "asset": ["equipment_id", "asset_id", "asset_name", "equipment_name"],
            "site": ["site", "location", "customer_name"],
            "engineer": ["engineer_id", "engineer_name", "technician_name", "assigned_to"],
            "priority": ["priority"],
            "status": ["status"],
        },
        date_fields=["scheduled_date", "due_date", "start_time", "end_time", "created_at"],
    )
