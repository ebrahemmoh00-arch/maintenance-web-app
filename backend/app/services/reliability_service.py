from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..repositories import AssetLifecycleRepository, CauseCodeRepository, CorrectiveActionRepository, DowntimeEventRepository, EngineerRepository, EquipmentRepository, FailureCodeRepository, FailureEventRepository, FailureStatisticsRepository, PreventiveMaintenanceRepository, ProblemCodeRepository, RemedyCodeRepository, RootCauseAnalysisRepository, WorkOrderRepository
from .asset_service import AssetLifecycleService
from .common import downtime_minutes, format_hours, parse_datetime_value, payload, status_value, utc_timestamp

class FailureManagementService:
    def __init__(self) -> None:
        self.assets = EquipmentRepository()
        self.engineers = EngineerRepository()
        self.work_orders = WorkOrderRepository()
        self.pm = PreventiveMaintenanceRepository()
        self.failures = FailureEventRepository()
        self.downtime = DowntimeEventRepository()
        self.lifecycle = AssetLifecycleRepository()
        self.rca = RootCauseAnalysisRepository()
        self.corrective_actions = CorrectiveActionRepository()
        self.statistics = FailureStatisticsRepository()
        self.problem_codes = ProblemCodeRepository()
        self.failure_codes = FailureCodeRepository()
        self.cause_codes = CauseCodeRepository()
        self.remedy_codes = RemedyCodeRepository()

    def list(self): return self.failures.list()
    def get(self, item_id: int): return self.failures.get(item_id)
    def codes(self) -> dict[str, list[dict[str, Any]]]:
        return {
            "problem_codes": self.problem_codes.list(),
            "failure_codes": self.failure_codes.list(),
            "cause_codes": self.cause_codes.list(),
            "remedy_codes": self.remedy_codes.list(),
        }

    def create_code(self, code_type: str, data):
        repo = self._code_repo(code_type)
        return repo.create(payload(data))

    def update_code(self, code_type: str, code_id: int, data):
        repo = self._code_repo(code_type)
        return repo.update(code_id, payload(data))

    def upsert_rca(self, failure_id: int, data):
        failure = self.failures.get(failure_id)
        item = payload(data)
        item["failure_event_id"] = failure_id
        existing = self.rca.get_by_failure_event(failure_id)
        if existing:
            updated = self.rca.update(existing["id"], item)
        else:
            updated = self.rca.create(item)
        rca_status = "approved" if updated.get("approval_status") == "approved" else "in_progress"
        self.failures.update(failure_id, {"rca_status": rca_status})
        self.lifecycle.add_history(
            failure["asset_id"],
            "Root Cause Analysis",
            "RCA updated",
            updated.get("root_cause") or updated.get("cause") or "Root cause analysis updated",
            "Failure Events",
            failure_id,
            updated.get("approved_by_id"),
        )
        return updated

    def create(self, data):
        item = payload(data)
        item = self._prepare_failure_payload(item)
        created = self.failures.create(item)
        self.lifecycle.add_history(
            created["asset_id"],
            "Failure Recorded",
            created["failure_id"],
            created.get("failure_description") or "Failure event recorded",
            "Failure Events",
            created["id"],
            created.get("reported_by_id"),
            metadata={"failure_code": created.get("failure_id"), "severity": created.get("severity"), "status": created.get("status")},
        )
        self.lifecycle.add_event(
            created["asset_id"],
            "Failure",
            "critical" if created.get("severity") in {"critical", "high"} else "warning",
            created.get("status") or "open",
            created.get("failure_end") or "",
            created.get("failure_description") or "Failure event recorded",
            "Failure Events",
            created["id"],
        )
        if created.get("failure_end"):
            self.create_downtime_from_failure(created)
        ReliabilityService().refresh_asset(created["asset_id"])
        return self.failures.get(created["id"])

    def update(self, item_id: int, data):
        current = self.failures.get(item_id)
        item = payload(data)
        merged = {**current, **item}
        self._validate_failure_payload(merged, updating=True)
        if "breakdown_indicator" in item:
            item["breakdown_indicator"] = int(bool(item["breakdown_indicator"]))
        if "emergency_indicator" in item:
            item["emergency_indicator"] = int(bool(item["emergency_indicator"]))
        updated = self.failures.update(item_id, item)
        self.lifecycle.add_history(
            updated["asset_id"],
            "Failure Updated",
            updated["failure_id"],
            "Failure event updated",
            "Failure Events",
            updated["id"],
            metadata={"changed_fields": sorted(item.keys())},
        )
        ReliabilityService().refresh_asset(updated["asset_id"])
        return updated

    def approve(self, item_id: int, data):
        item = data if isinstance(data, dict) else payload(data)
        approved = self.failures.update(item_id, {"status": "approved", "rca_status": "approved"})
        self.lifecycle.add_history(
            approved["asset_id"],
            "Failure Approved",
            approved["failure_id"],
            item.get("notes", "Failure event approved"),
            "Failure Events",
            approved["id"],
            item.get("actor_id"),
        )
        AuditService.log_event(
            action="APPROVE",
            module="Failure Events",
            record_id=approved["id"],
            description=f"Failure event {approved['failure_id']} approved",
            new_values={"actor_id": item.get("actor_id")},
        )
        return approved

    def list_asset_failures(self, asset_id: int):
        self.assets.get(asset_id)
        return self.failures.list_for_asset(asset_id)

    def create_from_work_order(self, order: dict[str, Any]) -> dict[str, Any] | None:
        if not AssetLifecycleService()._is_breakdown(order):
            return None
        existing = self.failures.get_by_work_order(order["id"])
        if existing:
            ReliabilityService().refresh_asset(existing["asset_id"])
            return existing
        start_time = order.get("started_at") or order.get("scheduled_date") or utc_timestamp()
        end_time = order.get("closed_at") or order.get("completed_at") or utc_timestamp()
        created = self.create_raw(
            {
                "asset_id": order["equipment_id"],
                "failure_datetime": start_time,
                "failure_start": start_time,
                "failure_end": end_time,
                "detection_method": "Work Order",
                "failure_type": "Breakdown",
                "failure_category": order.get("priority") or "medium",
                "severity": "critical" if str(order.get("priority", "")).lower() == "critical" else "high",
                "operational_impact": "Production interruption",
                "breakdown_indicator": 1,
                "emergency_indicator": 1 if str(order.get("priority", "")).lower() == "critical" else 0,
                "failure_description": order.get("description") or order.get("title") or "Breakdown work order",
                "assigned_technician_id": order.get("engineer_id"),
                "linked_work_order_id": order["id"],
                "status": "resolved" if end_time else "open",
                "rca_status": "required" if str(order.get("priority", "")).lower() == "critical" else "not_required",
            }
        )
        self.create_downtime_from_failure(created, order)
        self.corrective_actions.create(
            {
                "failure_event_id": created["id"],
                "work_order_id": order["id"],
                "repair_type": "Breakdown Maintenance",
                "permanent_repair": 1,
                "labor_hours": round(float(order.get("work_duration_minutes") or 0) / 60, 2),
                "repair_notes": order.get("completion_notes") or order.get("technician_notes") or "",
                "status": "closed" if status_value(order.get("status")) == "closed" else "open",
            }
        )
        return created

    def create_raw(self, item: dict[str, Any]) -> dict[str, Any]:
        item = self._prepare_failure_payload(item)
        created = self.failures.create(item)
        self.lifecycle.add_history(
            created["asset_id"],
            "Failure Recorded",
            created["failure_id"],
            created.get("failure_description") or "Failure event recorded",
            "Failure Events",
            created["id"],
            metadata={"failure_code": created.get("failure_id"), "status": created.get("status")},
        )
        ReliabilityService().refresh_asset(created["asset_id"])
        return created

    def create_downtime_from_failure(self, failure: dict[str, Any], order: dict[str, Any] | None = None) -> dict[str, Any] | None:
        if order and self.downtime.get_by_work_order(order["id"]):
            return None
        start_time = failure.get("failure_start") or failure.get("failure_datetime")
        end_time = (failure.get("failure_end") or order.get("closed_at")) if order else failure.get("failure_end")
        if not start_time or not end_time:
            return None
        created = DowntimeService().create_raw(
            {
                "asset_id": failure["asset_id"],
                "start_time": start_time,
                "end_time": end_time,
                "planned": 0,
                "production_lost": 0,
                "downtime_category": "Unplanned",
                "downtime_reason": failure.get("failure_description") or failure.get("failure_type") or "Failure downtime",
                "linked_failure_id": failure["id"],
                "linked_work_order_id": failure.get("linked_work_order_id") or (order or {}).get("id"),
            }
        )
        return created

    def _prepare_failure_payload(self, item: dict[str, Any]) -> dict[str, Any]:
        now = utc_timestamp()
        item["failure_start"] = item.get("failure_start") or item.get("failure_datetime") or now
        item["failure_datetime"] = item.get("failure_datetime") or item["failure_start"]
        item["failure_id"] = item.get("failure_id") or self._generate_failure_id(item["asset_id"], item["failure_start"])
        item["breakdown_indicator"] = int(bool(item.get("breakdown_indicator")))
        item["emergency_indicator"] = int(bool(item.get("emergency_indicator")))
        self._validate_failure_payload(item)
        return item

    def _validate_failure_payload(self, item: dict[str, Any], updating: bool = False) -> None:
        self.assets.get(item["asset_id"])
        if item.get("reported_by_id"):
            self.engineers.get(item["reported_by_id"])
        if item.get("assigned_technician_id"):
            self.engineers.get(item["assigned_technician_id"])
        if item.get("linked_work_order_id"):
            self.work_orders.get(item["linked_work_order_id"])
            existing = self.failures.get_by_work_order(item["linked_work_order_id"])
            if existing and (not updating or int(existing["id"]) != int(item.get("id") or 0)):
                raise HTTPException(status_code=400, detail="A failure event already exists for this work order")
        if item.get("linked_pm_id"):
            self.pm.get(item["linked_pm_id"])
        for repo, key in [
            (self.problem_codes, "problem_code_id"),
            (self.failure_codes, "failure_code_id"),
            (self.cause_codes, "cause_code_id"),
            (self.remedy_codes, "remedy_code_id"),
        ]:
            if item.get(key):
                repo.get(item[key])
        start = parse_datetime_value(item.get("failure_start"))
        end = parse_datetime_value(item.get("failure_end"))
        if not start:
            raise HTTPException(status_code=400, detail="Failure start must be a valid date/time")
        if item.get("failure_end") and (not end or end < start):
            raise HTTPException(status_code=400, detail="Failure end cannot be before failure start")

    def _generate_failure_id(self, asset_id: int, failure_start: str) -> str:
        parsed = parse_datetime_value(failure_start) or datetime.now()
        return f"FAIL-{asset_id}-{parsed.strftime('%Y%m%d%H%M%S')}"

    def _code_repo(self, code_type: str):
        mapping = {
            "problem": self.problem_codes,
            "problem_codes": self.problem_codes,
            "failure": self.failure_codes,
            "failure_codes": self.failure_codes,
            "cause": self.cause_codes,
            "cause_codes": self.cause_codes,
            "remedy": self.remedy_codes,
            "remedy_codes": self.remedy_codes,
        }
        repo = mapping.get(str(code_type or "").strip().lower())
        if not repo:
            raise HTTPException(status_code=400, detail="Invalid reliability code type")
        return repo


