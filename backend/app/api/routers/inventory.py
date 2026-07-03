from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import InventoryItem, InventoryItemCreate, InventoryItemUpdate
from ...services import InventoryService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/inventory", tags=["Inventory"])
service = InventoryService()


@router.get("", response_model=None)
def list_inventory(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("inventory:read")),
):
    return query.apply(
        service.list(),
        search_fields=["name", "part_number", "category", "warehouse", "supplier"],
        filter_aliases={"status": ["status"], "site": ["site", "warehouse"], "asset": ["asset_id", "asset_name"]},
        date_fields=["created_at", "updated_at"],
    )


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
