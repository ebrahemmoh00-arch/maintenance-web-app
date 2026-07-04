from __future__ import annotations

import json
import math
from datetime import date, datetime
from typing import Any

from fastapi import HTTPException

from ..database import get_connection
from ..repositories import EquipmentRepository


EVENT_PRESENTATION = {
    "asset created": {"category": "Asset", "icon": "box"},
    "asset updated": {"category": "Asset", "icon": "edit"},
    "preventive maintenance": {"category": "PM", "icon": "calendar-check"},
    "pm completed": {"category": "PM", "icon": "calendar-check"},
    "corrective maintenance": {"category": "CM", "icon": "wrench"},
    "inspection": {"category": "Inspection", "icon": "clipboard-check"},
    "work order created": {"category": "Work Order", "icon": "file-plus"},
    "work order assigned": {"category": "Work Order", "icon": "user-check"},
    "work started": {"category": "Work Order", "icon": "play"},
    "work completed": {"category": "Work Order", "icon": "check-circle"},
    "work approved": {"category": "Work Order", "icon": "shield-check"},
    "work order closed": {"category": "Work Order", "icon": "lock"},
    "failure recorded": {"category": "Failure", "icon": "alert-triangle"},
    "failure": {"category": "Failure", "icon": "alert-triangle"},
    "downtime started": {"category": "Downtime", "icon": "pause-circle"},
    "downtime ended": {"category": "Downtime", "icon": "play-circle"},
    "downtime": {"category": "Downtime", "icon": "clock"},
    "spare parts issued": {"category": "Inventory", "icon": "package-minus"},
    "spare parts returned": {"category": "Inventory", "icon": "package-plus"},
    "meter reading": {"category": "Meter", "icon": "gauge"},
    "measurement": {"category": "Meter", "icon": "gauge"},
    "photo added": {"category": "Attachment", "icon": "image"},
    "photo uploaded": {"category": "Attachment", "icon": "image"},
    "document uploaded": {"category": "Attachment", "icon": "file-text"},
    "comment added": {"category": "Comment", "icon": "message-square"},
    "status changed": {"category": "Status", "icon": "shuffle"},
    "warranty event": {"category": "Warranty", "icon": "badge-check"},
}


WORK_ORDER_STATUS_EVENTS = {
    "assigned": "Work Order Assigned",
    "accepted": "Status Changed",
    "in_progress": "Work Started",
    "on_hold": "Status Changed",
    "waiting_for_parts": "Status Changed",
    "completed": "Work Completed",
    "pending_supervisor_review": "Work Completed",
    "approved": "Work Approved",
    "closed": "Work Order Closed",
    "cancelled": "Status Changed",
    "rejected": "Status Changed",
}