class DowntimeService:
    def __init__(self) -> None:
        self.assets = EquipmentRepository()
        self.failures = FailureEventRepository()
        self.work_orders = WorkOrderRepository()
        self.downtime = DowntimeEventRepository()
        self.lifecycle = AssetLifecycleRepository()

    def list(self): return self.downtime.list()
    def get(self, item_id: int): return self.downtime.get(item_id)
    def list_asset_downtime(self, asset_id: int):
        self.assets.get(asset_id)
        return self.downtime.list_for_asset(asset_id)

    def create(self, data):
        return self.create_raw(payload(data))

    def create_raw(self, item: dict[str, Any]) -> dict[str, Any]:
        item = self._prepare_downtime_payload(item)
        created = self.downtime.create(item)
        self.lifecycle.add_history(
            created["asset_id"],
            "Downtime Started",
            "Downtime started",
            f"{round(created['total_downtime_minutes'] / 60, 2)} downtime hours",
            "Downtime Events",
            created["id"],
            metadata={
                "status": "open" if not created.get("end_time") else "closed",
                "downtime_duration_minutes": created.get("total_downtime_minutes", 0),
                "failure_code": created.get("linked_failure_id", ""),
                "work_order_id": created.get("linked_work_order_id"),
                "event_time": created.get("start_time"),
            },
        )
        if created.get("end_time"):
            self.lifecycle.add_history(
                created["asset_id"],
                "Downtime Ended",
                "Downtime ended",
                f"{round(created['total_downtime_minutes'] / 60, 2)} downtime hours",
                "Downtime Events",
                created["id"],
                metadata={
                    "status": "closed",
                    "downtime_duration_minutes": created.get("total_downtime_minutes", 0),
                    "failure_code": created.get("linked_failure_id", ""),
                    "work_order_id": created.get("linked_work_order_id"),
                    "event_time": created.get("end_time"),
                },
            )
        ReliabilityService().refresh_asset(created["asset_id"])
        return self.downtime.get(created["id"])

    def _prepare_downtime_payload(self, item: dict[str, Any]) -> dict[str, Any]:
        self.assets.get(item["asset_id"])
        if item.get("linked_failure_id"):
            self.failures.get(item["linked_failure_id"])
        if item.get("linked_work_order_id"):
            self.work_orders.get(item["linked_work_order_id"])
        start = parse_datetime_value(item.get("start_time"))
        end = parse_datetime_value(item.get("end_time"))
        if not start:
            raise HTTPException(status_code=400, detail="Downtime start time must be valid")
        if item.get("end_time"):
            if not end or end < start:
                raise HTTPException(status_code=400, detail="Downtime end cannot be before start")
            item["total_downtime_minutes"] = downtime_minutes(item.get("start_time"), item.get("end_time"))
        elif int(item.get("total_downtime_minutes") or 0) < 0:
            raise HTTPException(status_code=400, detail="Downtime cannot be negative")
        item["planned"] = int(bool(item.get("planned")))
        return item


