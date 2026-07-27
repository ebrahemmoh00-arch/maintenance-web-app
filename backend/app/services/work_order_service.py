from __future__ import annotations

import json
from datetime import date
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..repositories import AssetLifecycleRepository, CustomerRepository, EngineerRepository, EquipmentRepository, InventoryRepository, WorkOrderRepository
from .asset_service import AssetLifecycleService
from .common import WORK_ORDER_STATE_TRANSITIONS, WORK_ORDER_TERMINAL_STATUSES, minutes_between, payload, status_value, utc_timestamp
from .inventory_email_alerts import InventoryEmailAlertService
from .pm_service import PMPlanEngineService
from .reliability_service import FailureManagementService

class WorkOrderService:
    def __init__(self) -> None:
        self.repo = WorkOrderRepository()
        self.customers = CustomerRepository()
        self.equipment = EquipmentRepository()
        self.engineers = EngineerRepository()
        self.inventory = InventoryRepository()
        self.inventory_email_alerts = InventoryEmailAlertService()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        self._validate_assignments(item)
        self._validate_inventory_parts_available(item.get("notes"))
        item["status"] = status_value(item.get("status") or "new")
        created = self.repo.create(item)
        self.repo.add_timeline(
            created["id"],
            "CREATED",
            "",
            created["status"],
            description=f"Work order #{created['id']} created",
        )
        AssetLifecycleRepository().add_history(
            created["equipment_id"],
            "Work Order Created",
            f"Work Order #{created['id']} created",
            created.get("description") or created.get("title") or "Work order created",
            "Work Orders",
            created["id"],
            created.get("engineer_id"),
            metadata={
                "status": created.get("status"),
                "work_order_id": created["id"],
                "technician_name": created.get("engineer_name", ""),
                "summary": created.get("title", ""),
            },
        )
        created, _ = self._sync_inventory_parts(self.repo.get(created["id"]))
        return created

    def update(self, item_id: int, data):
        item = payload(data)
        self._validate_assignments(item)
        old_order = self.repo.get(item_id)
        self._validate_inventory_parts_available(item.get("notes"), old_order.get("notes"))
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
        updated, _ = self._sync_inventory_parts(updated)
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
        event_type = {
            "assigned": "Work Order Assigned",
            "in_progress": "Work Started",
            "completed": "Work Completed",
            "pending_supervisor_review": "Work Completed",
            "approved": "Work Approved",
            "closed": "Work Order Closed",
        }.get(to_status)
        if event_type:
            AssetLifecycleRepository().add_history(
                order["equipment_id"],
                event_type,
                event_type,
                description or f"Work Order #{order['id']} changed from {from_status} to {to_status}",
                "Work Orders",
                order["id"],
                actor_id,
                metadata={
                    "status": to_status,
                    "work_order_id": order["id"],
                    "technician_name": actor_name or order.get("engineer_name", ""),
                    "event_time": (
                        order.get("assigned_at")
                        or order.get("started_at")
                        or order.get("completed_at")
                        or order.get("approved_at")
                        or order.get("closed_at")
                    ),
                },
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
        if deducted_parts:
            AssetLifecycleRepository().add_history(
                order["equipment_id"],
                "Spare Parts Issued",
                "Spare parts issued",
                f"{len(deducted_parts)} spare part entries issued for Work Order #{order['id']}",
                "Work Orders",
                order["id"],
                order.get("engineer_id"),
                metadata={
                    "status": "issued",
                    "work_order_id": order["id"],
                    "parts_used": deducted_parts,
                    "technician_name": order.get("engineer_name", ""),
                },
            )
        AssetLifecycleService().record_work_order_closed(order, deducted_parts)
        FailureManagementService().create_from_work_order(order)
        AuditService.log_event(
            action="CLOSE",
            module="Work Orders",
            record_id=order["id"],
            description=f"Closed Work Order #{order['id']} and updated asset history, inventory, KPIs, and notifications",
            new_values={"asset_id": order["equipment_id"], "runtime": runtime, "deducted_parts": deducted_parts},
        )

    def _deduct_inventory_parts(self, order: dict[str, Any]) -> list[dict[str, Any]]:
        order, movements = self._sync_inventory_parts(order)
        return [movement for movement in movements if movement.get("action") == "ISSUE"]

    def _validate_inventory_parts_available(self, notes_value: str | None, previous_notes_value: str | None = None) -> None:
        notes = self._work_order_document_notes(notes_value)
        if not notes:
            return
        previous_notes = self._work_order_document_notes(previous_notes_value)
        requested = self._requested_inventory_quantities(notes)
        previous = self._issued_inventory_quantities(previous_notes)
        inventory = {int(item["id"]): item for item in self.inventory.list()}
        for item_id, requested_qty in requested.items():
            previous_qty = previous.get(item_id, 0)
            if requested_qty <= previous_qty:
                continue
            item = inventory.get(item_id)
            available = int(item.get("stock_quantity") or 0) if item else 0
            needed = requested_qty - previous_qty
            if needed > available:
                name = item.get("name") if item else f"Inventory item #{item_id}"
                raise HTTPException(status_code=400, detail=f"Insufficient inventory stock for {name}. Available: {available}, requested: {needed}")

    def _sync_inventory_parts(self, order: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        try:
            notes = json.loads(order.get("notes") or "{}")
        except json.JSONDecodeError:
            return order, []
        if not notes.get("__workOrderDocument"):
            return order, []
        requested = self._requested_inventory_quantities(notes)
        issued = self._issued_inventory_quantities(notes)
        inventory = {int(item["id"]): item for item in self.inventory.list()}
        movements: list[dict[str, Any]] = []
        for item_id in sorted(set(requested) | set(issued)):
            item = inventory.get(item_id)
            if not item:
                continue
            requested_qty = requested.get(item_id, 0)
            issued_qty = issued.get(item_id, 0)
            delta = requested_qty - issued_qty
            if delta == 0:
                continue
            old_quantity = int(item.get("stock_quantity") or 0)
            new_quantity = max(old_quantity - delta, 0) if delta > 0 else old_quantity + abs(delta)
            if new_quantity == old_quantity:
                continue
            updated_item = self.inventory.update(item["id"], {"stock_quantity": new_quantity, "linked_work_order_id": order["id"]})
            self.inventory_email_alerts.notify_if_threshold_crossed(updated_item, item, source=f"Work Order #{order['id']}")
            movements.append({
                "action": "ISSUE" if delta > 0 else "RETURN",
                "inventory_item_id": item["id"],
                "name": item["name"],
                "quantity": abs(delta),
                "old_quantity": old_quantity,
                "new_quantity": new_quantity,
            })
        next_issues = [
            {
                "inventory_item_id": item_id,
                "name": inventory[item_id].get("name", ""),
                "qty": qty,
            }
            for item_id, qty in sorted(requested.items())
            if qty > 0 and item_id in inventory
        ]
        if movements or notes.get("inventory_issues") != next_issues:
            notes["inventory_issues"] = next_issues
            notes["inventory_deducted_at"] = utc_timestamp() if next_issues else ""
            order = self.repo.update(order["id"], {"notes": json.dumps(notes, ensure_ascii=False, default=str)})
            for movement in movements:
                AuditService.log_event(
                    action=movement["action"],
                    module="Inventory",
                    record_id=movement["inventory_item_id"],
                    description=f"{movement['action'].title()} {movement['quantity']} {movement['name']} for Work Order #{order['id']}",
                    old_values={"stock_quantity": movement["old_quantity"]},
                    new_values={"stock_quantity": movement["new_quantity"], "work_order_id": order["id"]},
                )
        return order, movements

    def _work_order_document_notes(self, value: str | None) -> dict[str, Any]:
        if not value:
            return {}
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if parsed.get("__workOrderDocument") else {}

    def _requested_inventory_quantities(self, notes: dict[str, Any]) -> dict[int, int]:
        inventory_by_name = {str(item.get("name", "")).strip().lower(): int(item["id"]) for item in self.inventory.list()}
        requested_parts = notes.get("spare_parts_items") or []
        if not isinstance(requested_parts, list):
            return {}
        quantities: dict[int, int] = {}
        for part in requested_parts:
            item_id = part.get("inventory_item_id")
            if not item_id:
                item_id = inventory_by_name.get(str(part.get("name", "")).strip().lower())
            try:
                item_id = int(item_id or 0)
            except (TypeError, ValueError):
                item_id = 0
            quantity = int(part.get("qty") or 0)
            if item_id > 0 and quantity > 0:
                quantities[item_id] = quantities.get(item_id, 0) + quantity
        return quantities

    def _issued_inventory_quantities(self, notes: dict[str, Any]) -> dict[int, int]:
        issues = notes.get("inventory_issues") or []
        if not isinstance(issues, list):
            return {}
        quantities: dict[int, int] = {}
        for issue in issues:
            try:
                item_id = int(issue.get("inventory_item_id") or 0)
            except (TypeError, ValueError):
                item_id = 0
            quantity = int(issue.get("qty") or issue.get("quantity") or 0)
            if item_id > 0 and quantity > 0:
                quantities[item_id] = quantities.get(item_id, 0) + quantity
        return quantities


