from __future__ import annotations

from datetime import datetime
from typing import Any

from ..core.audit import AuditService
from ..database import get_connection
from .base import Repository

class MeasurementTemplateRepository(Repository):
    table = "measurement_templates"
    fields = (
        "asset_id",
        "name",
        "description",
        "category",
        "unit",
        "table_schema",
        "guidance_title",
        "guidance_file_name",
        "guidance_file_url",
        "guidance_notes",
        "ideal_values",
        "created_by_id",
        "status",
    )

    def list(self, asset_id: int | None = None) -> list[dict[str, Any]]:
        with get_connection() as db:
            if asset_id is None:
                rows = db.execute("SELECT * FROM measurement_templates ORDER BY name COLLATE NOCASE ASC").fetchall()
            else:
                rows = db.execute(
                    "SELECT * FROM measurement_templates WHERE asset_id = ? ORDER BY name COLLATE NOCASE ASC",
                    (asset_id,),
                ).fetchall()
            return [dict(row) for row in rows]

    def find_by_name(self, name: str, asset_id: int | None = None) -> dict[str, Any] | None:
        with get_connection() as db:
            if asset_id is None:
                row = db.execute(
                    "SELECT * FROM measurement_templates WHERE lower(name) = lower(?) AND asset_id IS NULL",
                    (name,),
                ).fetchone()
            else:
                row = db.execute(
                    "SELECT * FROM measurement_templates WHERE lower(name) = lower(?) AND asset_id = ?",
                    (name, asset_id),
                ).fetchone()
            return dict(row) if row else None

    def update(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        payload = {**payload, "updated_at": datetime.now().replace(microsecond=0).isoformat()}
        fields = self.fields + ("updated_at",)
        old_item = self.get(item_id)
        data = {field: payload[field] for field in fields if field in payload and payload[field] is not None}
        if not data:
            return self.get(item_id)
        assignments = ", ".join([f"{field} = ?" for field in data])
        with get_connection() as db:
            db.execute(
                f"UPDATE {self.table} SET {assignments} WHERE id = ?",
                (*data.values(), item_id),
            )
            db.commit()
        updated = self.get(item_id)
        AuditService.log_repository_action(self.table, "UPDATE", old_item, updated, item_id)
        return updated
