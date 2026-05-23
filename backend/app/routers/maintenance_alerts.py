from fastapi import APIRouter

from ..schemas import MaintenanceAlert
from ..services import EquipmentService

router = APIRouter(prefix="/maintenance-alerts", tags=["Maintenance Alerts"])
service = EquipmentService()


@router.get("", response_model=list[MaintenanceAlert])
def maintenance_alerts():
    return service.alerts()
