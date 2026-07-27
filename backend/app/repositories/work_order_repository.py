from __future__ import annotations

import json
from datetime import date
from typing import Any

from fastapi import HTTPException

from ..database import get_connection, insert_row
from ..utils.pagination import ListQuery, query_database_items
from .base import Repository

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
        "assigned_by_id",
        "assigned_at",
        "accepted_at",
        "started_at",
        "paused_at",
        "resumed_at",
        "completed_at",
        "approved_by_id",
        "approved_at",
        "closed_at",
        "cancelled_at",
        "rejected_at",
        "hold_reason",
        "waiting_parts_reason",
        "runtime_reading_start",
        "runtime_reading_end",
        "technician_notes",
        "completion_notes",
        "supervisor_notes",
        "checklist_completed",
        "work_duration_minutes",
    )

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT
                wo.*,
                c.name AS customer_name,
                e.name AS equipment_name,
                eng.name AS engineer_name,
                assigned_by.name AS assigned_by_name,
                approved_by.name AS approved_by_name
            FROM work_orders wo
            JOIN customers c ON c.id = wo.customer_id
            JOIN equipment e ON e.id = wo.equipment_id
            JOIN engineers eng ON eng.id = wo.engineer_id
            LEFT JOIN engineers assigned_by ON assigned_by.id = wo.assigned_by_id
            LEFT JOIN engineers approved_by ON approved_by.id = wo.approved_by_id
            ORDER BY wo.scheduled_date DESC, wo.id DESC
        """
        with get_connection() as db:
            return [self._with_lifecycle(dict(row)) for row in db.execute(query).fetchall()]

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
                wo.*,
                c.name AS customer_name,
                e.name AS equipment_name,
                eng.name AS engineer_name,
                assigned_by.name AS assigned_by_name,
                approved_by.name AS approved_by_name
            FROM work_orders wo
            JOIN customers c ON c.id = wo.customer_id
            JOIN equipment e ON e.id = wo.equipment_id
            JOIN engineers eng ON eng.id = wo.engineer_id
            LEFT JOIN engineers assigned_by ON assigned_by.id = wo.assigned_by_id
            LEFT JOIN engineers approved_by ON approved_by.id = wo.approved_by_id
        """
        field_map = {
            **{field: field for field in ("id", "created_at", "updated_at", *self.fields)},
            "customer_name": "customer_name",
            "equipment_name": "equipment_name",
            "engineer_name": "engineer_name",
            "assigned_by_name": "assigned_by_name",
            "approved_by_name": "approved_by_name",
            "asset_id": "equipment_id",
            "asset_name": "equipment_name",
            "assigned_to": "engineer_name",
            "technician_name": "engineer_name",
        }
        return query_database_items(
            base_sql=base_sql,
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("scheduled_date", "DESC"), ("id", "DESC")],
            row_mapper=self._with_lifecycle,
        )

    def get(self, item_id: int) -> dict[str, Any]:
        query = """
            SELECT
                wo.*,
                c.name AS customer_name,
                e.name AS equipment_name,
                eng.name AS engineer_name,
                assigned_by.name AS assigned_by_name,
                approved_by.name AS approved_by_name
            FROM work_orders wo
            JOIN customers c ON c.id = wo.customer_id
            JOIN equipment e ON e.id = wo.equipment_id
            JOIN engineers eng ON eng.id = wo.engineer_id
            LEFT JOIN engineers assigned_by ON assigned_by.id = wo.assigned_by_id
            LEFT JOIN engineers approved_by ON approved_by.id = wo.approved_by_id
            WHERE wo.id = ?
        """
        with get_connection() as db:
            row = db.execute(query, (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Work order not found")
            return self._with_lifecycle(dict(row))

    def dashboard_stats(self) -> dict[str, int]:
        with get_connection() as db:
            row = db.execute(
                """
                SELECT
                    COUNT(*) AS total_orders,
                    SUM(CASE WHEN status NOT IN ('completed', 'closed', 'cancelled', 'rejected') THEN 1 ELSE 0 END) AS pending_orders,
                    SUM(CASE WHEN status IN ('completed', 'closed', 'approved') THEN 1 ELSE 0 END) AS completed_orders,
                    SUM(CASE WHEN status IN ('new', 'pending') THEN 1 ELSE 0 END) AS new_orders,
                    SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned_orders,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_orders,
                    SUM(CASE WHEN status = 'waiting_for_parts' THEN 1 ELSE 0 END) AS waiting_parts_orders,
                    SUM(CASE WHEN status = 'pending_supervisor_review' THEN 1 ELSE 0 END) AS pending_review_orders,
                    SUM(CASE WHEN closed_at LIKE ? THEN 1 ELSE 0 END) AS closed_today,
                    SUM(CASE WHEN due_date != '' AND due_date < ? AND status NOT IN ('closed', 'cancelled', 'rejected') THEN 1 ELSE 0 END) AS overdue_orders,
                    AVG(CASE WHEN work_duration_minutes > 0 THEN work_duration_minutes ELSE NULL END) AS average_completion_time_minutes
                FROM work_orders
                """,
                (f"{date.today().isoformat()}%", date.today().isoformat()),
            ).fetchone()
            return {
                "total_orders": row["total_orders"] or 0,
                "pending_orders": row["pending_orders"] or 0,
                "completed_orders": row["completed_orders"] or 0,
                "new_orders": row["new_orders"] or 0,
                "assigned_orders": row["assigned_orders"] or 0,
                "in_progress_orders": row["in_progress_orders"] or 0,
                "waiting_parts_orders": row["waiting_parts_orders"] or 0,
                "pending_review_orders": row["pending_review_orders"] or 0,
                "closed_today": row["closed_today"] or 0,
                "overdue_orders": row["overdue_orders"] or 0,
                "average_completion_time_minutes": int(row["average_completion_time_minutes"] or 0),
            }

    def schedule(self) -> list[dict[str, Any]]:
        return self.list()

    def timeline(self, work_order_id: int) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT * FROM work_order_timeline
                WHERE work_order_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (work_order_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def approvals(self, work_order_id: int) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT * FROM work_order_approvals
                WHERE work_order_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (work_order_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_timeline(
        self,
        work_order_id: int,
        event_type: str,
        from_status: str = "",
        to_status: str = "",
        actor_id: int | None = None,
        actor_name: str = "",
        description: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "work_order_id": work_order_id,
            "event_type": event_type,
            "from_status": from_status,
            "to_status": to_status,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "description": description,
            "metadata": json.dumps(metadata or {}, ensure_ascii=False, default=str),
        }
        with get_connection() as db:
            item_id = insert_row(db, "work_order_timeline", payload)
            db.commit()
        return self.timeline(work_order_id)[-1] if item_id else payload

    def add_status_history(self, work_order_id: int, from_status: str, to_status: str, changed_by_id: int | None = None, reason: str = "") -> None:
        with get_connection() as db:
            db.execute(
                """
                INSERT INTO work_order_status_history (
                    work_order_id, from_status, to_status, changed_by_id, reason
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (work_order_id, from_status, to_status, changed_by_id, reason),
            )
            db.commit()

    def add_assignment_history(self, work_order_id: int, engineer_id: int, assigned_by_id: int | None = None, notes: str = "") -> None:
        with get_connection() as db:
            db.execute(
                """
                INSERT INTO work_order_assignment_history (
                    work_order_id, engineer_id, assigned_by_id, notes
                ) VALUES (?, ?, ?, ?)
                """,
                (work_order_id, engineer_id, assigned_by_id, notes),
            )
            db.commit()

    def add_approval(self, work_order_id: int, supervisor_id: int | None, action: str, notes: str = "") -> dict[str, Any]:
        with get_connection() as db:
            approval_id = insert_row(
                db,
                "work_order_approvals",
                {
                    "work_order_id": work_order_id,
                    "supervisor_id": supervisor_id,
                    "action": action,
                    "notes": notes,
                },
            )
            db.commit()
            row = db.execute("SELECT * FROM work_order_approvals WHERE id = ?", (approval_id,)).fetchone()
            return dict(row) if row else {}

    def _with_lifecycle(self, item: dict[str, Any]) -> dict[str, Any]:
        item["timeline"] = self.timeline(int(item["id"]))
        item["approvals"] = self.approvals(int(item["id"]))
        item["checklist_completed"] = bool(item.get("checklist_completed"))
        return item
