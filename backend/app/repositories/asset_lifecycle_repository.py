from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..database import get_connection, insert_row
from ..utils.pagination import ListQuery, query_database_items

class AssetLifecycleRepository:
    ASSET_RECORD_FIELDS = {
        "asset_history": {
            "id",
            "asset_id",
            "event_type",
            "event_time",
            "reference_type",
            "reference_id",
            "user_id",
            "summary",
            "details",
            "status",
            "work_order_id",
            "pm_plan_id",
            "failure_code",
            "downtime_duration_minutes",
            "parts_used",
            "technician_name",
            "category",
            "event_icon",
            "title",
            "description",
            "source_module",
            "source_record_id",
            "actor_id",
            "metadata",
            "created_at",
        },
        "asset_events": {
            "id",
            "asset_id",
            "event_type",
            "severity",
            "status",
            "due_date",
            "description",
            "source_module",
            "source_record_id",
            "created_at",
            "resolved_at",
        },
        "asset_measurements": {
            "id",
            "asset_id",
            "measurement_type",
            "value",
            "unit",
            "reading_date",
            "source_module",
            "source_record_id",
            "notes",
            "created_by_id",
            "user_name",
            "created_at",
        },
        "asset_documents": {
            "id",
            "asset_id",
            "document_type",
            "title",
            "file_name",
            "file_url",
            "description",
            "uploaded_by_id",
            "created_at",
        },
        "asset_photos": {
            "id",
            "asset_id",
            "photo_type",
            "title",
            "file_name",
            "file_url",
            "description",
            "uploaded_by_id",
            "created_at",
        },
    }

    def history(self, asset_id: int) -> list[dict[str, Any]]:
        return self._list_for_asset(
            "asset_history",
            asset_id,
            "created_at DESC, id DESC",
        )

    def timeline(self, asset_id: int) -> list[dict[str, Any]]:
        return self._list_for_asset(
            "asset_history",
            asset_id,
            "created_at ASC, id ASC",
        )

    def delete_history_entry(self, asset_id: int, entry_id: int) -> dict[str, bool]:
        with get_connection() as db:
            row = db.execute(
                "SELECT * FROM asset_history WHERE id = ? AND asset_id = ?",
                (entry_id, asset_id),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Timeline entry not found")
            old_item = dict(row)
            db.execute("DELETE FROM asset_history WHERE id = ? AND asset_id = ?", (entry_id, asset_id))
            db.commit()
        AuditService.log_event(
            action="DELETE",
            module="Asset History",
            record_id=entry_id,
            description=f"Deleted timeline entry #{entry_id} for asset #{asset_id}",
            old_values=old_item,
        )
        return {"ok": True}

    def events(self, asset_id: int) -> list[dict[str, Any]]:
        return self._list_for_asset(
            "asset_events",
            asset_id,
            "created_at DESC, id DESC",
        )

    def measurements(self, asset_id: int) -> list[dict[str, Any]]:
        return self._list_for_asset(
            "asset_measurements",
            asset_id,
            "reading_date DESC, id DESC",
        )

    def documents(self, asset_id: int) -> list[dict[str, Any]]:
        return self._list_for_asset(
            "asset_documents",
            asset_id,
            "created_at DESC, id DESC",
        )

    def photos(self, asset_id: int) -> list[dict[str, Any]]:
        return self._list_for_asset(
            "asset_photos",
            asset_id,
            "created_at DESC, id DESC",
        )

    def list_for_asset_query(
        self,
        table: str,
        asset_id: int,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
        default_sort: list[tuple[str, str]] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        fields = self.ASSET_RECORD_FIELDS.get(table)
        if fields is None:
            raise HTTPException(status_code=400, detail="Unsupported asset record table")
        return query_database_items(
            base_sql=f"SELECT * FROM {table} WHERE asset_id = ?",
            params=(asset_id,),
            query=query,
            field_map={field: field for field in fields},
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=default_sort or [("created_at", "DESC"), ("id", "DESC")],
        )

    def health(self, asset_id: int) -> dict[str, Any] | None:
        with get_connection() as db:
            row = db.execute("SELECT * FROM asset_health WHERE asset_id = ?", (asset_id,)).fetchone()
            return dict(row) if row else None

    def add_history(
        self,
        asset_id: int,
        event_type: str,
        title: str,
        description: str = "",
        source_module: str = "",
        source_record_id: str | int = "",
        actor_id: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        metadata = metadata or {}
        source = source_module or metadata.get("reference_type", "")
        source_id = str(source_record_id or metadata.get("reference_id") or "")
        work_order_id = metadata.get("work_order_id")
        if not work_order_id and source.lower().startswith("work order") and str(source_id).isdigit():
            work_order_id = int(source_id)
        item = {
            "asset_id": asset_id,
            "event_type": event_type,
            "event_time": metadata.get("event_time") or metadata.get("timestamp") or datetime.now().replace(microsecond=0).isoformat(),
            "reference_type": source,
            "reference_id": source_id,
            "user_id": metadata.get("user_id") or actor_id,
            "summary": metadata.get("summary") or title,
            "details": metadata.get("details") or description,
            "status": metadata.get("status", ""),
            "work_order_id": work_order_id,
            "pm_plan_id": metadata.get("pm_plan_id"),
            "failure_code": metadata.get("failure_code", ""),
            "downtime_duration_minutes": int(metadata.get("downtime_duration_minutes") or 0),
            "parts_used": json.dumps(metadata.get("parts_used"), ensure_ascii=False, default=str) if isinstance(metadata.get("parts_used"), (dict, list)) else metadata.get("parts_used", ""),
            "technician_name": metadata.get("technician_name", ""),
            "category": metadata.get("category", ""),
            "event_icon": metadata.get("event_icon", ""),
            "title": title,
            "description": description,
            "source_module": source_module,
            "source_record_id": str(source_record_id or ""),
            "actor_id": actor_id,
            "metadata": json.dumps(metadata or {}, ensure_ascii=False, default=str),
        }
        created = self._insert_and_get("asset_history", item)
        AuditService.log_event(
            action="CREATE",
            module="Asset History",
            record_id=created["id"],
            description=f"{title} for asset #{asset_id}",
            new_values=created,
        )
        return created

    def add_event(
        self,
        asset_id: int,
        event_type: str,
        severity: str = "info",
        status: str = "open",
        due_date: str = "",
        description: str = "",
        source_module: str = "",
        source_record_id: str | int = "",
    ) -> dict[str, Any]:
        return self._insert_and_get(
            "asset_events",
            {
                "asset_id": asset_id,
                "event_type": event_type,
                "severity": severity,
                "status": status,
                "due_date": due_date,
                "description": description,
                "source_module": source_module,
                "source_record_id": str(source_record_id or ""),
            },
        )

    def add_measurement(self, asset_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        item = {
            "asset_id": asset_id,
            "template_id": payload.get("template_id"),
            "measurement_type": payload["measurement_type"],
            "value": payload.get("value", 0),
            "unit": payload.get("unit", ""),
            "reading_date": payload.get("reading_date") or datetime.now().replace(microsecond=0).isoformat(),
            "source_module": payload.get("source_module", ""),
            "source_record_id": str(payload.get("source_record_id") or ""),
            "notes": payload.get("notes", ""),
            "measurement_table": payload.get("measurement_table", ""),
            "table_snapshot": payload.get("table_snapshot", ""),
            "created_by_id": payload.get("created_by_id"),
            "user_name": payload.get("user_name", ""),
        }
        created = self._insert_and_get("asset_measurements", item)
        self.add_history(
            asset_id,
            "Measurement",
            f"{created['measurement_type']} reading recorded",
            f"{created['value']} {created.get('unit') or ''}".strip(),
            created.get("source_module") or "Assets",
            created["id"],
        )
        return created

    def delete_measurement(self, asset_id: int, measurement_id: int) -> dict[str, bool]:
        with get_connection() as db:
            row = db.execute(
                "SELECT * FROM asset_measurements WHERE id = ? AND asset_id = ?",
                (measurement_id, asset_id),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Measurement reading not found")
            old_item = dict(row)
            db.execute("DELETE FROM asset_measurements WHERE id = ? AND asset_id = ?", (measurement_id, asset_id))
            db.commit()
        AuditService.log_event(
            action="DELETE",
            module="Asset Measurements",
            record_id=measurement_id,
            description=f"Deleted measurement reading #{measurement_id} for asset #{asset_id}",
            old_values=old_item,
        )
        return {"ok": True}

    def add_document(self, asset_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        item = {
            "asset_id": asset_id,
            "document_type": payload.get("document_type", "Manual"),
            "title": payload["title"],
            "file_name": payload.get("file_name", ""),
            "file_url": payload.get("file_url", ""),
            "description": payload.get("description", ""),
            "uploaded_by_id": payload.get("uploaded_by_id"),
        }
        created = self._insert_and_get("asset_documents", item)
        self.add_history(asset_id, "Document Uploaded", created["title"], created.get("description", ""), "Asset Documents", created["id"], created.get("uploaded_by_id"))
        return created

    def add_photo(self, asset_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        item = {
            "asset_id": asset_id,
            "photo_type": payload.get("photo_type", "Current Photo"),
            "title": payload["title"],
            "file_name": payload.get("file_name", ""),
            "file_url": payload.get("file_url", ""),
            "description": payload.get("description", ""),
            "uploaded_by_id": payload.get("uploaded_by_id"),
        }
        created = self._insert_and_get("asset_photos", item)
        self.add_history(asset_id, "Photo Uploaded", created["title"], created.get("description", ""), "Asset Photos", created["id"], created.get("uploaded_by_id"))
        return created

    def upsert_health(self, asset_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        existing = self.health(asset_id)
        data = {
            "asset_id": asset_id,
            "health_score": payload.get("health_score", 100),
            "health_status": payload.get("health_status", "Excellent"),
            "availability": payload.get("availability", 100),
            "mtbf": payload.get("mtbf", 0),
            "mttr": payload.get("mttr", 0),
            "total_downtime_hours": payload.get("total_downtime_hours", 0),
            "maintenance_cost": payload.get("maintenance_cost", 0),
            "pm_compliance": payload.get("pm_compliance", 100),
            "failure_frequency": payload.get("failure_frequency", 0),
            "open_work_orders": payload.get("open_work_orders", 0),
            "completed_pm": payload.get("completed_pm", 0),
            "upcoming_pm": payload.get("upcoming_pm", 0),
            "metadata": json.dumps(payload.get("metadata", {}), ensure_ascii=False, default=str),
        }
        if existing:
            assignments = ", ".join([f"{field} = ?" for field in data if field != "asset_id"])
            with get_connection() as db:
                db.execute(
                    f"UPDATE asset_health SET {assignments}, calculated_at = CURRENT_TIMESTAMP WHERE asset_id = ?",
                    (*[value for field, value in data.items() if field != "asset_id"], asset_id),
                )
                db.commit()
            refreshed = self.health(asset_id)
            return refreshed or data
        return self._insert_and_get("asset_health", data)

    def _list_for_asset(self, table: str, asset_id: int, order_by: str) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(
                f"SELECT * FROM {table} WHERE asset_id = ? ORDER BY {order_by}",
                (asset_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def _insert_and_get(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        data = {key: value for key, value in payload.items() if value is not None}
        with get_connection() as db:
            item_id = insert_row(db, table, data)
            db.commit()
            row = db.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
            return dict(row) if row else {"id": item_id, **data}
