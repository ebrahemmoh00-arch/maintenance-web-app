from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..database import get_connection
from ..utils.pagination import ListQuery, query_database_items
from .base import Repository

def inventory_status(item: dict[str, Any]) -> dict[str, Any]:
    result = dict(item)
    quantity = int(result.get("stock_quantity") or 0)
    minimum = int(result.get("minimum_quantity") or 0)
    if quantity <= 0:
        result["stock_alert"] = "OUT OF STOCK"
    elif quantity <= minimum:
        result["stock_alert"] = "LOW STOCK"
    else:
        result["stock_alert"] = "OK"
    return result


class InventoryRepository(Repository):
    table = "inventory_items"
    fields = (
        "part_number",
        "name",
        "category",
        "stock_quantity",
        "minimum_quantity",
        "unit",
        "location",
        "linked_work_order_id",
    )

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT ii.*, wo.title AS linked_work_order_title
            FROM inventory_items ii
            LEFT JOIN work_orders wo ON wo.id = ii.linked_work_order_id
            ORDER BY ii.stock_quantity ASC, ii.name ASC
        """
        with get_connection() as db:
            return [inventory_status(dict(row)) for row in db.execute(query).fetchall()]

    def list_query(
        self,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        base_sql = """
            SELECT
                ii.*,
                wo.title AS linked_work_order_title,
                CASE
                    WHEN ii.stock_quantity <= 0 THEN 'OUT OF STOCK'
                    WHEN ii.stock_quantity <= ii.minimum_quantity THEN 'LOW STOCK'
                    ELSE 'OK'
                END AS stock_alert
            FROM inventory_items ii
            LEFT JOIN work_orders wo ON wo.id = ii.linked_work_order_id
        """
        field_map = {
            **{field: field for field in ("id", "created_at", *self.fields)},
            "linked_work_order_title": "linked_work_order_title",
            "stock_alert": "stock_alert",
            "status": "stock_alert",
            "warehouse": "location",
            "site": "location",
        }
        return query_database_items(
            base_sql=base_sql,
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("stock_quantity", "ASC"), ("name", "ASC")],
            row_mapper=inventory_status,
        )

    def get(self, item_id: int) -> dict[str, Any]:
        query = """
            SELECT ii.*, wo.title AS linked_work_order_title
            FROM inventory_items ii
            LEFT JOIN work_orders wo ON wo.id = ii.linked_work_order_id
            WHERE ii.id = ?
        """
        with get_connection() as db:
            row = db.execute(query, (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Inventory item not found")
            return inventory_status(dict(row))
