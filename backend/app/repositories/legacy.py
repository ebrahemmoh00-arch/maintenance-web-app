from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..database import get_connection, insert_row

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
        "description",
        "category",
        "manufacturer",
        "location",
        "parent_id",
        "asset_type",
        "asset_level",
        "asset_code",
        "qr_code",
        "barcode",
        "criticality",
        "site",
        "department",
        "commission_date",
        "installation_date",
        "warranty_start",
        "warranty_end",
        "expected_life_years",
        "replacement_cost",
        "current_condition",
        "maintenance_interval_hours",
        "maintenance_interval_days",
        "current_hours",
        "last_reading",
        "current_reading",
        "last_pm_date",
        "next_pm_date",
        "last_breakdown_date",
        "last_repair_date",
        "purchase_cost",
        "total_maintenance_cost",
        "spare_parts_cost",
        "labor_cost",
        "contractor_cost",
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


class AssetLifecycleRepository:
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
        item = {
            "asset_id": asset_id,
            "event_type": event_type,
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
            "measurement_type": payload["measurement_type"],
            "value": payload["value"],
            "unit": payload.get("unit", ""),
            "reading_date": payload.get("reading_date") or datetime.now().replace(microsecond=0).isoformat(),
            "source_module": payload.get("source_module", ""),
            "source_record_id": str(payload.get("source_record_id") or ""),
            "notes": payload.get("notes", ""),
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
        return item


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
