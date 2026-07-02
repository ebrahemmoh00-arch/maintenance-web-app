from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..repositories import AssetLifecycleRepository, CustomerRepository, EngineerRepository, EquipmentRepository, InventoryRepository, JobTitleRepository, PMPlanRepository, PMPlanTaskRepository, PMPlanWorkOrderRepository, PreventiveMaintenanceRepository, WorkOrderRepository, parse_date
from ..core.security import hash_password, is_password_hash


def payload(model: Any) -> dict[str, Any]:
    return model.model_dump(exclude_unset=True)


WORK_ORDER_TERMINAL_STATUSES = {"closed", "cancelled", "rejected"}
WORK_ORDER_STATE_TRANSITIONS = {
    "draft": {"new", "cancelled"},
    "new": {"assigned", "cancelled", "overdue"},
    "pending": {"assigned", "cancelled", "overdue"},
    "assigned": {"accepted", "on_hold", "cancelled", "overdue"},
    "accepted": {"in_progress", "on_hold", "cancelled", "overdue"},
    "in_progress": {"waiting_for_parts", "completed", "on_hold", "cancelled", "overdue"},
    "waiting_for_parts": {"in_progress", "on_hold", "cancelled", "overdue"},
    "completed": {"pending_supervisor_review"},
    "pending_supervisor_review": {"approved", "rejected"},
    "approved": {"closed"},
    "on_hold": {"assigned", "accepted", "in_progress", "cancelled", "overdue"},
    "overdue": {"assigned", "accepted", "in_progress", "cancelled"},
    "closed": set(),
    "rejected": set(),
    "cancelled": set(),
}


def utc_timestamp() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def status_value(value: str | None) -> str:
    return str(value or "new").strip().lower().replace(" ", "_").replace("-", "_")


def minutes_between(start: str | None, end: str | None) -> int:
    if not start or not end:
        return 0
    try:
        started_at = datetime.fromisoformat(start)
        ended_at = datetime.fromisoformat(end)
    except ValueError:
        return 0
    return max(int((ended_at - started_at).total_seconds() // 60), 0)


class CustomerService:
    def __init__(self) -> None:
        self.repo = CustomerRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)
    def create(self, data): return self.repo.create(payload(data))
    def update(self, item_id: int, data): return self.repo.update(item_id, payload(data))
    def delete(self, item_id: int):
        current = self.repo.get(item_id)
        if status_value(current.get("status")) == "closed":
            raise HTTPException(status_code=400, detail="Closed work orders cannot be deleted")
        return self.repo.delete(item_id)


class EngineerService:
    def __init__(self) -> None:
        self.repo = EngineerRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)
    def create(self, data):
        item = self._prepare_payload(payload(data))
        return self.repo.create(item)

    def update(self, item_id: int, data):
        item = self._prepare_payload(payload(data), updating=True)
        return self.repo.update(item_id, item)
    def delete(self, item_id: int): return self.repo.delete(item_id)

    def _prepare_payload(self, item: dict[str, Any], updating: bool = False) -> dict[str, Any]:
        password = item.get("password")
        if password is None:
            return item
        if updating and password == "":
            item.pop("password", None)
            return item
        if password and not is_password_hash(password):
            item["password"] = hash_password(password)
        return item


class JobTitleService:
    def __init__(self) -> None:
        self.repo = JobTitleRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)
    def create(self, data): return self.repo.create(payload(data))
    def update(self, item_id: int, data): return self.repo.update(item_id, payload(data))
    def delete(self, item_id: int): return self.repo.delete(item_id)