class AssetHistoryService:
    """Build a unified asset timeline from all CMMS operational modules."""

    def __init__(self) -> None:
        self.assets = EquipmentRepository()

    def history(
        self,
        asset_id: int,
        *,
        page: int = 1,
        page_size: int = 25,
        event_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        technician: str | None = None,
        status: str | None = None,
        work_order: str | None = None,
        pm_cm: str | None = None,
        failure: str | None = None,
        downtime: str | None = None,
        search: str | None = None,
    ) -> dict[str, Any]:
        self.assets.get(asset_id)
        events = self._collect_events(asset_id)
        events = self._dedupe(events)
        events = [event for event in events if self._matches(event, event_type, date_from, date_to, technician, status, work_order, pm_cm, failure, downtime, search)]
        events.sort(key=lambda item: (self._parse_datetime(item.get("event_time")), int(item.get("source_id") or 0)), reverse=True)
        return self._paginate(events, page, page_size)

    def _collect_events(self, asset_id: int) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        rows.extend(self._asset_history(asset_id))
        rows.extend(self._work_orders(asset_id))
        rows.extend(self._work_order_timeline(asset_id))
        rows.extend(self._pm_tasks(asset_id))
        rows.extend(self._pm_history(asset_id))
        rows.extend(self._pm_plans(asset_id))
        rows.extend(self._failures(asset_id))
        rows.extend(self._downtime(asset_id))
        rows.extend(self._inventory_events(asset_id))
        rows.extend(self._measurements(asset_id))
        rows.extend(self._documents(asset_id))
        rows.extend(self._photos(asset_id))
        rows.extend(self._asset_events(asset_id))
        return [self._normalize(row) for row in rows]

    def _asset_history(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                ah.id AS source_id,
                'asset_history' AS source_table,
                ah.asset_id,
                ah.event_type,
                COALESCE(NULLIF(ah.event_time, ''), ah.created_at) AS event_time,
                COALESCE(ah.user_id, ah.actor_id) AS user_id,
                COALESCE(actor.name, '') AS user_name,
                COALESCE(NULLIF(ah.technician_name, ''), actor.name, '') AS technician,
                ah.work_order_id,
                COALESCE('WO-' || CAST(ah.work_order_id AS TEXT), '') AS work_order_number,
                ah.pm_plan_id,
                COALESCE(pp.name, '') AS pm_plan,
                COALESCE(ah.failure_code, '') AS failure_code,
                COALESCE(ah.downtime_duration_minutes, 0) AS downtime_duration_minutes,
                COALESCE(ah.parts_used, '') AS parts_used,
                COALESCE(NULLIF(ah.summary, ''), ah.title) AS summary,
                ah.description,
                COALESCE(NULLIF(ah.details, ''), ah.description) AS details,
                COALESCE(ah.status, '') AS status,
                COALESCE(NULLIF(ah.reference_type, ''), ah.source_module) AS reference_type,
                COALESCE(NULLIF(ah.reference_id, ''), ah.source_record_id) AS reference_id,
                ah.metadata
            FROM asset_history ah
            LEFT JOIN engineers actor ON actor.id = COALESCE(ah.user_id, ah.actor_id)
            LEFT JOIN pm_plans pp ON pp.id = ah.pm_plan_id
            WHERE ah.asset_id = ?
            """,
            (asset_id,),
        )

    def _work_orders(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                wo.id AS source_id,
                'work_orders' AS source_table,
                wo.equipment_id AS asset_id,
                CASE
                    WHEN UPPER(wo.title) LIKE 'PM:%%' THEN 'Preventive Maintenance'
                    WHEN LOWER(wo.title || ' ' || wo.description || ' ' || wo.priority) LIKE '%%breakdown%%'
                      OR LOWER(wo.title || ' ' || wo.description || ' ' || wo.priority) LIKE '%%failure%%'
                      OR LOWER(wo.title || ' ' || wo.description || ' ' || wo.priority) LIKE '%%fault%%'
                      OR LOWER(wo.priority) = 'critical' THEN 'Corrective Maintenance'
                    ELSE 'Work Order Created'
                END AS event_type,
                wo.created_at AS event_time,
                wo.engineer_id AS user_id,
                COALESCE(eng.name, '') AS user_name,
                COALESCE(eng.name, '') AS technician,
                wo.id AS work_order_id,
                'WO-' || CAST(wo.id AS TEXT) AS work_order_number,
                pwo.pm_plan_id AS pm_plan_id,
                COALESCE(pp.name, '') AS pm_plan,
                '' AS failure_code,
                COALESCE(wo.work_duration_minutes, 0) AS downtime_duration_minutes,
                '' AS parts_used,
                wo.title AS summary,
                wo.description AS description,
                wo.notes AS details,
                wo.status AS status,
                'Work Orders' AS reference_type,
                CAST(wo.id AS TEXT) AS reference_id,
                '' AS metadata
            FROM work_orders wo
            LEFT JOIN engineers eng ON eng.id = wo.engineer_id
            LEFT JOIN pm_plan_work_orders pwo ON pwo.work_order_id = wo.id
            LEFT JOIN pm_plans pp ON pp.id = pwo.pm_plan_id
            WHERE wo.equipment_id = ?
            """,
            (asset_id,),
        )

    def _work_order_timeline(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                wot.id AS source_id,
                'work_order_timeline' AS source_table,
                wo.equipment_id AS asset_id,
                wot.event_type AS event_type,
                wot.created_at AS event_time,
                wot.actor_id AS user_id,
                COALESCE(NULLIF(wot.actor_name, ''), actor.name, '') AS user_name,
                COALESCE(NULLIF(wot.actor_name, ''), actor.name, eng.name, '') AS technician,
                wo.id AS work_order_id,
                'WO-' || CAST(wo.id AS TEXT) AS work_order_number,
                pwo.pm_plan_id AS pm_plan_id,
                COALESCE(pp.name, '') AS pm_plan,
                '' AS failure_code,
                COALESCE(wo.work_duration_minutes, 0) AS downtime_duration_minutes,
                '' AS parts_used,
                COALESCE(NULLIF(wot.description, ''), wo.title) AS summary,
                wot.description AS description,
                wot.metadata AS details,
                COALESCE(NULLIF(wot.to_status, ''), wo.status) AS status,
                'Work Order Timeline' AS reference_type,
                CAST(wot.id AS TEXT) AS reference_id,
                wot.metadata AS metadata
            FROM work_order_timeline wot
            JOIN work_orders wo ON wo.id = wot.work_order_id
            LEFT JOIN engineers actor ON actor.id = wot.actor_id
            LEFT JOIN engineers eng ON eng.id = wo.engineer_id
            LEFT JOIN pm_plan_work_orders pwo ON pwo.work_order_id = wo.id
            LEFT JOIN pm_plans pp ON pp.id = pwo.pm_plan_id
            WHERE wo.equipment_id = ?
            """,
            (asset_id,),
        )

    def _pm_tasks(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                pm.id AS source_id,
                'preventive_maintenance' AS source_table,
                pm.equipment_id AS asset_id,
                'Preventive Maintenance' AS event_type,
                COALESCE(NULLIF(pm.last_service_date, ''), pm.created_at) AS event_time,
                NULL AS user_id,
                '' AS user_name,
                '' AS technician,
                NULL AS work_order_id,
                '' AS work_order_number,
                NULL AS pm_plan_id,
                pm.task_name AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                '' AS parts_used,
                pm.task_name AS summary,
                'Preventive maintenance task configured' AS description,
                'Interval hours: ' || CAST(pm.interval_hours AS TEXT) AS details,
                pm.status AS status,
                'Preventive Maintenance' AS reference_type,
                CAST(pm.id AS TEXT) AS reference_id,
                '' AS metadata
            FROM preventive_maintenance pm
            WHERE pm.equipment_id = ?
            """,
            (asset_id,),
        )

    def _pm_history(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                pmh.id AS source_id,
                'preventive_maintenance_history' AS source_table,
                pmh.equipment_id AS asset_id,
                'Preventive Maintenance' AS event_type,
                pmh.service_date AS event_time,
                NULL AS user_id,
                '' AS user_name,
                '' AS technician,
                NULL AS work_order_id,
                '' AS work_order_number,
                NULL AS pm_plan_id,
                pmh.task_name AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                '' AS parts_used,
                pmh.task_name AS summary,
                'Maintenance completed at ' || CAST(pmh.service_hours AS TEXT) || ' operating hours' AS description,
                '' AS details,
                'completed' AS status,
                'Preventive Maintenance History' AS reference_type,
                CAST(pmh.id AS TEXT) AS reference_id,
                '' AS metadata
            FROM preventive_maintenance_history pmh
            WHERE pmh.equipment_id = ?
            """,
            (asset_id,),
        )

    def _pm_plans(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                pp.id AS source_id,
                'pm_plans' AS source_table,
                pp.equipment_id AS asset_id,
                'Preventive Maintenance' AS event_type,
                COALESCE(NULLIF(pp.last_service_date, ''), pp.created_at) AS event_time,
                NULL AS user_id,
                '' AS user_name,
                '' AS technician,
                NULL AS work_order_id,
                '' AS work_order_number,
                pp.id AS pm_plan_id,
                pp.name AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                pp.planned_spare_parts AS parts_used,
                pp.name AS summary,
                pp.description AS description,
                pp.checklist_template AS details,
                pp.status AS status,
                'PM Plans' AS reference_type,
                CAST(pp.id AS TEXT) AS reference_id,
                pp.required_skills AS metadata
            FROM pm_plans pp
            WHERE pp.equipment_id = ?
            """,
            (asset_id,),
        )

    def _failures(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                fe.id AS source_id,
                'failure_events' AS source_table,
                fe.asset_id,
                'Failure Recorded' AS event_type,
                fe.failure_datetime AS event_time,
                fe.reported_by_id AS user_id,
                COALESCE(reporter.name, '') AS user_name,
                COALESCE(tech.name, reporter.name, '') AS technician,
                fe.linked_work_order_id AS work_order_id,
                CASE WHEN fe.linked_work_order_id IS NULL THEN '' ELSE 'WO-' || CAST(fe.linked_work_order_id AS TEXT) END AS work_order_number,
                fe.linked_pm_id AS pm_plan_id,
                '' AS pm_plan,
                fe.failure_id AS failure_code,
                0 AS downtime_duration_minutes,
                '' AS parts_used,
                fe.failure_id AS summary,
                fe.failure_description AS description,
                fe.operational_impact AS details,
                fe.status AS status,
                'Failure Events' AS reference_type,
                CAST(fe.id AS TEXT) AS reference_id,
                fe.severity AS metadata
            FROM failure_events fe
            LEFT JOIN engineers reporter ON reporter.id = fe.reported_by_id
            LEFT JOIN engineers tech ON tech.id = fe.assigned_technician_id
            WHERE fe.asset_id = ?
            """,
            (asset_id,),
        )

    def _downtime(self, asset_id: int) -> list[dict[str, Any]]:
        rows = self._query(
            """
            SELECT
                de.id AS source_id,
                'downtime_events' AS source_table,
                de.asset_id,
                'Downtime Started' AS event_type,
                de.start_time AS event_time,
                NULL AS user_id,
                '' AS user_name,
                COALESCE(eng.name, '') AS technician,
                de.linked_work_order_id AS work_order_id,
                CASE WHEN de.linked_work_order_id IS NULL THEN '' ELSE 'WO-' || CAST(de.linked_work_order_id AS TEXT) END AS work_order_number,
                NULL AS pm_plan_id,
                '' AS pm_plan,
                COALESCE(fe.failure_id, '') AS failure_code,
                de.total_downtime_minutes AS downtime_duration_minutes,
                '' AS parts_used,
                de.downtime_category AS summary,
                de.downtime_reason AS description,
                '' AS details,
                CASE WHEN de.end_time = '' THEN 'open' ELSE 'closed' END AS status,
                'Downtime Events' AS reference_type,
                CAST(de.id AS TEXT) AS reference_id,
                '' AS metadata,
                de.end_time AS end_time
            FROM downtime_events de
            LEFT JOIN failure_events fe ON fe.id = de.linked_failure_id
            LEFT JOIN work_orders wo ON wo.id = de.linked_work_order_id
            LEFT JOIN engineers eng ON eng.id = wo.engineer_id
            WHERE de.asset_id = ?
            """,
            (asset_id,),
        )
        ended = []
        for row in rows:
            if row.get("end_time"):
                ended.append({**row, "source_id": f"{row['source_id']}-end", "event_type": "Downtime Ended", "event_time": row["end_time"]})
        return rows + ended

    def _inventory_events(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                ii.id AS source_id,
                'inventory_items' AS source_table,
                wo.equipment_id AS asset_id,
                'Spare Parts Issued' AS event_type,
                ii.created_at AS event_time,
                wo.engineer_id AS user_id,
                COALESCE(eng.name, '') AS user_name,
                COALESCE(eng.name, '') AS technician,
                wo.id AS work_order_id,
                'WO-' || CAST(wo.id AS TEXT) AS work_order_number,
                NULL AS pm_plan_id,
                '' AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                ii.name AS parts_used,
                ii.name AS summary,
                'Inventory item linked to work order' AS description,
                'Stock: ' || CAST(ii.stock_quantity AS TEXT) || ' ' || COALESCE(ii.unit, '') AS details,
                CASE
                    WHEN ii.stock_quantity <= 0 THEN 'OUT OF STOCK'
                    WHEN ii.stock_quantity <= ii.minimum_quantity THEN 'LOW STOCK'
                    ELSE 'OK'
                END AS status,
                'Inventory' AS reference_type,
                CAST(ii.id AS TEXT) AS reference_id,
                '' AS metadata
            FROM inventory_items ii
            JOIN work_orders wo ON wo.id = ii.linked_work_order_id
            LEFT JOIN engineers eng ON eng.id = wo.engineer_id
            WHERE wo.equipment_id = ?
            """,
            (asset_id,),
        )

    def _measurements(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                am.id AS source_id,
                'asset_measurements' AS source_table,
                am.asset_id,
                'Meter Reading' AS event_type,
                am.reading_date AS event_time,
                NULL AS user_id,
                '' AS user_name,
                '' AS technician,
                NULL AS work_order_id,
                '' AS work_order_number,
                NULL AS pm_plan_id,
                '' AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                '' AS parts_used,
                am.measurement_type AS summary,
                CAST(am.value AS TEXT) || ' ' || COALESCE(am.unit, '') AS description,
                am.notes AS details,
                '' AS status,
                COALESCE(NULLIF(am.source_module, ''), 'Asset Measurements') AS reference_type,
                COALESCE(NULLIF(am.source_record_id, ''), CAST(am.id AS TEXT)) AS reference_id,
                '' AS metadata
            FROM asset_measurements am
            WHERE am.asset_id = ?
            """,
            (asset_id,),
        )

    def _documents(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                ad.id AS source_id,
                'asset_documents' AS source_table,
                ad.asset_id,
                'Document Uploaded' AS event_type,
                ad.created_at AS event_time,
                ad.uploaded_by_id AS user_id,
                COALESCE(eng.name, '') AS user_name,
                COALESCE(eng.name, '') AS technician,
                NULL AS work_order_id,
                '' AS work_order_number,
                NULL AS pm_plan_id,
                '' AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                '' AS parts_used,
                ad.title AS summary,
                ad.description AS description,
                ad.file_url AS details,
                ad.document_type AS status,
                'Asset Documents' AS reference_type,
                CAST(ad.id AS TEXT) AS reference_id,
                ad.file_name AS metadata
            FROM asset_documents ad
            LEFT JOIN engineers eng ON eng.id = ad.uploaded_by_id
            WHERE ad.asset_id = ?
            """,
            (asset_id,),
        )

    def _photos(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                ap.id AS source_id,
                'asset_photos' AS source_table,
                ap.asset_id,
                'Photo Added' AS event_type,
                ap.created_at AS event_time,
                ap.uploaded_by_id AS user_id,
                COALESCE(eng.name, '') AS user_name,
                COALESCE(eng.name, '') AS technician,
                NULL AS work_order_id,
                '' AS work_order_number,
                NULL AS pm_plan_id,
                '' AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                '' AS parts_used,
                ap.title AS summary,
                ap.description AS description,
                ap.file_url AS details,
                ap.photo_type AS status,
                'Asset Photos' AS reference_type,
                CAST(ap.id AS TEXT) AS reference_id,
                ap.file_name AS metadata
            FROM asset_photos ap
            LEFT JOIN engineers eng ON eng.id = ap.uploaded_by_id
            WHERE ap.asset_id = ?
            """,
            (asset_id,),
        )

    def _asset_events(self, asset_id: int) -> list[dict[str, Any]]:
        return self._query(
            """
            SELECT
                ae.id AS source_id,
                'asset_events' AS source_table,
                ae.asset_id,
                ae.event_type AS event_type,
                COALESCE(NULLIF(ae.due_date, ''), ae.created_at) AS event_time,
                NULL AS user_id,
                '' AS user_name,
                '' AS technician,
                NULL AS work_order_id,
                '' AS work_order_number,
                NULL AS pm_plan_id,
                '' AS pm_plan,
                '' AS failure_code,
                0 AS downtime_duration_minutes,
                '' AS parts_used,
                ae.event_type AS summary,
                ae.description AS description,
                ae.resolved_at AS details,
                ae.status AS status,
                COALESCE(NULLIF(ae.source_module, ''), 'Asset Events') AS reference_type,
                COALESCE(NULLIF(ae.source_record_id, ''), CAST(ae.id AS TEXT)) AS reference_id,
                ae.severity AS metadata
            FROM asset_events ae
            WHERE ae.asset_id = ?
            """,
            (asset_id,),
        )

    def _query(self, sql: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
        with get_connection() as db:
            try:
                return [dict(row) for row in db.execute(sql, params).fetchall()]
            except Exception as exc:  # pragma: no cover - converted to API-safe error.
                raise HTTPException(status_code=500, detail="Asset history query failed") from exc

    def _normalize(self, row: dict[str, Any]) -> dict[str, Any]:
        metadata = self._metadata(row.get("metadata"))
        event_type = self._normalize_event_type(row)
        presentation = self._presentation(event_type)
        details = row.get("details") or row.get("description") or ""
        if isinstance(details, str) and details.startswith("{"):
            parsed_details = self._metadata(details)
            details = parsed_details or details
        downtime_minutes = int(float(row.get("downtime_duration_minutes") or 0))
        return {
            "id": f"{row.get('source_table')}:{row.get('source_id')}",
            "source_id": row.get("source_id"),
            "asset_id": row.get("asset_id"),
            "event_type": event_type,
            "event_time": row.get("event_time") or "",
            "user_id": row.get("user_id"),
            "user_name": row.get("user_name") or row.get("technician") or "",
            "technician": row.get("technician") or row.get("user_name") or "",
            "work_order_id": row.get("work_order_id"),
            "work_order_number": row.get("work_order_number") or "",
            "pm_plan": row.get("pm_plan") or "",
            "pm_plan_id": row.get("pm_plan_id"),
            "failure_code": row.get("failure_code") or "",
            "downtime_duration": self._duration_label(downtime_minutes),
            "downtime_duration_minutes": downtime_minutes,
            "parts_used": self._parts_used(row.get("parts_used"), metadata),
            "summary": row.get("summary") or event_type,
            "description": row.get("description") or "",
            "details": details,
            "status": row.get("status") or metadata.get("status", ""),
            "reference_type": row.get("reference_type") or row.get("source_table") or "",
            "reference_id": str(row.get("reference_id") or row.get("source_id") or ""),
            "metadata": metadata,
            "category": presentation["category"],
            "icon": presentation["icon"],
        }

    def _normalize_event_type(self, row: dict[str, Any]) -> str:
        source = str(row.get("source_table") or "")
        raw = str(row.get("event_type") or "Status Changed")
        status = str(row.get("status") or "").lower()
        if source == "work_order_timeline":
            if raw.upper() == "CREATED":
                return "Work Order Created"
            if raw.upper() == "STATUS_CHANGE":
                return WORK_ORDER_STATUS_EVENTS.get(status, "Status Changed")
            if raw.upper() == "NOTIFICATION":
                return "Status Changed"
        if raw == "Measurement":
            return "Meter Reading"
        if raw == "Failure":
            return "Failure Recorded"
        if raw == "Photo Uploaded":
            return "Photo Added"
        return raw

    def _presentation(self, event_type: str) -> dict[str, str]:
        key = event_type.lower()
        if key in EVENT_PRESENTATION:
            return EVENT_PRESENTATION[key]
        if "pm" in key or "preventive" in key:
            return {"category": "PM", "icon": "calendar-check"}
        if "failure" in key or "breakdown" in key:
            return {"category": "Failure", "icon": "alert-triangle"}
        if "downtime" in key:
            return {"category": "Downtime", "icon": "clock"}
        if "work order" in key:
            return {"category": "Work Order", "icon": "wrench"}
        return {"category": "Asset", "icon": "activity"}

    def _metadata(self, value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return value
        if not value:
            return {}
        try:
            parsed = json.loads(str(value))
            return parsed if isinstance(parsed, dict) else {"value": parsed}
        except (TypeError, ValueError):
            return {"value": value}

    def _parts_used(self, value: Any, metadata: dict[str, Any]) -> list[dict[str, Any]] | str:
        if value:
            parsed = self._metadata(value)
            if parsed and "value" not in parsed:
                return parsed
            if isinstance(value, str):
                return value
        deducted = metadata.get("deducted_parts")
        return deducted if deducted else ""

    def _duration_label(self, minutes: int) -> str:
        if minutes <= 0:
            return ""
        hours = minutes / 60
        return f"{hours:.2f} h" if hours >= 1 else f"{minutes} min"

    def _dedupe(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[tuple[str, str, str]] = set()
        unique: list[dict[str, Any]] = []
        for event in events:
            if event.get("work_order_id"):
                key = (event["event_type"].lower(), "work_order", str(event.get("work_order_id")), str(event.get("event_time") or "")[:19])
            else:
                key = (event["event_type"].lower(), str(event.get("reference_type") or "").lower(), str(event.get("reference_id") or ""))
            if key in seen:
                continue
            seen.add(key)
            unique.append(event)
        return unique

    def _matches(
        self,
        event: dict[str, Any],
        event_type: str | None,
        date_from: date | None,
        date_to: date | None,
        technician: str | None,
        status: str | None,
        work_order: str | None,
        pm_cm: str | None,
        failure: str | None,
        downtime: str | None,
        search: str | None,
    ) -> bool:
        if event_type and self._lower(event.get("event_type")) != self._lower(event_type):
            return False
        event_date = self._parse_datetime(event.get("event_time")).date()
        if date_from and event_date < date_from:
            return False
        if date_to and event_date > date_to:
            return False
        if technician and self._lower(technician) not in self._lower(f"{event.get('technician')} {event.get('user_name')}"):
            return False
        if status and self._lower(status) not in self._lower(event.get("status")):
            return False
        if work_order and self._lower(work_order) not in self._lower(f"{event.get('work_order_id')} {event.get('work_order_number')}"):
            return False
        if pm_cm:
            requested = self._lower(pm_cm)
            category = self._lower(event.get("category"))
            event_label = self._lower(event.get("event_type"))
            if requested in {"pm", "preventive", "preventive maintenance"} and "pm" not in category and "preventive" not in event_label:
                return False
            if requested in {"cm", "corrective", "corrective maintenance"} and "cm" not in category and "corrective" not in event_label:
                return False
        if self._truthy_filter(failure) and "failure" not in self._lower(f"{event.get('category')} {event.get('event_type')} {event.get('failure_code')}"):
            return False
        if self._truthy_filter(downtime) and "downtime" not in self._lower(f"{event.get('category')} {event.get('event_type')}"):
            return False
        if search:
            haystack = " ".join(
                self._string(event.get(key))
                for key in [
                    "event_type",
                    "summary",
                    "description",
                    "details",
                    "user_name",
                    "technician",
                    "work_order_number",
                    "pm_plan",
                    "failure_code",
                    "status",
                ]
            )
            if self._lower(search) not in self._lower(haystack):
                return False
        return True

    def _paginate(self, items: list[dict[str, Any]], page: int, page_size: int) -> dict[str, Any]:
        safe_page = max(int(page or 1), 1)
        safe_page_size = min(max(int(page_size or 25), 1), 500)
        total = len(items)
        start = (safe_page - 1) * safe_page_size
        end = start + safe_page_size
        return {
            "items": items[start:end],
            "page": safe_page,
            "page_size": safe_page_size,
            "total": total,
            "pages": max(math.ceil(total / safe_page_size), 1) if total else 0,
        }

    def _parse_datetime(self, value: Any) -> datetime:
        if isinstance(value, datetime):
            return value.replace(tzinfo=None)
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        text = str(value or "").strip()
        if not text:
            return datetime.min
        for candidate in [text, text.replace("Z", "+00:00"), text[:19], text[:10]]:
            try:
                parsed = datetime.fromisoformat(candidate)
                return parsed.replace(tzinfo=None)
            except ValueError:
                continue
        return datetime.min

    def _truthy_filter(self, value: str | None) -> bool:
        return self._lower(value) in {"1", "true", "yes", "y", "on"}

    def _lower(self, value: Any) -> str:
        return self._string(value).lower().strip()

    def _string(self, value: Any) -> str:
        if isinstance(value, dict):
            return json.dumps(value, ensure_ascii=False, default=str)
        if isinstance(value, list):
            return " ".join(self._string(item) for item in value)
        return "" if value is None else str(value)
