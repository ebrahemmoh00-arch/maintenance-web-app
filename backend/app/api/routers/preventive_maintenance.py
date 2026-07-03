from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import (
    PreventiveMaintenance,
    PreventiveMaintenanceCreate,
    PreventiveMaintenanceHistoryUpdate,
    PreventiveMaintenanceUpdate,
)
from ...services import PreventiveMaintenanceService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/preventive-maintenance", tags=["Preventive Maintenance"])
service = PreventiveMaintenanceService()


@router.get("", response_model=None)
def list_preventive_maintenance(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("preventive_maintenance:read")),
):
    return query.apply(
        service.list(),
        search_fields=["name", "description", "maintenance_type", "equipment_name"],
        filter_aliases={
            "asset": ["equipment_id", "asset_id", "equipment_name"],
            "status": ["status"],
            "priority": ["priority"],
            "site": ["site", "location"],
        },
        date_fields=["created_at", "updated_at", "last_service_date", "next_due_date"],
    )


@router.put("/history/{record_id}", response_model=PreventiveMaintenance)
def update_preventive_maintenance_history_record(
    record_id: int,
    record: PreventiveMaintenanceHistoryUpdate,
    _=Depends(require_permission("preventive_maintenance:history_update")),
):
    return service.update_history_record(record_id, record)


@router.get("/{task_id}", response_model=PreventiveMaintenance)
def get_preventive_maintenance_task(task_id: int, _=Depends(require_permission("preventive_maintenance:read"))):
    return service.get(task_id)


@router.post("", response_model=PreventiveMaintenance, status_code=201)
def create_preventive_maintenance_task(task: PreventiveMaintenanceCreate, _=Depends(require_permission("preventive_maintenance:create"))):
    return service.create(task)


@router.put("/{task_id}", response_model=PreventiveMaintenance)
def update_preventive_maintenance_task(task_id: int, task: PreventiveMaintenanceUpdate, _=Depends(require_permission("preventive_maintenance:update"))):
    return service.update(task_id, task)


@router.delete("/{task_id}")
def delete_preventive_maintenance_task(task_id: int, _=Depends(require_permission("preventive_maintenance:delete"))):
    return service.delete(task_id)
