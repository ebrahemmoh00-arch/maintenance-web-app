from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..repositories import AssetLifecycleRepository, EngineerRepository, EquipmentRepository, PMPlanHistoryRepository, PMPlanRepository, PMPlanTaskRepository, PMPlanWorkOrderRepository, PreventiveMaintenanceRepository, WorkOrderRepository, parse_date
from .common import payload

class PreventiveMaintenanceService:
    def __init__(self) -> None:
        self.repo = PreventiveMaintenanceRepository()
        self.equipment = EquipmentRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        self.equipment.get(item["equipment_id"])
        created = self.repo.create(item)
        AssetLifecycleRepository().add_history(
            created["equipment_id"],
            "Preventive Maintenance",
            created.get("task_name", "Preventive maintenance task"),
            "Preventive maintenance task created",
            "Preventive Maintenance",
            created["id"],
            metadata={"status": created.get("status"), "summary": created.get("task_name", "")},
        )
        return created

    def update(self, item_id: int, data):
        item = payload(data)
        if "equipment_id" in item:
            self.equipment.get(item["equipment_id"])
        updated = self.repo.update(item_id, item)
        if "last_service_hours" in item:
            AssetLifecycleRepository().add_history(
                updated["equipment_id"],
                "Preventive Maintenance",
                updated.get("task_name", "Preventive maintenance completed"),
                f"Maintenance recorded at {updated.get('last_service_hours') or 0} operating hours",
                "Preventive Maintenance",
                updated["id"],
                metadata={
                    "status": updated.get("status"),
                    "summary": updated.get("task_name", ""),
                    "event_time": updated.get("last_service_date") or date.today().isoformat(),
                },
            )
        return updated

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
        self.history = PMPlanHistoryRepository()
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
        result = self.repo.get(updated["id"])
        if result.get("previous_records") and any(key in item for key in {"recurrence_type", "interval_value", "start_date", "last_service_date", "last_runtime"}):
            result = self._recalculate_from_history(item_id)
        return result

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

    def create_history_record(self, plan_id: int, data):
        plan = self.repo.get(plan_id)
        record = self.history.create_for_plan(plan, payload(data))
        updated_plan = self._recalculate_from_history(plan_id)
        AuditService.log_event(
            action="UPDATE",
            module="PM Plans",
            record_id=plan_id,
            description=f"Added previous maintenance record #{record['id']} for PM Plan #{plan_id}",
            old_values=plan,
            new_values=updated_plan,
        )
        AssetLifecycleRepository().add_history(
            updated_plan["equipment_id"],
            "Preventive Maintenance",
            updated_plan.get("name", "PM Plan"),
            f"PM plan maintenance recorded at {record.get('service_hours') or 0} operating hours",
            "PM Plans",
            updated_plan["id"],
            metadata={
                "status": updated_plan.get("status"),
                "summary": updated_plan.get("name", ""),
                "event_time": record.get("service_date") or date.today().isoformat(),
            },
        )
        return updated_plan

    def update_history_record(self, record_id: int, data):
        record = self.history.get(record_id)
        plan = self.repo.get(record["pm_plan_id"])
        updated_record = self.history.update(record_id, payload(data))
        updated_plan = self._recalculate_from_history(record["pm_plan_id"])
        AuditService.log_event(
            action="UPDATE",
            module="PM Plans",
            record_id=record["pm_plan_id"],
            description=f"Updated previous maintenance record #{record_id} for PM Plan #{record['pm_plan_id']}",
            old_values={"plan": plan, "record": record},
            new_values={"plan": updated_plan, "record": updated_record},
        )
        return updated_plan

    def run_scheduler(self):
        return PMPlanEngineService().run_due_plans()

    def _recalculate_from_history(self, plan_id: int) -> dict[str, Any]:
        plan = self.repo.get(plan_id)
        records = plan.get("previous_records") or []
        latest = self._latest_history_record(plan, records)
        if not latest:
            return plan

        recurrence = recurrence_key(plan.get("recurrence_type"))
        interval = max(int(plan.get("interval_value") or 1), 1)
        service_hours = int(latest.get("service_hours") or 0)
        service_date = latest.get("service_date") or date.today().isoformat()
        updates: dict[str, Any] = {
            "last_runtime": service_hours,
            "last_service_date": service_date,
        }

        if recurrence == "runtime hours":
            updates["next_due_runtime"] = service_hours + interval
            updates["next_due_date"] = ""
        else:
            base = parse_date(service_date) or parse_date(plan.get("start_date")) or date.today()
            if recurrence == "weekly":
                next_due = base + timedelta(weeks=interval)
            elif recurrence == "monthly":
                next_due = add_months(base, interval)
            else:
                next_due = base + timedelta(days=interval)
            updates["next_due_date"] = next_due.isoformat()
            updates["next_due_runtime"] = 0

        return self.repo.update(plan_id, updates)

    def _latest_history_record(self, plan: dict[str, Any], records: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not records:
            return None
        recurrence = recurrence_key(plan.get("recurrence_type"))
        if recurrence == "runtime hours":
            return max(
                records,
                key=lambda record: (
                    int(record.get("service_hours") or 0),
                    str(record.get("service_date") or ""),
                    int(record.get("id") or 0),
                ),
            )
        return max(
            records,
            key=lambda record: (
                parse_date(record.get("service_date")) or date.min,
                int(record.get("id") or 0),
            ),
        )

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
                base = parse_date(item.get("last_service_date")) or parse_date(item["start_date"]) or date.today()
                recurrence = recurrence_key(item.get("recurrence_type"))
                if recurrence == "weekly":
                    item["next_due_date"] = (base + timedelta(weeks=item["interval_value"])).isoformat()
                elif recurrence == "monthly":
                    item["next_due_date"] = add_months(base, item["interval_value"]).isoformat()
                else:
                    item["next_due_date"] = (base + timedelta(days=item["interval_value"])).isoformat()
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
