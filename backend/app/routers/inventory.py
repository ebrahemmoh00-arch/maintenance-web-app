from fastapi import APIRouter

from ..schemas import InventoryItem, InventoryItemCreate, InventoryItemUpdate
from ..services import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])
service = InventoryService()


@router.get("", response_model=list[InventoryItem])
def list_inventory():
    return service.list()


@router.get("/{item_id}", response_model=InventoryItem)
def get_inventory_item(item_id: int):
    return service.get(item_id)


@router.post("", response_model=InventoryItem, status_code=201)
def create_inventory_item(item: InventoryItemCreate):
    return service.create(item)


@router.put("/{item_id}", response_model=InventoryItem)
def update_inventory_item(item_id: int, item: InventoryItemUpdate):
    return service.update(item_id, item)


@router.delete("/{item_id}")
def delete_inventory_item(item_id: int):
    return service.delete(item_id)
