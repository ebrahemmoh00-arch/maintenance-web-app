from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import Equipment, EquipmentCreate, EquipmentUpdate
from ...services import EquipmentService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/equipment", tags=["Equipment"])
service = EquipmentService()


@router.get("", response_model=None)
def list_equipment(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(
        service.list(),
        search_fields=["name", "asset_code", "serial_number", "category", "site", "department"],
        filter_aliases={
            "asset": ["id", "name", "asset_code"],
            "site": ["site", "location"],
            "department": ["department"],
            "status": ["status"],
        },
        date_fields=["created_at", "updated_at", "commission_date", "installation_date"],
    )


@router.get("/{equipment_id}", response_model=Equipment)
def get_equipment(equipment_id: int, _=Depends(require_permission("assets:read"))):
    return service.get(equipment_id)


@router.post("", response_model=Equipment, status_code=201)
def create_equipment(equipment: EquipmentCreate, _=Depends(require_permission("assets:create"))):
    return service.create(equipment)


@router.put("/{equipment_id}", response_model=Equipment)
def update_equipment(equipment_id: int, equipment: EquipmentUpdate, _=Depends(require_permission("assets:update"))):
    return service.update(equipment_id, equipment)


@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int, _=Depends(require_permission("assets:delete"))):
    return service.delete(equipment_id)
