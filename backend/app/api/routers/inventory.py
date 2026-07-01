from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import InventoryItem, InventoryItemCreate, InventoryItemUpdate
from ...services import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])
service = InventoryService()


@router.get("", response_model=list[InventoryItem])
def list_inventory(_=Depends(require_permission("inventory:read"))):
    return service.list()


@router.get("/{item_id}", response_model=InventoryItem)
def get_inventory_item(item_id: int, _=Depends(require_permission("inventory:read"))):
    return service.get(item_id)


@router.post("", response_model=InventoryItem, status_code=201)
def create_inventory_item(item: InventoryItemCreate, _=Depends(require_permission("inventory:create"))):
    return service.create(item)


@router.put("/{item_id}", response_model=InventoryItem)
def update_inventory_item(item_id: int, item: InventoryItemUpdate, _=Depends(require_permission("inventory:update"))):
    return service.update(item_id, item)


@router.delete("/{item_id}")
def delete_inventory_item(item_id: int, _=Depends(require_permission("inventory:delete"))):
    return service.delete(item_id)
