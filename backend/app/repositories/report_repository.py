from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..database import get_connection, insert_row
from ..utils.pagination import ListQuery, query_database_items
from .base import Repository

class OperationalPerformanceReportRepository(Repository):
    table = "operational_performance_reports"
    fields = (
        "report_name",
        "report_type",
        "site_id",
        "site_name",
        "equipment_type",
        "asset_ids",
        "asset_names",
        "year",
        "month",
        "period_from",
        "period_to",
        "readings",
        "summary",
        "table_rows",
        "charts",
        "created_by",
    )

    def list(self) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT * FROM operational_performance_reports
                ORDER BY created_at DESC, id DESC
                """
            ).fetchall()
            return [dict(row) for row in rows]

    def list_query(
        self,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        field_map = {field: field for field in ("id", "created_at", *self.fields)}
        return query_database_items(
            base_sql="SELECT * FROM operational_performance_reports",
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("created_at", "DESC"), ("id", "DESC")],
        )


DEFAULT_OPERATIONAL_REPORT_ITEMS = [
    {"key": "runningHours", "label": "Running Hours", "unit": "h", "sort_order": 10, "is_active": 1},
    {"key": "energy", "label": "Energy", "unit": "kWh", "sort_order": 20, "is_active": 1},
    {"key": "gas", "label": "Gas", "unit": "m3", "sort_order": 30, "is_active": 1},
    {"key": "oil", "label": "Oil", "unit": "L", "sort_order": 40, "is_active": 1},
    {"key": "water", "label": "Water", "unit": "m3", "sort_order": 50, "is_active": 1},
    {"key": "steam", "label": "Steam", "unit": "t", "sort_order": 60, "is_active": 1},
    {"key": "chiller", "label": "Chiller", "unit": "h", "sort_order": 70, "is_active": 1},
]


class OperationalReportItemRepository(Repository):
    table = "operational_report_items"
    fields = ("key", "label", "unit", "sort_order", "is_active")

    def list(self) -> list[dict[str, Any]]:
        self.ensure_seeded()
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT * FROM operational_report_items
                ORDER BY sort_order ASC, id ASC
                """
            ).fetchall()
            return [dict(row) for row in rows]

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.ensure_seeded()
        data = {field: payload[field] for field in self.fields if field in payload}
        with get_connection() as db:
            self._validate_unique(db, data)
            item_id = insert_row(db, self.table, data)
            db.commit()
        created = self.get(item_id)
        AuditService.log_repository_action(self.table, "CREATE", None, created, item_id)
        return created

    def update(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        self.ensure_seeded()
        old_item = self.get(item_id)
        data = {field: payload[field] for field in self.fields if field in payload and payload[field] is not None}
        if not data:
            return old_item
        with get_connection() as db:
            self._validate_unique(db, data, item_id)
            assignments = ", ".join([f"{field} = ?" for field in data])
            assignments += ", updated_at = CURRENT_TIMESTAMP"
            db.execute(
                f"UPDATE {self.table} SET {assignments} WHERE id = ?",
                (*data.values(), item_id),
            )
            db.commit()
        updated = self.get(item_id)
        AuditService.log_repository_action(self.table, "UPDATE", old_item, updated, item_id)
        return updated

    def ensure_seeded(self) -> None:
        with get_connection() as db:
            count = db.execute("SELECT COUNT(*) AS total FROM operational_report_items").fetchone()
            if int(count["total"] if isinstance(count, dict) else count[0]) > 0:
                return
            for item in DEFAULT_OPERATIONAL_REPORT_ITEMS:
                insert_row(db, self.table, item)
            db.commit()

    def _validate_unique(self, db, data: dict[str, Any], item_id: int | None = None) -> None:
        key = str(data.get("key", "")).strip()
        label = str(data.get("label", "")).strip()
        if key:
            row = db.execute(
                "SELECT id FROM operational_report_items WHERE lower(key) = lower(?) AND id <> ?",
                (key, item_id or 0),
            ).fetchone()
            if row:
                raise HTTPException(status_code=400, detail="Operational item key already exists")
        if label:
            row = db.execute(
                "SELECT id FROM operational_report_items WHERE lower(label) = lower(?) AND id <> ?",
                (label, item_id or 0),
            ).fetchone()
            if row:
                raise HTTPException(status_code=400, detail="Operational item label already exists")
