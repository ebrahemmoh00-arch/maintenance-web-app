from fastapi import APIRouter

from ..schemas import Equipment, EquipmentCreate, EquipmentUpdate
from ..services import EquipmentService

router = APIRouter(prefix="/equipment", tags=["Equipment"])
service = EquipmentService()


@router.get("", response_model=list[Equipment])
def list_equipment():
    return service.list()


@router.get("/{equipment_id}", response_model=Equipment)
def get_equipment(equipment_id: int):
    return service.get(equipment_id)


@router.post("", response_model=Equipment, status_code=201)
def create_equipment(equipment: EquipmentCreate):
    return service.create(equipment)


@router.put("/{equipment_id}", response_model=Equipment)
def update_equipment(equipment_id: int, equipment: EquipmentUpdate):
    return service.update(equipment_id, equipment)


@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int):
    return service.delete(equipment_id)
