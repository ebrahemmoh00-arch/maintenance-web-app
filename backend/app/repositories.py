from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from .audit import AuditService
from .database import get_connection, insert_row

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
        if self.table == "work_orders":
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


class CustomerRepository(Repository):
    table = "customers"
    fields = ("name", "contact_person", "email", "phone", "address")


class EngineerRepository(Repository):
    table = "engineers"
    fields = (
        "employee_code",
        "name",
        "email",
        "phone",
        "specialty",
        "job_title",
        "department",
        "work_location",
        "supervisor",
        "username",
        "password",
        "role",
        "permissions",
        "status",
    )


class JobTitleRepository(Repository):
    table = "job_titles"
    fields = ("name",)

    def list(self) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute("SELECT * FROM job_titles ORDER BY name COLLATE NOCASE ASC").fetchall()
            return [dict(row) for row in rows]

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        name = str(payload.get("name", "")).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Job title name is required")
        with get_connection() as db:
            existing = db.execute("SELECT * FROM job_titles WHERE lower(name) = lower(?)", (name,)).fetchone()
            if existing:
                return dict(existing)
            item_id = insert_row(db, "job_titles", {"name": name})
            db.commit()
        created = self.get(item_id)
        AuditService.log_repository_action(self.table, "CREATE", None, created, item_id)
        return created


