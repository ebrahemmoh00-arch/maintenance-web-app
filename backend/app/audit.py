from __future__ import annotations

import json
from contextvars import ContextVar
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from .database import get_connection, insert_row

AUDIT_CONTEXT: ContextVar[dict[str, Any] | None] = ContextVar("audit_context", default=None)
EGYPT_TIMEZONE = ZoneInfo("Africa/Cairo")

SENSITIVE_KEYS = {"password", "access_token", "refresh_token", "token", "token_jti"}

TABLE_MODULES = {
    "customers": "Locations",
    "equipment": "Assets",
    "work_orders": "Work Orders",
    "inventory_items": "Inventory",
    "engineers": "Users",
    "preventive_maintenance": "Preventive Maintenance",
    "job_titles": "Settings",
}

TABLE_LABELS = {
    "customers": "Location",
    "equipment": "Asset",
    "work_orders": "Work Order",
    "inventory_items": "Inventory Item",
    "engineers": "User",
    "preventive_maintenance": "Preventive Maintenance",
    "job_titles": "Job Title",
}


def set_audit_context(user: Any = None, ip_address: str = "", device_info: str = ""):
    payload = {
        "user_id": getattr(user, "id", ""),
        "user_name": getattr(user, "name", "") or getattr(user, "username", ""),
        "role": getattr(user, "role", ""),
        "ip_address": ip_address,
        "device_info": device_info,
    }
    return AUDIT_CONTEXT.set(payload)


def reset_audit_context(token) -> None:
    AUDIT_CONTEXT.reset(token)


def current_audit_context() -> dict[str, Any]:
    return AUDIT_CONTEXT.get() or {}


def client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else ""


def device_info(request) -> str:
    return request.headers.get("user-agent", "")