class EquipmentService:
    def __init__(self) -> None:
        self.repo = EquipmentRepository()
        self.customers = CustomerRepository()
        self.lifecycle = AssetLifecycleRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        self.customers.get(item["customer_id"])
        self._prepare_hierarchy_payload(item)
        self._validate_asset_payload(item)
        self._validate_unique_asset_code(item.get("asset_code", ""))
        created = self.repo.create(item)
        self.lifecycle.add_history(
            created["id"],
            "Asset Created",
            "Asset profile created",
            f"Asset {created['name']} was registered in the CMMS",
            "Assets",
            created["id"],
        )
        AssetLifecycleService().refresh_health(created["id"])
        return created

    def update(self, item_id: int, data):
        item = payload(data)
        current = self.repo.get(item_id)
        if "customer_id" in item:
            self.customers.get(item["customer_id"])
        hierarchy_keys = {"parent_id", "asset_type", "asset_level", "asset_code", "criticality"}
        if hierarchy_keys.intersection(item):
            merged = {**current, **item}
            self._prepare_hierarchy_payload(merged, item_id)
            for key in ("parent_id", "asset_type", "asset_level", "asset_code", "criticality", "customer_id"):
                if key in merged and key not in item:
                    item[key] = merged[key]
        merged = {**current, **item}
        self._validate_asset_payload(merged)
        self._validate_unique_asset_code(merged.get("asset_code", ""), item_id)
        updated = self.repo.update(item_id, item)
        changed = {key: {"old": current.get(key), "new": updated.get(key)} for key in item if current.get(key) != updated.get(key)}
        if changed:
            self.lifecycle.add_history(
                item_id,
                "Asset Updated",
                "Asset profile updated",
                ", ".join(sorted(changed)) or "Asset data changed",
                "Assets",
                item_id,
                metadata={"changed_fields": changed},
            )
        AssetLifecycleService().refresh_health(item_id)
        return updated

    def delete(self, item_id: int):
        if self.repo.children(item_id):
            raise HTTPException(status_code=400, detail="Delete child assets before deleting this asset")
        return self.repo.delete(item_id)
    def alerts(self): return self.repo.maintenance_alerts()

    def _prepare_hierarchy_payload(self, item: dict[str, Any], item_id: int | None = None) -> None:
        item["asset_type"] = item.get("asset_type") or "Equipment"
        item["asset_level"] = item.get("asset_level") or classify_asset_level(item["asset_type"], item.get("name", ""))
        parent_id = item.get("parent_id")
        if parent_id in ("", 0):
            parent_id = None
            item["parent_id"] = None

        if parent_id is None and item["asset_level"] != "Site":
            raise HTTPException(status_code=400, detail="Only Site assets can be created without a parent")
        if parent_id is not None:
            parent_id = int(parent_id)
            if item_id is not None and parent_id == item_id:
                raise HTTPException(status_code=400, detail="Asset cannot be its own parent")
            parent = self.repo.get(parent_id)
            self._validate_parent_child(parent["asset_level"], item["asset_level"])
            if item_id is not None and self._would_create_cycle(item_id, parent_id):
                raise HTTPException(status_code=400, detail="Circular hierarchy is not allowed")
            depth = self._depth(parent_id) + 1
            if depth > 6:
                raise HTTPException(status_code=400, detail="Maximum hierarchy depth is 6 levels")

        if not item.get("asset_code"):
            item["asset_code"] = self._generate_asset_code(item)

    def _validate_unique_asset_code(self, asset_code: str, item_id: int | None = None) -> None:
        code = str(asset_code or "").strip().lower()
        if not code:
            return
        for asset in self.repo.list():
            if int(asset["id"]) == int(item_id or 0):
                continue
            if str(asset.get("asset_code") or "").strip().lower() == code:
                raise HTTPException(status_code=400, detail="Asset code already exists")

    def _validate_asset_payload(self, item: dict[str, Any]) -> None:
        for field in (
            "current_hours",
            "last_reading",
            "current_reading",
            "expected_life_years",
            "replacement_cost",
            "purchase_cost",
            "total_maintenance_cost",
            "spare_parts_cost",
            "labor_cost",
            "contractor_cost",
        ):
            if field in item and item.get(field) not in (None, "") and float(item.get(field) or 0) < 0:
                raise HTTPException(status_code=400, detail=f"{field} cannot be negative")

        date_fields = (
            "commission_date",
            "installation_date",
            "warranty_start",
            "warranty_end",
            "last_pm_date",
            "next_pm_date",
            "last_breakdown_date",
            "last_repair_date",
            "last_maintenance_date",
        )
        for field in date_fields:
            value = item.get(field)
            if value and not parse_date(str(value)):
                raise HTTPException(status_code=400, detail=f"{field} must be a valid date")
        start = parse_date(item.get("warranty_start"))
        end = parse_date(item.get("warranty_end"))
        if start and end and end < start:
            raise HTTPException(status_code=400, detail="Warranty end date cannot be before warranty start date")

    def _validate_parent_child(self, parent_level: str, child_level: str) -> None:
        levels = ["Site", "Area / Department", "System", "Equipment", "Component"]
        if parent_level not in levels or child_level not in levels:
            return
        if levels.index(child_level) <= levels.index(parent_level):
            raise HTTPException(status_code=400, detail=f"{child_level} cannot be placed under {parent_level}")

    def _would_create_cycle(self, item_id: int, parent_id: int) -> bool:
        cursor = parent_id
        visited: set[int] = set()
        while cursor:
            if cursor == item_id:
                return True
            if cursor in visited:
                return True
            visited.add(cursor)
            parent = self.repo.get(cursor)
            cursor = parent.get("parent_id")
        return False

    def _depth(self, item_id: int) -> int:
        depth = 1
        cursor = item_id
        visited: set[int] = set()
        while cursor:
            if cursor in visited:
                break
            visited.add(cursor)
            parent = self.repo.get(cursor)
            cursor = parent.get("parent_id")
            if cursor:
                depth += 1
        return depth

    def _generate_asset_code(self, item: dict[str, Any]) -> str:
        prefix = asset_prefix(item.get("asset_level", "Equipment"), item.get("asset_type", ""), item.get("name", ""))
        parent_id = item.get("parent_id")
        parent_code = ""
        if parent_id:
            parent_code = self.repo.get(int(parent_id)).get("asset_code") or ""
        siblings = [row for row in self.repo.list() if (row.get("parent_id") or None) == (parent_id or None)]
        number = len(siblings) + 1
        base = f"{parent_code}-{prefix}" if parent_code else prefix
        return f"{base}-{number:03d}"