class ReliabilityService:
    def __init__(self) -> None:
        self.assets = EquipmentRepository()
        self.failures = FailureEventRepository()
        self.downtime = DowntimeEventRepository()
        self.statistics = FailureStatisticsRepository()
        self.lifecycle = AssetLifecycleRepository()

    def refresh_asset(self, asset_id: int) -> dict[str, Any]:
        asset = self.assets.get(asset_id)
        failures = self.failures.list_for_asset(asset_id)
        downtimes = self.downtime.list_for_asset(asset_id)
        total_downtime_minutes = sum(int(row.get("total_downtime_minutes") or 0) for row in downtimes)
        total_downtime_hours = round(total_downtime_minutes / 60, 2)
        repair_hours = [
            downtime_minutes(row.get("failure_start"), row.get("failure_end")) / 60
            for row in failures
            if row.get("failure_start") and row.get("failure_end")
        ]
        failure_count = len(failures)
        average_downtime_hours = round(total_downtime_hours / failure_count, 2) if failure_count else 0
        mttr = round(sum(repair_hours) / len(repair_hours), 2) if repair_hours else 0
        current_hours = float(asset.get("current_hours") or 0)
        mtbf = round(current_hours / failure_count, 2) if current_hours and failure_count else current_hours
        planned_hours = max(current_hours, total_downtime_hours, 720)
        availability = round(max(((planned_hours - total_downtime_hours) / planned_hours) * 100, 0), 2)
        downtime_percent = round((total_downtime_hours / planned_hours) * 100, 2) if planned_hours else 0
        reliability = max(0, min(100, round(100 - failure_count * 3 - total_downtime_hours * 1.2, 2)))
        repair_cost = float(asset.get("total_maintenance_cost") or 0) + float(asset.get("labor_cost") or 0) + float(asset.get("contractor_cost") or 0)
        result = self.statistics.upsert(
            asset_id,
            {
                "mtbf_hours": mtbf,
                "mttr_hours": mttr,
                "availability_percent": availability,
                "reliability_percent": reliability,
                "failure_frequency": failure_count,
                "total_downtime_hours": total_downtime_hours,
                "downtime_percent": downtime_percent,
                "average_repair_time_hours": mttr,
                "repair_cost": repair_cost,
                "downtime_cost": 0,
                "metadata": {"asset_name": asset.get("name"), "asset_code": asset.get("asset_code")},
            },
        )
        health_score = max(0, min(100, round((availability + reliability) / 2)))
        self.lifecycle.upsert_health(
            asset_id,
            {
                "health_score": health_score,
                "health_status": AssetLifecycleService()._health_status(health_score),
                "availability": availability,
                "mtbf": mtbf,
                "mttr": mttr,
                "total_downtime_hours": total_downtime_hours,
                "maintenance_cost": repair_cost,
                "failure_frequency": failure_count,
                "metadata": {"source": "Failure Reliability Engine"},
            },
        )
        return result

    def asset_statistics(self, asset_id: int):
        return self.refresh_asset(asset_id)

    def dashboard(self) -> dict[str, Any]:
        assets = self.assets.list()
        stats = [self.refresh_asset(asset["id"]) for asset in assets]
        failures = self.failures.list()
        downtimes = self.downtime.list()
        total_downtime_hours = round(sum(float(item.get("total_downtime_minutes") or 0) for item in downtimes) / 60, 2)
        failure_count = len(failures)
        average_downtime_hours = round(total_downtime_hours / failure_count, 2) if failure_count else 0
        mttr = round(sum(float(item.get("mttr_hours") or 0) for item in stats) / max(len(stats), 1), 2)
        mtbf_values = [float(item.get("mtbf_hours") or 0) for item in stats if float(item.get("mtbf_hours") or 0) > 0]
        mtbf = round(sum(mtbf_values) / max(len(mtbf_values), 1), 2) if mtbf_values else 0
        availability_values = [float(item.get("availability_percent") or 100) for item in stats]
        availability = round(sum(availability_values) / max(len(availability_values), 1), 2) if availability_values else 100
        reliability_score = max(0, min(100, round(100 - failure_count * 3 - total_downtime_hours * 1.2)))
        bad_actors = self._bad_actors(stats)
        downtime_series = self._series_by_date(downtimes, "start_time", "total_downtime_minutes", divide_by=60)
        failure_series = self._series_by_date(failures, "failure_datetime")
        cause_counts = self._top_failure_causes(failures)
        return {
            "badActors": bad_actors,
            "topFailureAssets": bad_actors,
            "topFailureCauses": cause_counts,
            "downtimeSeries": downtime_series or [{"label": "No data", "value": 0}],
            "failureTrend": failure_series or [{"label": "No data", "value": 0}],
            "totalDowntimeHours": total_downtime_hours,
            "currentDowntimeHours": round(sum(float(item.get("total_downtime_minutes") or 0) for item in downtimes if not item.get("end_time")) / 60, 2),
            "criticalFailures": len([item for item in failures if str(item.get("severity", "")).lower() == "critical"]),
            "failureCount": failure_count,
            "averageDowntimeHours": average_downtime_hours,
            "repeatFailures": len([asset for asset in bad_actors if int(asset.get("faults") or 0) > 1]),
            "mttrHours": mttr,
            "mtbfHours": mtbf,
            "availabilityPercent": availability,
            "downtimePercent": round((total_downtime_hours / max(sum(float(asset.get("current_hours") or 0) for asset in assets), 720)) * 100, 2),
            "downtimeLabel": format_hours(total_downtime_hours),
            "mttrLabel": format_hours(mttr),
            "mtbfLabel": format_hours(mtbf) if mtbf else "N/A",
            "score": reliability_score,
            "heatMap": self._failure_heat_map(failures, assets),
        }

    def _bad_actors(self, stats: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "id": item.get("asset_id"),
                "name": item.get("asset_name") or f"Asset {item.get('asset_id')}",
                "faults": int(item.get("failure_frequency") or 0),
                "downtimeHours": float(item.get("total_downtime_hours") or 0),
                "downtimeLabel": format_hours(float(item.get("total_downtime_hours") or 0)),
                "impactScore": round(int(item.get("failure_frequency") or 0) * 10 + float(item.get("total_downtime_hours") or 0) * 2),
            }
            for item in sorted(stats, key=lambda row: (float(row.get("total_downtime_hours") or 0), int(row.get("failure_frequency") or 0)), reverse=True)[:5]
            if int(item.get("failure_frequency") or 0) or float(item.get("total_downtime_hours") or 0)
        ]

    def _series_by_date(self, rows: list[dict[str, Any]], date_key: str, value_key: str | None = None, divide_by: int = 1) -> list[dict[str, Any]]:
        buckets: dict[str, float] = {}
        for row in rows:
            parsed = parse_datetime_value(row.get(date_key))
            if not parsed:
                continue
            key = parsed.strftime("%d-%b-%y")
            value = float(row.get(value_key) or 0) / divide_by if value_key else 1
            buckets[key] = buckets.get(key, 0) + value
        return [{"label": key, "value": round(value, 1)} for key, value in sorted(buckets.items())[-8:]]

    def _top_failure_causes(self, failures: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counts: dict[str, int] = {}
        for item in failures:
            label = item.get("failure_category") or item.get("failure_type") or item.get("severity") or "Unclassified"
            counts[label] = counts.get(label, 0) + 1
        return [{"label": key, "value": value} for key, value in sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))[:6]]

    def _failure_heat_map(self, failures: list[dict[str, Any]], assets: list[dict[str, Any]]) -> list[dict[str, Any]]:
        assets_by_id = {int(asset["id"]): asset for asset in assets}
        buckets: dict[str, int] = {}
        for item in failures:
            asset = assets_by_id.get(int(item.get("asset_id") or 0), {})
            key = f"{asset.get('location') or asset.get('site') or 'Unassigned'} / {item.get('severity') or 'medium'}"
            buckets[key] = buckets.get(key, 0) + 1
        return [{"label": key, "value": value} for key, value in sorted(buckets.items(), key=lambda pair: (-pair[1], pair[0]))[:12]]


