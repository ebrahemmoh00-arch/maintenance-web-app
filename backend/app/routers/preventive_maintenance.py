from fastapi import APIRouter

from ..schemas import (
    PreventiveMaintenance,
    PreventiveMaintenanceCreate,
    PreventiveMaintenanceHistoryUpdate,
    PreventiveMaintenanceUpdate,
)
from ..services import PreventiveMaintenanceService

router = APIRouter(prefix="/preventive-maintenance", tags=["Preventive Maintenance"])
service = PreventiveMaintenanceService()


@router.get("", response_model=list[PreventiveMaintenance])
def list_preventive_maintenance():
    return service.list()


@router.put("/history/{record_id}", response_model=PreventiveMaintenance)
def update_preventive_maintenance_history_record(record_id: int, record: PreventiveMaintenanceHistoryUpdate):
    return service.update_history_record(record_id, record)


@router.get("/{task_id}", response_model=PreventiveMaintenance)
def get_preventive_maintenance_task(task_id: int):
    return service.get(task_id)


@router.post("", response_model=PreventiveMaintenance, status_code=201)
def create_preventive_maintenance_task(task: PreventiveMaintenanceCreate):
    return service.create(task)


@router.put("/{task_id}", response_model=PreventiveMaintenance)
def update_preventive_maintenance_task(task_id: int, task: PreventiveMaintenanceUpdate):
    return service.update(task_id, task)


@router.delete("/{task_id}")
def delete_preventive_maintenance_task(task_id: int):
    return service.delete(task_id)
