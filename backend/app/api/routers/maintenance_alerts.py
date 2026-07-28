from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...services import EquipmentService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/maintenance-alerts", tags=["Maintenance Alerts"])
service = EquipmentService()


@router.get("", response_model=None)
def maintenance_alerts(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("alerts:read")),
):
    return service.repo.maintenance_alerts_query(
        query,
        search_fields=["equipment_name", "serial_number", "location", "alert_level"],
        filter_aliases={"asset": ["asset_id", "equipment_id", "asset_name"], "status": ["status"], "priority": ["priority", "severity"]},
        date_fields=["created_at", "due_date", "timestamp"],
    )
