from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException

from ..repositories import AssetLifecycleRepository, CustomerRepository, EngineerRepository, EquipmentRepository, FailureStatisticsRepository, MeasurementTemplateRepository, PreventiveMaintenanceRepository, WorkOrderRepository, parse_date
from .common import normalize_json_text, payload, status_value

class MeasurementTemplateService:
    def __init__(self) -> None:
        self.repo = MeasurementTemplateRepository()
        self.engineers = EngineerRepository()
        self.assets = EquipmentRepository()

    def list(self, asset_id: int | None = None):
        return self.repo.list(asset_id)

    def get(self, item_id: int):
        return self.repo.get(item_id)

    def create(self, data, actor_id: int | None = None):
        item = self._prepare_payload(payload(data), actor_id)
        self._validate_unique_name(item["name"], asset_id=item.get("asset_id"))
        return self.repo.create(item)

    def update(self, item_id: int, data):
        current = self.repo.get(item_id)
        item = self._prepare_payload({**current, **payload(data)}, current.get("created_by_id"))
        if (
            item["name"].strip().lower() != str(current.get("name", "")).strip().lower()
            or int(item.get("asset_id") or 0) != int(current.get("asset_id") or 0)
        ):
            self._validate_unique_name(item["name"], item_id, item.get("asset_id"))
        return self.repo.update(item_id, item)

    def delete(self, item_id: int):
        return self.repo.delete(item_id)

    def _prepare_payload(self, item: dict[str, Any], actor_id: int | None = None) -> dict[str, Any]:
        name = str(item.get("name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Measurement type name is required")
        item["name"] = name
        item["status"] = str(item.get("status") or "active").strip().lower()
        if item["status"] not in {"active", "inactive"}:
            raise HTTPException(status_code=400, detail="Measurement template status must be active or inactive")
        item["table_schema"] = normalize_json_text(item.get("table_schema"), "[]")
        if item.get("asset_id"):
            self.assets.get(int(item["asset_id"]))
            item["asset_id"] = int(item["asset_id"])
        else:
            item["asset_id"] = None
        if item.get("created_by_id"):
            self.engineers.get(int(item["created_by_id"]))
        elif actor_id:
            item["created_by_id"] = actor_id
        return item

    def _validate_unique_name(self, name: str, item_id: int | None = None, asset_id: int | None = None) -> None:
        existing = self.repo.find_by_name(name, asset_id)
        if existing and int(existing["id"]) != int(item_id or 0):
            raise HTTPException(status_code=400, detail="Measurement type already exists")


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

        if parent_id is None and item["asset_level"] not in {"Site", "Equipment"}:
            raise HTTPException(status_code=400, detail="Only Site or main Equipment assets can be created without a parent")
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
        if parent_level == "Equipment" and child_level == "Equipment":
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
        self.templates = MeasurementTemplateRepository()

    def history(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.history(asset_id)

    def timeline(self, asset_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.timeline(asset_id)

    def delete_timeline_entry(self, asset_id: int, entry_id: int):
        self.assets.get(asset_id)
        return self.lifecycle.delete_history_entry(asset_id, entry_id)

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

    def add_measurement(self, asset_id: int, data, actor: Any | None = None):
        self.assets.get(asset_id)
        item = payload(data)
        if actor:
            item["created_by_id"] = getattr(actor, "id", None)
            item["user_name"] = getattr(actor, "name", "") or getattr(actor, "username", "")
        if float(item.get("value") or 0) < 0:
            raise HTTPException(status_code=400, detail="Measurement value cannot be negative")
        if item.get("template_id"):
            template = self.templates.get(int(item["template_id"]))
            item["measurement_type"] = item.get("measurement_type") or template["name"]
            item["unit"] = item.get("unit") or template.get("unit", "")
            item["table_snapshot"] = item.get("table_snapshot") or json.dumps(template, ensure_ascii=False, default=str)
        if item.get("measurement_table"):
            item["measurement_table"] = normalize_json_text(item.get("measurement_table"), "")
        created = self.lifecycle.add_measurement(asset_id, item)
        measurement_type = str(created.get("measurement_type") or "").lower()
        if measurement_type in {"hours", "runtime hours", "meter reading", "running hours"}:
            self.assets.update(asset_id, {"current_hours": int(float(created.get("value") or 0)), "current_reading": float(created.get("value") or 0)})
        else:
            self.assets.update(asset_id, {"current_reading": float(created.get("value") or 0)})
        self.refresh_health(asset_id)
        return created

    def delete_measurement(self, asset_id: int, measurement_id: int):
        self.assets.get(asset_id)
        deleted = self.lifecycle.delete_measurement(asset_id, measurement_id)
        self.refresh_health(asset_id)
        return deleted

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
        failure_stats = FailureStatisticsRepository().get(asset_id)
        if failure_stats:
            total_downtime = float(failure_stats.get("total_downtime_hours") or total_downtime)
            mttr = float(failure_stats.get("mttr_hours") or mttr)
            mtbf = float(failure_stats.get("mtbf_hours") or mtbf)
            availability = float(failure_stats.get("availability_percent") or availability)
            failures = [{}] * int(failure_stats.get("failure_frequency") or len(failures))
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