class EquipmentRepository(Repository):
    table = "equipment"
    fields = (
        "customer_id",
        "name",
        "serial_number",
        "model",
        "location",
        "parent_id",
        "asset_type",
        "asset_level",
        "asset_code",
        "criticality",
        "maintenance_interval_hours",
        "maintenance_interval_days",
        "current_hours",
        "last_maintenance_date",
        "status",
    )

    def list(self) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(f"SELECT * FROM {self.table} ORDER BY id DESC").fetchall()
            return [add_maintenance_calculations(dict(row)) for row in rows]

    def get(self, item_id: int) -> dict[str, Any]:
        with get_connection() as db:
            row = db.execute(f"SELECT * FROM {self.table} WHERE id = ?", (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Equipment not found")
            return add_maintenance_calculations(dict(row))

    def children(self, item_id: int) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(f"SELECT * FROM {self.table} WHERE parent_id = ? ORDER BY name ASC", (item_id,)).fetchall()
            return [add_maintenance_calculations(dict(row)) for row in rows]

    def maintenance_alerts(self) -> list[dict[str, Any]]:
        alerts = []
        for item in self.list():
            if item["maintenance_alert"] == "OK":
                continue
            reasons = []
            if item["hours_until_maintenance"] is not None and item["hours_until_maintenance"] <= 0:
                reasons.append("service hours reached the maintenance interval")
            elif item["hours_until_maintenance"] is not None and item["hours_until_maintenance"] <= MAINTENANCE_ALERT_WINDOW_HOURS:
                reasons.append(f"{item['hours_until_maintenance']} service hours remaining")
            if item["days_until_maintenance"] is not None and item["days_until_maintenance"] <= 0:
                reasons.append("scheduled maintenance date is due")
            elif item["days_until_maintenance"] is not None and item["days_until_maintenance"] <= MAINTENANCE_ALERT_WINDOW_DAYS:
                reasons.append(f"{item['days_until_maintenance']} days remaining")
            alerts.append(
                {
                    "equipment_id": item["id"],
                    "equipment_name": item["name"],
                    "serial_number": item["serial_number"],
                    "location": item["location"],
                    "alert_level": item["maintenance_alert"],
                    "reason": "; ".join(reasons) or "maintenance threshold is approaching",
                    "next_maintenance_date": item["next_maintenance_date"],
                    "days_until_maintenance": item["days_until_maintenance"],
                    "hours_until_maintenance": item["hours_until_maintenance"],
                }
            )
        return alerts


class WorkOrderRepository(Repository):
    table = "work_orders"
    fields = (
        "title",
        "description",
        "customer_id",
        "equipment_id",
        "engineer_id",
        "scheduled_date",
        "due_date",
        "status",
        "priority",
        "service_hours",
        "notes",
    )

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT
                wo.*,
                c.name AS customer_name,
                e.name AS equipment_name,
                eng.name AS engineer_name
            FROM work_orders wo
            JOIN customers c ON c.id = wo.customer_id
            JOIN equipment e ON e.id = wo.equipment_id
            JOIN engineers eng ON eng.id = wo.engineer_id
            ORDER BY wo.scheduled_date DESC, wo.id DESC
        """
        with get_connection() as db:
            return [dict(row) for row in db.execute(query).fetchall()]

    def get(self, item_id: int) -> dict[str, Any]:
        query = """
            SELECT
                wo.*,
                c.name AS customer_name,
                e.name AS equipment_name,
                eng.name AS engineer_name
            FROM work_orders wo
            JOIN customers c ON c.id = wo.customer_id
            JOIN equipment e ON e.id = wo.equipment_id
            JOIN engineers eng ON eng.id = wo.engineer_id
            WHERE wo.id = ?
        """
        with get_connection() as db:
            row = db.execute(query, (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Work order not found")
            return dict(row)

    def dashboard_stats(self) -> dict[str, int]:
        with get_connection() as db:
            row = db.execute(
                """
                SELECT
                    COUNT(*) AS total_orders,
                    SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END) AS pending_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders
                FROM work_orders
                """
            ).fetchone()
            return {
                "total_orders": row["total_orders"] or 0,
                "pending_orders": row["pending_orders"] or 0,
                "completed_orders": row["completed_orders"] or 0,
            }

    def schedule(self) -> list[dict[str, Any]]:
        return self.list()


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


def add_pm_calculations(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    current_hours = int(item.get("current_hours") or 0)
    interval_hours = int(item.get("interval_hours") or 0)
    last_service_hours = int(item.get("last_service_hours") or 0)
    hours_until_due = last_service_hours + interval_hours - current_hours if interval_hours else None
    due_date = parse_date(item.get("next_due_date"))
    if not due_date:
        last_date = parse_date(item.get("last_service_date"))
        interval_days = int(item.get("interval_days") or 0)
        due_date = last_date + timedelta(days=interval_days) if last_date and interval_days else None
    days_until_due = (due_date - date.today()).days if due_date else None

    due_by_hours = hours_until_due is not None and hours_until_due <= 0
    upcoming_by_hours = hours_until_due is not None and 0 < hours_until_due <= MAINTENANCE_ALERT_WINDOW_HOURS
    due_by_date = days_until_due is not None and days_until_due <= 0
    upcoming_by_date = days_until_due is not None and 0 < days_until_due <= MAINTENANCE_ALERT_WINDOW_DAYS

    if due_by_hours or due_by_date:
        alert = "DUE NOW"
    elif upcoming_by_hours or upcoming_by_date:
        alert = "UPCOMING"
    else:
        alert = "OK"

    item["next_due_date"] = due_date.isoformat() if due_date else item.get("next_due_date") or ""
    item["hours_until_due"] = hours_until_due
    item["days_until_due"] = days_until_due
    item["pm_alert"] = alert
    return item


class PreventiveMaintenanceRepository(Repository):
    table = "preventive_maintenance"
    fields = (
        "equipment_id",
        "task_name",
        "interval_hours",
        "interval_days",
        "last_service_hours",
        "last_service_date",
        "next_due_date",
        "status",
    )

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        created = super().create(payload)
        self._record_history_if_needed(created["id"], payload)
        return self.get(created["id"])

    def update(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        updated = super().update(item_id, payload)
        if "last_service_hours" in payload:
            self._record_history_if_needed(item_id, updated)
        return self.get(item_id)

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT pm.*, e.name AS equipment_name, e.current_hours
            FROM preventive_maintenance pm
            JOIN equipment e ON e.id = pm.equipment_id
            ORDER BY pm.status ASC, pm.next_due_date ASC, pm.id DESC
        """
        with get_connection() as db:
            return [self._with_history(add_pm_calculations(dict(row))) for row in db.execute(query).fetchall()]

    def get(self, item_id: int) -> dict[str, Any]:
        query = """
            SELECT pm.*, e.name AS equipment_name, e.current_hours
            FROM preventive_maintenance pm
            JOIN equipment e ON e.id = pm.equipment_id
            WHERE pm.id = ?
        """
        with get_connection() as db:
            row = db.execute(query, (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Preventive maintenance task not found")
            return self._with_history(add_pm_calculations(dict(row)))

    def _record_history_if_needed(self, item_id: int, payload: dict[str, Any]) -> None:
        service_hours = int(payload.get("last_service_hours") or 0)
        if service_hours <= 0:
            return
        task = super().get(item_id)
        service_date = payload.get("last_service_date") or date.today().isoformat()
        with get_connection() as db:
            existing = db.execute(
                """
                SELECT id FROM preventive_maintenance_history
                WHERE pm_task_id = ? AND service_hours = ? AND service_date = ?
                """,
                (item_id, service_hours, service_date),
            ).fetchone()
            if existing:
                return
            db.execute(
                """
                INSERT INTO preventive_maintenance_history (
                    pm_task_id, equipment_id, task_name, service_hours, service_date
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (item_id, task["equipment_id"], task["task_name"], service_hours, service_date),
            )
            db.commit()

    def _history(self, item_id: int) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT * FROM preventive_maintenance_history
                WHERE pm_task_id = ?
                ORDER BY service_hours DESC, service_date DESC, id DESC
                """,
                (item_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def update_history_record(self, record_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        allowed: dict[str, Any] = {}
        if "service_hours" in payload and payload["service_hours"] is not None:
            allowed["service_hours"] = int(payload["service_hours"])
        if "service_date" in payload and payload["service_date"] is not None:
            allowed["service_date"] = payload["service_date"]

        with get_connection() as db:
            row = db.execute(
                "SELECT * FROM preventive_maintenance_history WHERE id = ?",
                (record_id,),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Preventive maintenance history record not found")
            record = dict(row)
            if allowed:
                assignments = ", ".join([f"{field} = ?" for field in allowed])
                db.execute(
                    f"UPDATE preventive_maintenance_history SET {assignments} WHERE id = ?",
                    (*allowed.values(), record_id),
                )
                db.commit()
            updated_task = self.get(record["pm_task_id"])
            updated_record = next((item for item in updated_task.get("previous_records", []) if int(item["id"]) == int(record_id)), record)
            AuditService.log_event(
                action="UPDATE",
                module="Preventive Maintenance",
                record_id=record_id,
                description=f"Updated previous maintenance record #{record_id}",
                old_values=record,
                new_values=updated_record,
            )
            return updated_task

    def _with_history(self, item: dict[str, Any]) -> dict[str, Any]:
        item["previous_records"] = self._history(item["id"])
        return item
