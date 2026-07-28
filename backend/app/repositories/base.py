from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..database import get_connection, insert_row
from ..utils.pagination import ListQuery, query_database_items

MAINTENANCE_ALERT_WINDOW_DAYS = 7
MAINTENANCE_ALERT_WINDOW_HOURS = 100


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    for pattern in ("%Y-%m-%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, pattern).date()
        except ValueError:
            continue
    return None


def add_maintenance_calculations(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    interval_days = int(item.get("maintenance_interval_days") or 0)
    interval_hours = int(item.get("maintenance_interval_hours") or 0)
    current_hours = int(item.get("current_hours") or 0)
    last_date = parse_date(item.get("last_maintenance_date"))

    next_date = last_date + timedelta(days=interval_days) if last_date and interval_days else None
    days_until = (next_date - date.today()).days if next_date else None
    hours_until = interval_hours - current_hours if interval_hours else None

    due_by_date = days_until is not None and days_until <= 0
    due_by_hours = hours_until is not None and hours_until <= 0
    upcoming_by_date = days_until is not None and 0 < days_until <= MAINTENANCE_ALERT_WINDOW_DAYS
    upcoming_by_hours = hours_until is not None and 0 < hours_until <= MAINTENANCE_ALERT_WINDOW_HOURS

    if due_by_date or due_by_hours:
        alert = "DUE NOW"
    elif upcoming_by_date or upcoming_by_hours:
        alert = "UPCOMING"
    else:
        alert = "OK"

    item["next_maintenance_date"] = next_date.isoformat() if next_date else None
    item["days_until_maintenance"] = days_until
    item["hours_until_maintenance"] = hours_until
    item["maintenance_due"] = alert == "DUE NOW"
    item["maintenance_alert"] = alert
    return item


class Repository:
    table: str
    fields: tuple[str, ...]

    def list(self) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(f"SELECT * FROM {self.table} ORDER BY id DESC").fetchall()
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
            base_sql=f"SELECT * FROM {self.table}",
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("id", "DESC")],
        )

    def get(self, item_id: int) -> dict[str, Any]:
        with get_connection() as db:
            row = db.execute(f"SELECT * FROM {self.table} WHERE id = ?", (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"{self.table[:-1].title()} not found")
            return dict(row)

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        data = {field: payload[field] for field in self.fields if field in payload}
        with get_connection() as db:
            item_id = insert_row(db, self.table, data)
            db.commit()
        created = self.get(item_id)
        AuditService.log_repository_action(self.table, "CREATE", None, created, item_id)
        return created

    def update(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        old_item = self.get(item_id)
        data = {field: payload[field] for field in self.fields if field in payload and payload[field] is not None}
        if not data:
            return self.get(item_id)
        assignments = ", ".join([f"{field} = ?" for field in data])
        if self.table in {"work_orders", "pm_plans", "failure_events", "downtime_events", "root_cause_analysis", "corrective_actions"}:
            assignments += ", updated_at = CURRENT_TIMESTAMP"
        with get_connection() as db:
            db.execute(
                f"UPDATE {self.table} SET {assignments} WHERE id = ?",
                (*data.values(), item_id),
            )
            db.commit()
        updated = self.get(item_id)
        AuditService.log_repository_action(self.table, "UPDATE", old_item, {**updated, **({"password": payload["password"]} if "password" in payload else {})}, item_id)
        return updated

    def delete(self, item_id: int) -> dict[str, bool]:
        old_item = self.get(item_id)
        with get_connection() as db:
            db.execute(f"DELETE FROM {self.table} WHERE id = ?", (item_id,))
            db.commit()
        AuditService.log_repository_action(self.table, "DELETE", old_item, None, item_id)
        return {"ok": True}
