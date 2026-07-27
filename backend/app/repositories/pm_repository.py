from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..database import get_connection
from ..utils.pagination import ListQuery, query_database_items
from .base import (
    MAINTENANCE_ALERT_WINDOW_DAYS,
    MAINTENANCE_ALERT_WINDOW_HOURS,
    Repository,
    parse_date,
)

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

    def list_query(
        self,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        base_sql = """
            SELECT pm.*, e.name AS equipment_name, e.current_hours
            FROM preventive_maintenance pm
            JOIN equipment e ON e.id = pm.equipment_id
        """
        field_map = {
            **{field: field for field in ("id", "created_at", *self.fields)},
            "equipment_name": "equipment_name",
            "current_hours": "current_hours",
            "name": "task_name",
            "asset_id": "equipment_id",
            "asset_name": "equipment_name",
        }
        return query_database_items(
            base_sql=base_sql,
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("status", "ASC"), ("next_due_date", "ASC"), ("id", "DESC")],
            row_mapper=lambda row: self._with_history(add_pm_calculations(row)),
        )

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


class PMPlanRepository(Repository):
    table = "pm_plans"
    fields = (
        "equipment_id",
        "name",
        "description",
        "priority",
        "recurrence_type",
        "interval_value",
        "start_date",
        "next_due_date",
        "next_due_runtime",
        "last_service_date",
        "last_runtime",
        "estimated_duration_minutes",
        "required_skills",
        "checklist_template",
        "planned_spare_parts",
        "status",
    )

    def __init__(self) -> None:
        self.tasks = PMPlanTaskRepository()
        self.history = PMPlanHistoryRepository()

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT
                pp.*,
                e.name AS equipment_name,
                e.customer_id,
                e.current_hours,
                c.name AS customer_name
            FROM pm_plans pp
            JOIN equipment e ON e.id = pp.equipment_id
            JOIN customers c ON c.id = e.customer_id
            ORDER BY pp.status ASC, pp.next_due_date ASC, pp.next_due_runtime ASC, pp.id DESC
        """
        with get_connection() as db:
            rows = [dict(row) for row in db.execute(query).fetchall()]
        return [self._with_tasks(row) for row in rows]

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
                pp.*,
                e.name AS equipment_name,
                e.customer_id,
                e.current_hours,
                c.name AS customer_name
            FROM pm_plans pp
            JOIN equipment e ON e.id = pp.equipment_id
            JOIN customers c ON c.id = e.customer_id
        """
        field_map = {
            **{field: field for field in ("id", "created_at", "updated_at", *self.fields)},
            "equipment_name": "equipment_name",
            "customer_id": "customer_id",
            "current_hours": "current_hours",
            "customer_name": "customer_name",
            "asset_id": "equipment_id",
            "asset_name": "equipment_name",
            "state": "status",
            "location": "customer_name",
            "site": "customer_name",
        }
        return query_database_items(
            base_sql=base_sql,
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("status", "ASC"), ("next_due_date", "ASC"), ("next_due_runtime", "ASC"), ("id", "DESC")],
            row_mapper=self._with_tasks,
        )

    def get(self, item_id: int) -> dict[str, Any]:
        query = """
            SELECT
                pp.*,
                e.name AS equipment_name,
                e.customer_id,
                e.current_hours,
                c.name AS customer_name
            FROM pm_plans pp
            JOIN equipment e ON e.id = pp.equipment_id
            JOIN customers c ON c.id = e.customer_id
            WHERE pp.id = ?
        """
        with get_connection() as db:
            row = db.execute(query, (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="PM plan not found")
            return self._with_tasks(dict(row))

    def due_candidates(self) -> list[dict[str, Any]]:
        query = """
            SELECT
                pp.*,
                e.name AS equipment_name,
                e.customer_id,
                e.current_hours,
                c.name AS customer_name
            FROM pm_plans pp
            JOIN equipment e ON e.id = pp.equipment_id
            JOIN customers c ON c.id = e.customer_id
            WHERE lower(pp.status) = 'active'
            ORDER BY pp.next_due_date ASC, pp.next_due_runtime ASC, pp.id ASC
        """
        with get_connection() as db:
            rows = [dict(row) for row in db.execute(query).fetchall()]
        return [self._with_tasks(row) for row in rows]

    def complete_cycle(self, plan_id: int, updates: dict[str, Any]) -> dict[str, Any]:
        return self.update(plan_id, updates)

    def _with_tasks(self, item: dict[str, Any]) -> dict[str, Any]:
        item["tasks"] = self.tasks.list_for_plan(item["id"])
        item["previous_records"] = self.history.list_for_plan(item["id"])
        return item


class PMPlanHistoryRepository(Repository):
    table = "pm_plan_history"
    fields = ("pm_plan_id", "equipment_id", "task_name", "service_hours", "service_date")

    def list_for_plan(self, plan_id: int) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT * FROM pm_plan_history
                WHERE pm_plan_id = ?
                ORDER BY service_hours DESC, service_date DESC, id DESC
                """,
                (plan_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def create_for_plan(self, plan: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        item = {
            "pm_plan_id": int(plan["id"]),
            "equipment_id": int(plan["equipment_id"]),
            "task_name": plan.get("name") or "PM Plan",
            "service_hours": int(payload.get("service_hours") or 0),
            "service_date": payload.get("service_date") or date.today().isoformat(),
        }
        return self.create(item)


class PMPlanTaskRepository(Repository):
    table = "pm_plan_tasks"
    fields = ("pm_plan_id", "task_name", "task_description", "sequence", "is_required")

    def list_for_plan(self, plan_id: int) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT * FROM pm_plan_tasks
                WHERE pm_plan_id = ?
                ORDER BY sequence ASC, id ASC
                """,
                (plan_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def replace_for_plan(self, plan_id: int, tasks: list[dict[str, Any]]) -> None:
        old_tasks = self.list_for_plan(plan_id)
        with get_connection() as db:
            db.execute("DELETE FROM pm_plan_tasks WHERE pm_plan_id = ?", (plan_id,))
            for index, task in enumerate(tasks, start=1):
                db.execute(
                    """
                    INSERT INTO pm_plan_tasks (
                        pm_plan_id, task_name, task_description, sequence, is_required
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        plan_id,
                        task.get("task_name", ""),
                        task.get("task_description", ""),
                        int(task.get("sequence") or index),
                        1 if task.get("is_required", True) else 0,
                    ),
                )
            db.commit()
        AuditService.log_event(
            action="UPDATE",
            module="PM Plan Tasks",
            record_id=plan_id,
            description=f"Replaced task checklist for PM Plan #{plan_id}",
            old_values={"tasks": old_tasks},
            new_values={"tasks": self.list_for_plan(plan_id)},
        )


class PMPlanWorkOrderRepository(Repository):
    table = "pm_plan_work_orders"
    fields = ("pm_plan_id", "work_order_id", "cycle_key", "status")

    def find_by_plan_cycle(self, plan_id: int, cycle_key: str) -> dict[str, Any] | None:
        with get_connection() as db:
            row = db.execute(
                "SELECT * FROM pm_plan_work_orders WHERE pm_plan_id = ? AND cycle_key = ?",
                (plan_id, cycle_key),
            ).fetchone()
            return dict(row) if row else None

    def find_by_work_order(self, work_order_id: int) -> dict[str, Any] | None:
        with get_connection() as db:
            row = db.execute(
                "SELECT * FROM pm_plan_work_orders WHERE work_order_id = ?",
                (work_order_id,),
            ).fetchone()
            return dict(row) if row else None

    def mark_completed(self, work_order_id: int) -> None:
        with get_connection() as db:
            db.execute(
                "UPDATE pm_plan_work_orders SET status = ? WHERE work_order_id = ?",
                ("completed", work_order_id),
            )
            db.commit()
