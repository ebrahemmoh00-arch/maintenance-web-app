from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import HTTPException


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


def normalize_json_text(value: Any, default: str = "") -> str:
    if value in (None, ""):
        return default
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, default=str)
    text = str(value)
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON format") from exc


def minutes_between(start: str | None, end: str | None) -> int:
    if not start or not end:
        return 0
    try:
        started_at = datetime.fromisoformat(start)
        ended_at = datetime.fromisoformat(end)
    except ValueError:
        return 0
    return max(int((ended_at - started_at).total_seconds() // 60), 0)


def parse_datetime_value(value: str | None) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    for pattern in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, pattern)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def downtime_minutes(start: str | None, end: str | None) -> int:
    started_at = parse_datetime_value(start)
    ended_at = parse_datetime_value(end)
    if not started_at or not ended_at:
        return 0
    return max(int((ended_at - started_at).total_seconds() // 60), 0)


def format_hours(value: float | int) -> str:
    number = float(value or 0)
    if number >= 24 and number % 24 == 0:
        return f"{int(number // 24)}d"
    if number >= 10:
        return f"{number:.0f}h"
    return f"{number:.1f}h"
