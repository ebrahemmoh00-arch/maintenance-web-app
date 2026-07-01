from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import MaintenanceAlert
from ...services import EquipmentService

router = APIRouter(prefix="/maintenance-alerts", tags=["Maintenance Alerts"])
service = EquipmentService()


@router.get("", response_model=list[MaintenanceAlert])
def maintenance_alerts(_=Depends(require_permission("alerts:read"))):
    return service.alerts()
