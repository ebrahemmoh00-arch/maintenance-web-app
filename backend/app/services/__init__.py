from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..repositories import CustomerRepository, EngineerRepository, EquipmentRepository, InventoryRepository, JobTitleRepository, PreventiveMaintenanceRepository, WorkOrderRepository
from ..core.security import hash_password, is_password_hash


def payload(model: Any) -> dict[str, Any]:
    return model.model_dump(exclude_unset=True)


class CustomerService:
    def __init__(self) -> None:
        self.repo = CustomerRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)
    def create(self, data): return self.repo.create(payload(data))
    def update(self, item_id: int, data): return self.repo.update(item_id, payload(data))
    def delete(self, item_id: int): return self.repo.delete(item_id)


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

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        self.customers.get(item["customer_id"])
        self._prepare_hierarchy_payload(item)
        return self.repo.create(item)

    def update(self, item_id: int, data):
        item = payload(data)
        if "customer_id" in item:
            self.customers.get(item["customer_id"])
        hierarchy_keys = {"parent_id", "asset_type", "asset_level", "asset_code", "criticality"}
        if hierarchy_keys.intersection(item):
            current = self.repo.get(item_id)
            merged = {**current, **item}
            self._prepare_hierarchy_payload(merged, item_id)
            for key in ("parent_id", "asset_type", "asset_level", "asset_code", "criticality", "customer_id"):
                if key in merged and key not in item:
                    item[key] = merged[key]
        return self.repo.update(item_id, item)

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


class WorkOrderService:
    def __init__(self) -> None:
        self.repo = WorkOrderRepository()
        self.customers = CustomerRepository()
        self.equipment = EquipmentRepository()
        self.engineers = EngineerRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        self._validate_assignments(item)
        return self.repo.create(item)

    def update(self, item_id: int, data):
        item = payload(data)
        self._validate_assignments(item)
        return self.repo.update(item_id, item)

    def delete(self, item_id: int): return self.repo.delete(item_id)
    def dashboard(self): return self.repo.dashboard_stats()
    def schedule(self): return self.repo.schedule()

    def _validate_assignments(self, item: dict[str, Any]) -> None:
        if "customer_id" in item:
            self.customers.get(item["customer_id"])
        if "equipment_id" in item:
            equipment = self.equipment.get(item["equipment_id"])
            if "customer_id" in item and equipment["customer_id"] != item["customer_id"]:
                raise HTTPException(status_code=400, detail="Equipment does not belong to the selected customer")
        if "engineer_id" in item:
            self.engineers.get(item["engineer_id"])


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
