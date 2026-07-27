from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException

from ..database import get_connection, insert_row
from ..utils.pagination import ListQuery, query_database_items
from .base import Repository

class ReliabilityCodeRepository(Repository):
    fields = ("code", "name", "description", "status")

    def __init__(self, table: str):
        self.table = table

    def list(self) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(f"SELECT * FROM {self.table} ORDER BY name ASC").fetchall()
            return [dict(row) for row in rows]


class ProblemCodeRepository(ReliabilityCodeRepository):
    def __init__(self):
        super().__init__("problem_codes")


class FailureCodeRepository(ReliabilityCodeRepository):
    def __init__(self):
        super().__init__("failure_codes")


class CauseCodeRepository(ReliabilityCodeRepository):
    def __init__(self):
        super().__init__("cause_codes")


class RemedyCodeRepository(ReliabilityCodeRepository):
    def __init__(self):
        super().__init__("remedy_codes")


class FailureEventRepository(Repository):
    table = "failure_events"
    fields = (
        "asset_id",
        "failure_id",
        "failure_datetime",
        "failure_start",
        "failure_end",
        "detection_method",
        "failure_type",
        "failure_category",
        "severity",
        "operational_impact",
        "breakdown_indicator",
        "emergency_indicator",
        "failure_description",
        "problem_code_id",
        "failure_code_id",
        "cause_code_id",
        "remedy_code_id",
        "reported_by_id",
        "assigned_technician_id",
        "linked_work_order_id",
        "linked_pm_id",
        "status",
        "rca_status",
    )

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT
                fe.*,
                e.name AS asset_name,
                wo.title AS work_order_title
            FROM failure_events fe
            JOIN equipment e ON e.id = fe.asset_id
            LEFT JOIN work_orders wo ON wo.id = fe.linked_work_order_id
            ORDER BY fe.failure_datetime DESC, fe.id DESC
        """
        with get_connection() as db:
            return [dict(row) for row in db.execute(query).fetchall()]

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
                fe.*,
                e.name AS asset_name,
                wo.title AS work_order_title
            FROM failure_events fe
            JOIN equipment e ON e.id = fe.asset_id
            LEFT JOIN work_orders wo ON wo.id = fe.linked_work_order_id
        """
        field_map = {
            **{field: field for field in ("id", "created_at", "updated_at", *self.fields)},
            "asset_name": "asset_name",
            "work_order_title": "work_order_title",
            "failure_code": "failure_id",
            "description": "failure_description",
            "priority": "severity",
            "asset": "asset_id",
            "equipment_id": "asset_id",
            "failure_date": "failure_datetime",
        }
        return query_database_items(
            base_sql=base_sql,
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("failure_datetime", "DESC"), ("id", "DESC")],
        )

    def get(self, item_id: int) -> dict[str, Any]:
        query = """
            SELECT
                fe.*,
                e.name AS asset_name,
                wo.title AS work_order_title
            FROM failure_events fe
            JOIN equipment e ON e.id = fe.asset_id
            LEFT JOIN work_orders wo ON wo.id = fe.linked_work_order_id
            WHERE fe.id = ?
        """
        with get_connection() as db:
            row = db.execute(query, (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Failure event not found")
            return dict(row)

    def list_for_asset(self, asset_id: int) -> list[dict[str, Any]]:
        return [row for row in self.list() if int(row.get("asset_id") or 0) == int(asset_id)]

    def get_by_work_order(self, work_order_id: int) -> dict[str, Any] | None:
        with get_connection() as db:
            row = db.execute("SELECT * FROM failure_events WHERE linked_work_order_id = ? ORDER BY id DESC LIMIT 1", (work_order_id,)).fetchone()
            return dict(row) if row else None


class DowntimeEventRepository(Repository):
    table = "downtime_events"
    fields = (
        "asset_id",
        "start_time",
        "end_time",
        "total_downtime_minutes",
        "planned",
        "production_lost",
        "downtime_category",
        "downtime_reason",
        "linked_failure_id",
        "linked_work_order_id",
    )

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT de.*, e.name AS asset_name
            FROM downtime_events de
            JOIN equipment e ON e.id = de.asset_id
            ORDER BY de.start_time DESC, de.id DESC
        """
        with get_connection() as db:
            return [dict(row) for row in db.execute(query).fetchall()]

    def list_query(
        self,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        base_sql = """
            SELECT de.*, e.name AS asset_name
            FROM downtime_events de
            JOIN equipment e ON e.id = de.asset_id
        """
        field_map = {
            **{field: field for field in ("id", "created_at", "updated_at", *self.fields)},
            "asset_name": "asset_name",
            "asset": "asset_id",
            "equipment_id": "asset_id",
            "reason": "downtime_reason",
            "description": "downtime_reason",
        }
        return query_database_items(
            base_sql=base_sql,
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("start_time", "DESC"), ("id", "DESC")],
        )

    def get(self, item_id: int) -> dict[str, Any]:
        query = """
            SELECT de.*, e.name AS asset_name
            FROM downtime_events de
            JOIN equipment e ON e.id = de.asset_id
            WHERE de.id = ?
        """
        with get_connection() as db:
            row = db.execute(query, (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Downtime event not found")
            return dict(row)

    def list_for_asset(self, asset_id: int) -> list[dict[str, Any]]:
        return [row for row in self.list() if int(row.get("asset_id") or 0) == int(asset_id)]

    def get_by_work_order(self, work_order_id: int) -> dict[str, Any] | None:
        with get_connection() as db:
            row = db.execute("SELECT * FROM downtime_events WHERE linked_work_order_id = ? ORDER BY id DESC LIMIT 1", (work_order_id,)).fetchone()
            return dict(row) if row else None


class RootCauseAnalysisRepository(Repository):
    table = "root_cause_analysis"
    fields = (
        "failure_event_id",
        "problem",
        "cause",
        "root_cause",
        "corrective_action",
        "preventive_action",
        "lessons_learned",
        "verification_status",
        "approval_status",
        "approved_by_id",
        "approved_at",
    )

    def get_by_failure_event(self, failure_event_id: int) -> dict[str, Any] | None:
        with get_connection() as db:
            row = db.execute("SELECT * FROM root_cause_analysis WHERE failure_event_id = ?", (failure_event_id,)).fetchone()
            return dict(row) if row else None


class CorrectiveActionRepository(Repository):
    table = "corrective_actions"
    fields = (
        "failure_event_id",
        "work_order_id",
        "repair_type",
        "temporary_repair",
        "permanent_repair",
        "parts_used",
        "labor_hours",
        "contractor",
        "repair_notes",
        "status",
    )


class FailureStatisticsRepository:
    def get(self, asset_id: int) -> dict[str, Any] | None:
        with get_connection() as db:
            row = db.execute("SELECT * FROM failure_statistics WHERE asset_id = ?", (asset_id,)).fetchone()
            return dict(row) if row else None

    def upsert(self, asset_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        data = {
            "asset_id": asset_id,
            "mtbf_hours": payload.get("mtbf_hours", 0),
            "mttr_hours": payload.get("mttr_hours", 0),
            "availability_percent": payload.get("availability_percent", 100),
            "reliability_percent": payload.get("reliability_percent", 100),
            "failure_frequency": payload.get("failure_frequency", 0),
            "total_downtime_hours": payload.get("total_downtime_hours", 0),
            "downtime_percent": payload.get("downtime_percent", 0),
            "average_repair_time_hours": payload.get("average_repair_time_hours", 0),
            "repair_cost": payload.get("repair_cost", 0),
            "downtime_cost": payload.get("downtime_cost", 0),
            "metadata": json.dumps(payload.get("metadata", {}), ensure_ascii=False, default=str),
        }
        existing = self.get(asset_id)
        if existing:
            assignments = ", ".join([f"{field} = ?" for field in data if field != "asset_id"])
            with get_connection() as db:
                db.execute(
                    f"UPDATE failure_statistics SET {assignments}, calculated_at = CURRENT_TIMESTAMP WHERE asset_id = ?",
                    (*[value for field, value in data.items() if field != "asset_id"], asset_id),
                )
                db.commit()
            return self.get(asset_id) or data
        with get_connection() as db:
            item_id = insert_row(db, "failure_statistics", data)
            db.commit()
            row = db.execute("SELECT * FROM failure_statistics WHERE id = ?", (item_id,)).fetchone()
            return dict(row) if row else {"id": item_id, **data}

    def list(self) -> list[dict[str, Any]]:
        query = """
            SELECT fs.*, e.name AS asset_name, e.asset_code, e.location, e.criticality
            FROM failure_statistics fs
            JOIN equipment e ON e.id = fs.asset_id
            ORDER BY fs.total_downtime_hours DESC, fs.failure_frequency DESC
        """
        with get_connection() as db:
            return [dict(row) for row in db.execute(query).fetchall()]