def classify_asset_level(asset_type: str, name: str = "") -> str:
    text = f"{asset_type} {name}".lower()
    if any(word in text for word in ("bearing", "seal", "gasket", "connector", "component")):
        return "Component"
    if any(word in text for word in ("cooling system", "system", "radiator", "ignition")):
        return "System"
    if any(word in text for word in ("pump", "motor", "generator", "engine", "compressor", "equipment")):
        return "Equipment"
    if any(word in text for word in ("area", "department", "unit")):
        return "Area / Department"
    if any(word in text for word in ("site", "plant", "company")):
        return "Site"
    return "Equipment"


def asset_prefix(level: str, asset_type: str, name: str = "") -> str:
    text = f"{asset_type} {name}".upper()
    if "PUMP" in text:
        return "PMP"
    if "MOTOR" in text:
        return "MTR"
    if "BOILER" in text:
        return "BLR"
    if "COOL" in text:
        return "COL"
    mapping = {
        "Site": "PLT",
        "Area / Department": "UT1",
        "System": "SYS",
        "Equipment": "EQP",
        "Component": "CMP",
    }
    return mapping.get(level, "AST")


class AssetLifecycleService:
    def __init__(self) -> None:
        self.assets = EquipmentRepository()
        self.lifecycle = AssetLifecycleRepository()
        self.work_orders = WorkOrderRepository()
        self.pm = PreventiveMaintenanceRepository()

    def history(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.history(asset_id)

    def timeline(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.timeline(asset_id)

    def events(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.events(asset_id)

    def measurements(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.measurements(asset_id)

    def documents(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.documents(asset_id)

    def photos(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.photos(asset_id)

    def health(self, asset_id: int):
        self.assets.get(asset_id)
        return self.refresh_health(asset_id)

    def add_measurement(self, asset_id: int, data):
        self.assets.get(asset_id)
        item = payload(data)
        if float(item.get("value") or 0) < 0:
            raise HTTPException(status_code=400, detail="Measurement value cannot be negative")
        created = self.lifecycle.add_measurement(asset_id, item)
        measurement_type = str(created.get("measurement_type") or "").lower()
        if measurement_type in {"hours", "runtime hours", "meter reading", "running hours"}:
            self.assets.update(asset_id, {"current_hours": int(float(created.get("value") or 0)), "current_reading": float(created.get("value") or 0)})
        else:
            self.assets.update(asset_id, {"current_reading": float(created.get("value") or 0)})
        self.refresh_health(asset_id)
        return created

    def add_document(self, asset_id: int, data):
        self.assets.get(asset_id)
        return self.lifecycle.add_document(asset_id, payload(data))

    def add_photo(self, asset_id: int, data):
        self.assets.get(asset_id)
        return self.lifecycle.add_photo(asset_id, payload(data))

    def record_work_order_closed(self, order: dict[str, Any], deducted_parts: list[dict[str, Any]]) -> None:
        asset_id = int(order["equipment_id"])
        runtime = int(order.get("service_hours") or order.get("runtime_reading_end") or 0)
        title = "PM Completed" if str(order.get("title", "")).upper().startswith("PM:") else "Work Order Closed"
        self.lifecycle.add_history(
            asset_id,
            title,
            title,
            f"Work Order #{order['id']} closed successfully",
            "Work Orders",
            order["id"],
            metadata={"status": order.get("status"), "runtime": runtime, "deducted_parts": deducted_parts},
        )
        if runtime > 0:
            self.lifecycle.add_measurement(
                asset_id,
                {
                    "measurement_type": "Runtime Hours",
                    "value": runtime,
                    "unit": "hrs",
                    "source_module": "Work Orders",
                    "source_record_id": order["id"],
                    "notes": f"Runtime captured during Work Order #{order['id']}",
                },
            )
        if self._is_breakdown(order):
            self.lifecycle.add_event(
                asset_id,
                "Breakdown",
                "critical" if str(order.get("priority", "")).lower() == "critical" else "warning",
                "resolved",
                "",
                f"Breakdown repaired through Work Order #{order['id']}",
                "Work Orders",
                order["id"],
            )
        self.refresh_health(asset_id)

    def refresh_health(self, asset_id: int) -> dict[str, Any]:
        asset = self.assets.get(asset_id)
        orders = [order for order in self.work_orders.list() if int(order.get("equipment_id") or 0) == asset_id]
        pm_rows = [task for task in self.pm.list() if int(task.get("equipment_id") or 0) == asset_id]
        terminal = {"closed", "cancelled", "rejected"}
        closed_like = {"closed", "completed", "approved", "pending_supervisor_review"}
        open_orders = [order for order in orders if status_value(order.get("status")) not in terminal]
        completed_orders = [order for order in orders if status_value(order.get("status")) in closed_like]
        failures = [order for order in orders if self._is_breakdown(order)]
        total_downtime = round(sum(float(order.get("work_duration_minutes") or 0) for order in failures) / 60, 2)
        repairs = [order for order in completed_orders if int(order.get("work_duration_minutes") or 0) > 0]
        mttr = round(total_downtime / len(repairs), 2) if repairs else 0
        current_hours = int(asset.get("current_hours") or 0)
        mtbf = round(current_hours / len(failures), 2) if failures and current_hours else float(current_hours or 0)
        availability = 100.0
        if current_hours > 0:
            availability = round(max(((current_hours - total_downtime) / current_hours) * 100, 0), 2)
        completed_pm = len([order for order in completed_orders if str(order.get("title", "")).upper().startswith("PM:")])
        overdue_pm = len([task for task in pm_rows if str(task.get("pm_alert", "")).upper() == "DUE NOW"])
        upcoming_pm = len([task for task in pm_rows if str(task.get("pm_alert", "")).upper() == "UPCOMING"])
        pm_compliance = round((completed_pm / max(completed_pm + overdue_pm, 1)) * 100, 2)
        maintenance_cost = round(
            float(asset.get("total_maintenance_cost") or 0)
            + float(asset.get("spare_parts_cost") or 0)
            + float(asset.get("labor_cost") or 0)
            + float(asset.get("contractor_cost") or 0),
            2,
        )
        score = 100
        score -= min(len(failures) * 7, 35)
        score -= min(total_downtime * 2, 25)
        score -= min(len(open_orders) * 4, 16)
        score -= min(overdue_pm * 8, 24)
        score -= max(0, int((100 - availability) / 2))
        score = max(min(int(round(score)), 100), 0)
        health = {
            "health_score": score,
            "health_status": self._health_status(score),
            "availability": availability,
            "mtbf": mtbf,
            "mttr": mttr,
            "total_downtime_hours": total_downtime,
            "maintenance_cost": maintenance_cost,
            "pm_compliance": pm_compliance,
            "failure_frequency": len(failures),
            "open_work_orders": len(open_orders),
            "completed_pm": completed_pm,
            "upcoming_pm": upcoming_pm,
            "metadata": {
                "asset_code": asset.get("asset_code", ""),
                "last_pm": asset.get("last_pm_date") or asset.get("last_maintenance_date") or "",
                "next_pm": asset.get("next_pm_date") or asset.get("next_maintenance_date") or "",
            },
        }
        return self.lifecycle.upsert_health(asset_id, health)

    def _is_breakdown(self, order: dict[str, Any]) -> bool:
        text = f"{order.get('title', '')} {order.get('description', '')} {order.get('priority', '')}".lower()
        return "breakdown" in text or "failure" in text or "fault" in text or str(order.get("priority", "")).lower() == "critical"

    def _health_status(self, score: int) -> str:
        if score >= 95:
            return "Excellent"
        if score >= 80:
            return "Good"
        if score >= 60:
            return "Warning"
        return "Critical"


class WorkOrderService:
    def __init__(self) -> None:
        self.repo = WorkOrderRepository()
        self.customers = CustomerRepository()
        self.equipment = EquipmentRepository()
        self.engineers = EngineerRepository()
        self.inventory = InventoryRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        self._validate_assignments(item)
        item["status"] = status_value(item.get("status") or "new")
        created = self.repo.create(item)
        self.repo.add_timeline(
            created["id"],
            "CREATED",
            "",
            created["status"],
            description=f"Work order #{created['id']} created",
        )
        return self.repo.get(created["id"])

    def update(self, item_id: int, data):
        item = payload(data)
        self._validate_assignments(item)
        old_order = self.repo.get(item_id)
        current_status = status_value(old_order.get("status"))
        target_status = status_value(item.get("status")) if "status" in item and item.get("status") else current_status
        if current_status == "closed":
            raise HTTPException(status_code=400, detail="Closed work orders cannot be edited")
        if target_status != current_status:
            self._validate_transition(current_status, target_status)
            item["status"] = target_status
        updated = self.repo.update(item_id, item)
        old_status = status_value(old_order.get("status"))
        new_status = status_value(updated.get("status"))
        if old_status != new_status:
            self._record_status_change(updated, old_status, new_status, None, "Manual status update")
        if old_status not in {"completed", "closed", "close"} and new_status in {"completed", "closed", "close"}:
            PMPlanEngineService().complete_work_order(updated)
        return updated

    def delete(self, item_id: int): return self.repo.delete(item_id)
    def dashboard(self): return self.repo.dashboard_stats()
    def schedule(self): return self.repo.schedule()

    def assign(self, item_id: int, data):
        item = payload(data)
        engineer_id = item.get("engineer_id")
        if not engineer_id:
            raise HTTPException(status_code=400, detail="Technician or resource is required for assignment")
        self.engineers.get(engineer_id)
        actor_id = item.get("actor_id")
        now = utc_timestamp()
        updated = self._transition(
            item_id,
            "assigned",
            {
                "engineer_id": engineer_id,
                "assigned_by_id": actor_id,
                "assigned_at": now,
            },
            actor_id=actor_id,
            reason=item.get("notes", ""),
            description=f"Work order assigned to resource #{engineer_id}",
        )
        self.repo.add_assignment_history(item_id, engineer_id, actor_id, item.get("notes", ""))
        return updated

    def accept(self, item_id: int, data):
        item = payload(data)
        return self._transition(
            item_id,
            "accepted",
            {"accepted_at": utc_timestamp()},
            actor_id=item.get("actor_id"),
            reason=item.get("notes", ""),
            description="Work order accepted by technician",
        )

    def start(self, item_id: int, data):
        item = payload(data)
        runtime = item.get("runtime_reading")
        updates = {
            "started_at": utc_timestamp(),
            "runtime_reading_start": int(runtime or 0),
            "technician_notes": item.get("technician_notes") or item.get("notes", ""),
        }
        return self._transition(
            item_id,
            "in_progress",
            updates,
            actor_id=item.get("actor_id"),
            reason=item.get("notes", ""),
            description="Work order started",
        )

    def pause(self, item_id: int, data):
        item = payload(data)
        reason = str(item.get("reason") or item.get("notes") or "").strip()
        if not reason:
            raise HTTPException(status_code=400, detail="Pause reason is required")
        return self._transition(
            item_id,
            "on_hold",
            {"paused_at": utc_timestamp(), "hold_reason": reason},
            actor_id=item.get("actor_id"),
            reason=reason,
            description="Work order paused",
        )

    def waiting_parts(self, item_id: int, data):
        item = payload(data)
        reason = str(item.get("reason") or item.get("notes") or "").strip()
        if not reason:
            raise HTTPException(status_code=400, detail="Waiting for parts reason is required")
        return self._transition(
            item_id,
            "waiting_for_parts",
            {"paused_at": utc_timestamp(), "waiting_parts_reason": reason},
            actor_id=item.get("actor_id"),
            reason=reason,
            description="Work order waiting for parts",
        )

    def resume(self, item_id: int, data):
        item = payload(data)
        return self._transition(
            item_id,
            "in_progress",
            {"resumed_at": utc_timestamp()},
            actor_id=item.get("actor_id"),
            reason=item.get("notes", ""),
            description="Work order resumed",
        )

    def complete(self, item_id: int, data):
        item = payload(data)
        if item.get("checklist_completed") is not True:
            raise HTTPException(status_code=400, detail="Checklist must be completed before work order completion")
        completion_notes = str(item.get("completion_notes") or item.get("notes") or "").strip()
        if not completion_notes:
            raise HTTPException(status_code=400, detail="Completion notes are required")
        current = self.repo.get(item_id)
        completed_at = utc_timestamp()
        duration = minutes_between(current.get("started_at"), completed_at)
        completed = self._transition(
            item_id,
            "completed",
            {
                "completed_at": completed_at,
                "runtime_reading_end": int(item.get("runtime_reading") or current.get("service_hours") or 0),
                "service_hours": int(item.get("runtime_reading") or current.get("service_hours") or 0),
                "completion_notes": completion_notes,
                "technician_notes": item.get("technician_notes") or current.get("technician_notes") or "",
                "checklist_completed": 1,
                "work_duration_minutes": duration,
            },
            actor_id=item.get("actor_id"),
            reason=completion_notes,
            description="Work order completed by technician",
        )
        PMPlanEngineService().complete_work_order(completed)
        return self._transition(
            item_id,
            "pending_supervisor_review",
            {},
            actor_id=item.get("actor_id"),
            reason="Awaiting supervisor review",
            description="Work order sent to supervisor review",
        )

    def approve(self, item_id: int, data):
        item = payload(data)
        actor_id = item.get("actor_id")
        notes = item.get("supervisor_notes") or item.get("notes", "")
        updated = self._transition(
            item_id,
            "approved",
            {
                "approved_by_id": actor_id,
                "approved_at": utc_timestamp(),
                "supervisor_notes": notes,
            },
            actor_id=actor_id,
            reason=notes,
            description="Work order approved by supervisor",
        )
        self.repo.add_approval(item_id, actor_id, "APPROVE", notes)
        return updated

    def reject(self, item_id: int, data):
        item = payload(data)
        reason = str(item.get("reason") or item.get("supervisor_notes") or item.get("notes") or "").strip()
        if not reason:
            raise HTTPException(status_code=400, detail="Reject reason is required")
        updated = self._transition(
            item_id,
            "rejected",
            {"rejected_at": utc_timestamp(), "supervisor_notes": reason},
            actor_id=item.get("actor_id"),
            reason=reason,
            description="Work order rejected by supervisor",
        )
        self.repo.add_approval(item_id, item.get("actor_id"), "REJECT", reason)
        return updated

    def cancel(self, item_id: int, data):
        item = payload(data)
        reason = str(item.get("reason") or item.get("notes") or "").strip()
        if not reason:
            raise HTTPException(status_code=400, detail="Cancel reason is required")
        return self._transition(
            item_id,
            "cancelled",
            {"cancelled_at": utc_timestamp(), "hold_reason": reason},
            actor_id=item.get("actor_id"),
            reason=reason,
            description="Work order cancelled",
        )

    def close(self, item_id: int, data):
        item = payload(data)
        closed = self._transition(
            item_id,
            "closed",
            {"closed_at": utc_timestamp()},
            actor_id=item.get("actor_id"),
            reason=item.get("notes", ""),
            description="Work order closed by system",
        )
        self._close_operational_updates(closed)
        return self.repo.get(item_id)

    def _validate_assignments(self, item: dict[str, Any]) -> None:
        if "customer_id" in item:
            self.customers.get(item["customer_id"])
        if "equipment_id" in item:
            equipment = self.equipment.get(item["equipment_id"])
            if "customer_id" in item and equipment["customer_id"] != item["customer_id"]:
                raise HTTPException(status_code=400, detail="Equipment does not belong to the selected customer")
        if "engineer_id" in item:
            self.engineers.get(item["engineer_id"])

    def _transition(
        self,
        item_id: int,
        next_status: str,
        updates: dict[str, Any] | None = None,
        actor_id: int | None = None,
        reason: str = "",
        description: str = "",
    ) -> dict[str, Any]:
        current = self.repo.get(item_id)
        current_status = status_value(current.get("status"))
        next_status = status_value(next_status)
        self._validate_transition(current_status, next_status)
        actor = self._actor(actor_id)
        payload_data = {**(updates or {}), "status": next_status}
        updated = self.repo.update(item_id, payload_data)
        self._record_status_change(updated, current_status, next_status, actor_id, reason, actor.get("name", ""), description)
        return updated

    def _validate_transition(self, current_status: str, next_status: str) -> None:
        if current_status == next_status:
            raise HTTPException(status_code=400, detail=f"Work order is already {next_status}")
        if current_status in WORK_ORDER_TERMINAL_STATUSES:
            raise HTTPException(status_code=400, detail=f"Cannot transition work order from {current_status}")
        allowed = WORK_ORDER_STATE_TRANSITIONS.get(current_status, set())
        if next_status not in allowed:
            raise HTTPException(status_code=400, detail=f"Illegal work order transition: {current_status} -> {next_status}")

    def _actor(self, actor_id: int | None) -> dict[str, Any]:
        if not actor_id:
            return {}
        try:
            return self.engineers.get(actor_id)
        except HTTPException:
            raise HTTPException(status_code=400, detail="Actor user was not found")

    def _record_status_change(
        self,
        order: dict[str, Any],
        from_status: str,
        to_status: str,
        actor_id: int | None,
        reason: str = "",
        actor_name: str = "",
        description: str = "",
    ) -> None:
        self.repo.add_status_history(order["id"], from_status, to_status, actor_id, reason)
        self.repo.add_timeline(
            order["id"],
            "STATUS_CHANGE",
            from_status,
            to_status,
            actor_id,
            actor_name,
            description or f"Status changed from {from_status} to {to_status}",
            {"reason": reason},
        )
        self.repo.add_timeline(
            order["id"],
            "NOTIFICATION",
            from_status,
            to_status,
            actor_id,
            actor_name,
            f"Notification event generated for status {to_status}",
            {"reason": reason},
        )
        AuditService.log_event(
            action="UPDATE",
            module="Work Orders",
            record_id=order["id"],
            description=description or f"Work order transitioned from {from_status} to {to_status}",
            old_values={"status": from_status},
            new_values={"status": to_status, "reason": reason},
        )

    def _close_operational_updates(self, order: dict[str, Any]) -> None:
        runtime = int(order.get("service_hours") or order.get("runtime_reading_end") or 0)
        equipment = self.equipment.get(order["equipment_id"])
        updates = {
            "last_maintenance_date": date.today().isoformat(),
            "status": "Active",
        }
        if str(order.get("title", "")).upper().startswith("PM:"):
            updates["last_pm_date"] = date.today().isoformat()
        elif AssetLifecycleService()._is_breakdown(order):
            updates["last_breakdown_date"] = date.today().isoformat()
            updates["last_repair_date"] = date.today().isoformat()
        if runtime > int(equipment.get("current_hours") or 0):
            updates["current_hours"] = runtime
        self.equipment.update(order["equipment_id"], updates)
        deducted_parts = self._deduct_inventory_parts(order)
        AssetLifecycleService().record_work_order_closed(order, deducted_parts)
        AuditService.log_event(
            action="CLOSE",
            module="Work Orders",
            record_id=order["id"],
            description=f"Closed Work Order #{order['id']} and updated asset history, inventory, KPIs, and notifications",
            new_values={"asset_id": order["equipment_id"], "runtime": runtime, "deducted_parts": deducted_parts},
        )

    def _deduct_inventory_parts(self, order: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            notes = json.loads(order.get("notes") or "{}")
        except json.JSONDecodeError:
            return []
        if not notes.get("__workOrderDocument"):
            return []
        requested_parts = notes.get("spare_parts_items") or []
        if not isinstance(requested_parts, list):
            return []

        inventory_by_name = {str(item.get("name", "")).strip().lower(): item for item in self.inventory.list()}
        deducted: list[dict[str, Any]] = []
        for part in requested_parts:
            name = str(part.get("name", "")).strip()
            quantity = int(part.get("qty") or 0)
            if not name or quantity <= 0:
                continue
            item = inventory_by_name.get(name.lower())
            if not item:
                continue
            old_quantity = int(item.get("stock_quantity") or 0)
            new_quantity = max(old_quantity - quantity, 0)
            if new_quantity == old_quantity:
                continue
            self.inventory.update(item["id"], {"stock_quantity": new_quantity, "linked_work_order_id": order["id"]})
            deducted.append({"inventory_item_id": item["id"], "name": item["name"], "old_quantity": old_quantity, "new_quantity": new_quantity})
        return deducted


class InventoryService:
    def __init__(self) -> None:
        self.repo = InventoryRepository()
        self.work_orders = WorkOrderRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        if item.get("linked_work_order_id"):
            self.work_orders.get(item["linked_work_order_id"])
        return self.repo.create(item)

    def update(self, item_id: int, data):
        item = payload(data)
        if item.get("linked_work_order_id"):
            self.work_orders.get(item["linked_work_order_id"])
        return self.repo.update(item_id, item)

    def delete(self, item_id: int): return self.repo.delete(item_id)


class PreventiveMaintenanceService:
    def __init__(self) -> None:
        self.repo = PreventiveMaintenanceRepository()
        self.equipment = EquipmentRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        self.equipment.get(item["equipment_id"])
        return self.repo.create(item)

    def update(self, item_id: int, data):
        item = payload(data)
        if "equipment_id" in item:
            self.equipment.get(item["equipment_id"])
        return self.repo.update(item_id, item)

    def update_history_record(self, record_id: int, data):
        return self.repo.update_history_record(record_id, payload(data))

    def delete(self, item_id: int): return self.repo.delete(item_id)


def add_months(source: date, months: int) -> date:
    month = source.month - 1 + months
    year = source.year + month // 12
    month = month % 12 + 1
    days_in_month = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    day = min(source.day, days_in_month[month - 1])
    return date(year, month, day)


def recurrence_key(value: str | None) -> str:
    return str(value or "Runtime Hours").strip().lower().replace("_", " ")


class PMPlanService:
    def __init__(self) -> None:
        self.repo = PMPlanRepository()
        self.tasks = PMPlanTaskRepository()
        self.equipment = EquipmentRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        tasks = item.pop("tasks", [])
        self._prepare_payload(item)
        created = self.repo.create(item)
        if tasks:
            self.tasks.replace_for_plan(created["id"], tasks)
        return self.repo.get(created["id"])

    def update(self, item_id: int, data):
        item = payload(data)
        tasks = item.pop("tasks", None)
        current = self.repo.get(item_id)
        merged = {**current, **item}
        self._prepare_payload(merged)
        update_payload = {key: merged[key] for key in self.repo.fields if key in item or key in {"next_due_date", "next_due_runtime"}}
        updated = self.repo.update(item_id, update_payload)
        if tasks is not None:
            self.tasks.replace_for_plan(item_id, tasks)
        return self.repo.get(updated["id"])

    def delete(self, item_id: int): return self.repo.delete(item_id)

    def create_task(self, plan_id: int, data):
        self.repo.get(plan_id)
        item = payload(data)
        item["pm_plan_id"] = plan_id
        item["is_required"] = 1 if item.get("is_required", True) else 0
        return self.tasks.create(item)

    def update_task(self, task_id: int, data):
        item = payload(data)
        if "is_required" in item:
            item["is_required"] = 1 if item["is_required"] else 0
        return self.tasks.update(task_id, item)

    def delete_task(self, task_id: int): return self.tasks.delete(task_id)

    def run_scheduler(self):
        return PMPlanEngineService().run_due_plans()

    def _prepare_payload(self, item: dict[str, Any]) -> None:
        equipment = self.equipment.get(int(item["equipment_id"]))
        item["recurrence_type"] = normalize_recurrence_type(item.get("recurrence_type"))
        item["status"] = str(item.get("status") or "active").lower()
        if item["status"] not in {"active", "paused"}:
            raise HTTPException(status_code=400, detail="PM plan status must be active or paused")
        item["interval_value"] = max(int(item.get("interval_value") or 1), 1)
        item["start_date"] = item.get("start_date") or date.today().isoformat()
        item["priority"] = item.get("priority") or "medium"
        if item["recurrence_type"] == "Runtime Hours":
            if int(item.get("next_due_runtime") or 0) <= 0:
                base_runtime = int(item.get("last_runtime") or equipment.get("current_hours") or 0)
                item["next_due_runtime"] = base_runtime + item["interval_value"]
            item["next_due_date"] = item.get("next_due_date") or ""
        else:
            if not item.get("next_due_date"):
                item["next_due_date"] = item["start_date"]
            item["next_due_runtime"] = int(item.get("next_due_runtime") or 0)


class PMPlanEngineService:
    def __init__(self) -> None:
        self.pm_plans = PMPlanRepository()
        self.work_orders = WorkOrderRepository()
        self.links = PMPlanWorkOrderRepository()
        self.engineers = EngineerRepository()

    def run_due_plans(self) -> dict[str, Any]:
        result = {"generated": 0, "skipped": 0, "work_order_ids": [], "messages": []}
        for plan in self.pm_plans.due_candidates():
            due = self._due_info(plan)
            if not due["is_due"]:
                continue
            existing = self.links.find_by_plan_cycle(plan["id"], due["cycle_key"])
            if existing:
                result["skipped"] += 1
                result["messages"].append(f"Skipped PM Plan #{plan['id']} because cycle {due['cycle_key']} already has a work order")
                continue
            try:
                work_order = self._generate_work_order(plan, due["due_date"], due["cycle_key"])
            except HTTPException as exc:
                result["skipped"] += 1
                result["messages"].append(f"Skipped PM Plan #{plan['id']}: {exc.detail}")
                continue
            result["generated"] += 1
            result["work_order_ids"].append(work_order["id"])
            result["messages"].append(f"Generated Work Order #{work_order['id']} from PM Plan #{plan['id']}")
        AuditService.log_event(
            action="CREATE",
            module="PM Plans",
            description=f"PM scheduler generated {result['generated']} work orders and skipped {result['skipped']} plans",
            new_values=result,
        )
        return result

    def complete_work_order(self, work_order: dict[str, Any]) -> None:
        link = self.links.find_by_work_order(int(work_order["id"]))
        if not link:
            return
        plan = self.pm_plans.get(int(link["pm_plan_id"]))
        service_date = date.today().isoformat()
        runtime = int(work_order.get("service_hours") or plan.get("current_hours") or plan.get("last_runtime") or 0)
        updates: dict[str, Any] = {
            "last_service_date": service_date,
            "last_runtime": runtime,
        }
        recurrence = recurrence_key(plan.get("recurrence_type"))
        interval = max(int(plan.get("interval_value") or 1), 1)
        if recurrence == "runtime hours":
            updates["next_due_runtime"] = runtime + interval
            updates["next_due_date"] = ""
        else:
            base = parse_date(service_date) or date.today()
            if recurrence == "daily":
                next_due = base + timedelta(days=interval)
            elif recurrence == "weekly":
                next_due = base + timedelta(weeks=interval)
            else:
                next_due = add_months(base, interval)
            updates["next_due_date"] = next_due.isoformat()
        updated_plan = self.pm_plans.complete_cycle(plan["id"], updates)
        self.links.mark_completed(work_order["id"])
        AuditService.log_event(
            action="CLOSE",
            module="PM Plans",
            record_id=plan["id"],
            description=f"Completed PM Plan #{plan['id']} from Work Order #{work_order['id']} and calculated next due",
            old_values=plan,
            new_values=updated_plan,
        )

    def _due_info(self, plan: dict[str, Any]) -> dict[str, Any]:
        recurrence = recurrence_key(plan.get("recurrence_type"))
        if recurrence == "runtime hours":
            due_runtime = int(plan.get("next_due_runtime") or 0)
            if due_runtime <= 0:
                due_runtime = int(plan.get("last_runtime") or 0) + max(int(plan.get("interval_value") or 1), 1)
            current_hours = int(plan.get("current_hours") or 0)
            return {
                "is_due": current_hours >= due_runtime,
                "cycle_key": f"runtime:{due_runtime}",
                "due_date": date.today().isoformat(),
            }

        due_date = parse_date(plan.get("next_due_date")) or parse_date(plan.get("start_date")) or date.today()
        return {
            "is_due": due_date <= date.today(),
            "cycle_key": f"{recurrence}:{due_date.isoformat()}",
            "due_date": due_date.isoformat(),
        }

    def _generate_work_order(self, plan: dict[str, Any], due_date: str, cycle_key: str) -> dict[str, Any]:
        engineer_id = self._default_engineer_id()
        if not engineer_id:
            raise HTTPException(status_code=400, detail="No active resource is available for generated PM work orders")
        description_parts = [plan.get("description") or f"Preventive maintenance plan: {plan['name']}"]
        if plan.get("checklist_template"):
            description_parts.append(f"Checklist:\n{plan['checklist_template']}")
        task_lines = [f"{task['sequence']}. {task['task_name']}" for task in plan.get("tasks", [])]
        if task_lines:
            description_parts.append("Tasks:\n" + "\n".join(task_lines))
        if plan.get("planned_spare_parts"):
            description_parts.append(f"Planned Spare Parts:\n{plan['planned_spare_parts']}")
        work_order = self.work_orders.create(
            {
                "title": f"PM: {plan['name']}",
                "description": "\n\n".join(description_parts),
                "customer_id": int(plan["customer_id"]),
                "equipment_id": int(plan["equipment_id"]),
                "engineer_id": engineer_id,
                "scheduled_date": due_date,
                "due_date": due_date,
                "status": "pending",
                "priority": plan.get("priority") or "medium",
                "service_hours": int(plan.get("current_hours") or 0),
                "notes": f"Generated from PM Plan #{plan['id']} | Cycle {cycle_key}",
            }
        )
        self.links.create(
            {
                "pm_plan_id": int(plan["id"]),
                "work_order_id": int(work_order["id"]),
                "cycle_key": cycle_key,
                "status": "generated",
            }
        )
        AuditService.log_event(
            action="CREATE",
            module="Work Orders",
            record_id=work_order["id"],
            description=f"Auto-generated Work Order #{work_order['id']} from PM Plan #{plan['id']}",
            new_values={"pm_plan": plan, "work_order": work_order, "cycle_key": cycle_key},
        )
        return work_order

    def _default_engineer_id(self) -> int | None:
        engineers = self.engineers.list()
        active = [item for item in engineers if str(item.get("status", "active")).lower() == "active"]
        preferred = [item for item in active if str(item.get("role", "")).lower() in {"engineer", "admin", "super_admin"}]
        candidates = preferred or active
        return int(candidates[0]["id"]) if candidates else None


def normalize_recurrence_type(value: str | None) -> str:
    normalized = recurrence_key(value)
    mapping = {
        "daily": "Daily",
        "weekly": "Weekly",
        "monthly": "Monthly",
        "runtime hours": "Runtime Hours",
        "runtime": "Runtime Hours",
        "hours": "Runtime Hours",
    }
    if normalized not in mapping:
        raise HTTPException(status_code=400, detail="Invalid PM recurrence type")
    return mapping[normalized]