def clean_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: ("***" if key in SENSITIVE_KEYS else clean_value(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [clean_value(item) for item in value]
    return value


def to_json(value: Any) -> str:
    return json.dumps(clean_value(value or {}), ensure_ascii=False, default=str)


def changed_fields(old_values: dict[str, Any] | None, new_values: dict[str, Any] | None) -> list[str]:
    old_values = old_values or {}
    new_values = new_values or {}
    keys = sorted((set(old_values) | set(new_values)) - SENSITIVE_KEYS)
    return [key for key in keys if old_values.get(key) != new_values.get(key)]


def changed_subset(values: dict[str, Any] | None, fields: list[str]) -> dict[str, Any]:
    values = values or {}
    return {field: values.get(field) for field in fields}


def record_label(table: str, record: dict[str, Any] | None, record_id: Any = None) -> str:
    record = record or {}
    label = TABLE_LABELS.get(table, "Record")
    name = record.get("title") or record.get("name") or record.get("part_number") or record.get("employee_code") or record.get("task_name")
    identifier = record.get("id") or record_id or ""
    if name:
        return f"{label} #{identifier} - {name}"
    return f"{label} #{identifier}" if identifier else label


def infer_action(table: str, old_values: dict[str, Any] | None, new_values: dict[str, Any] | None, fallback: str) -> str:
    if fallback != "UPDATE":
        return fallback
    old_values = old_values or {}
    new_values = new_values or {}

    if table == "work_orders":
        old_status = str(old_values.get("status", "")).lower()
        new_status = str(new_values.get("status", "")).lower()
        if old_status != new_status:
            if new_status in {"completed", "closed", "close"}:
                return "CLOSE"
            if old_status in {"completed", "closed", "close"}:
                return "REOPEN"
            if new_status in {"approved", "approve"}:
                return "APPROVE"
            if new_status in {"rejected", "reject"}:
                return "REJECT"
        if old_values.get("engineer_id") != new_values.get("engineer_id"):
            return "ASSIGN" if new_values.get("engineer_id") else "UNASSIGN"

    if table == "engineers":
        if old_values.get("role") != new_values.get("role"):
            return "ROLE_CHANGE"
        if "password" in new_values:
            return "PASSWORD_CHANGE"

    return fallback


class AuditService:
    @staticmethod
    def log_event(
        *,
        action: str,
        module: str,
        record_id: Any = "",
        description: str = "",
        old_values: dict[str, Any] | None = None,
        new_values: dict[str, Any] | None = None,
        status: str = "SUCCESS",
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        context = {**current_audit_context(), **(context or {})}
        row = {
            "timestamp": datetime.now(EGYPT_TIMEZONE).isoformat(timespec="seconds"),
            "user_id": str(context.get("user_id", "")),
            "user_name": str(context.get("user_name", "")),
            "role": str(context.get("role", "")),
            "action": action,
            "module": module,
            "record_id": str(record_id or ""),
            "description": description,
            "old_values": to_json(old_values),
            "new_values": to_json(new_values),
            "ip_address": str(context.get("ip_address", "")),
            "device_info": str(context.get("device_info", "")),
            "status": status,
        }
        with get_connection() as db:
            log_id = insert_row(db, "audit_logs", row)
            db.commit()
        row["id"] = log_id
        return row

    @staticmethod
    def log_repository_action(table: str, fallback_action: str, old_values: dict[str, Any] | None, new_values: dict[str, Any] | None, record_id: Any) -> None:
        if table == "audit_logs":
            return
        fields = changed_fields(old_values, new_values)
        action = infer_action(table, old_values, new_values, fallback_action)
        module = TABLE_MODULES.get(table, table.replace("_", " ").title())
        target = new_values or old_values or {}
        description = f"{action.title().replace('_', ' ')} {record_label(table, target, record_id)}"
        if fields and action == "UPDATE":
            description += f". Changed fields: {', '.join(fields)}"
        AuditService.log_event(
            action=action,
            module=module,
            record_id=record_id,
            description=description,
            old_values=changed_subset(old_values, fields) if fallback_action == "UPDATE" else old_values,
            new_values=changed_subset(new_values, fields) if fallback_action == "UPDATE" else new_values,
        )

    @staticmethod
    def list_logs(filters: dict[str, Any], current_user: Any) -> list[dict[str, Any]]:
        where: list[str] = []
        params: list[Any] = []

        from_date = filters.get("from_date")
        to_date = filters.get("to_date")
        if from_date:
            where.append("timestamp >= ?")
            params.append(from_date)
        if to_date:
            where.append("timestamp <= ?")
            params.append(to_date)
        for key in ("user_id", "role", "module", "action", "status"):
            value = filters.get(key)
            if value:
                where.append(f"{key} = ?")
                params.append(value)
        search = filters.get("search")
        if search:
            where.append("(lower(user_name) LIKE lower(?) OR lower(description) LIKE lower(?) OR lower(record_id) LIKE lower(?))")
            term = f"%{search}%"
            params.extend([term, term, term])

        role = str(getattr(current_user, "role", "viewer"))
        if role not in {"admin", "super_admin"}:
            location = str(getattr(current_user, "work_location", "") or "")
            scoped_ids = AuditService._branch_user_ids(location) if role in {"branch_manager", "maintenance_manager", "supervisor"} and location else []
            if scoped_ids:
                placeholders = ", ".join(["?"] * len(scoped_ids))
                where.append(f"user_id IN ({placeholders})")
                params.extend([str(user_id) for user_id in scoped_ids])
            else:
                where.append("user_id = ?")
                params.append(str(getattr(current_user, "id", "")))

        limit = min(max(int(filters.get("limit") or 500), 1), 2000)
        clause = f"WHERE {' AND '.join(where)}" if where else ""
        with get_connection() as db:
            rows = db.execute(
                f"SELECT * FROM audit_logs {clause} ORDER BY timestamp DESC, id DESC LIMIT ?",
                (*params, limit),
            ).fetchall()
            return [dict(row) for row in rows]

    @staticmethod
    def get_log(log_id: int, current_user: Any) -> dict[str, Any]:
        rows = AuditService.list_logs({"limit": 2000}, current_user)
        for row in rows:
            if int(row["id"]) == int(log_id):
                return row
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Audit log not found")

    @staticmethod
    def _branch_user_ids(work_location: str) -> list[int]:
        with get_connection() as db:
            rows = db.execute("SELECT id FROM engineers WHERE work_location = ?", (work_location,)).fetchall()
            return [int(row["id"]) for row in rows]
