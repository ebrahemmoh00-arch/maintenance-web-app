from __future__ import annotations

import json
import logging
import os
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

from .config import is_production


SENSITIVE_FIELD_FRAGMENTS = (
    "authorization",
    "password",
    "secret",
    "token",
    "refresh",
    "jwt",
    "cookie",
    "set-cookie",
)

CORRELATION_ID_HEADER = "X-Correlation-ID"

_request_context: ContextVar[dict[str, Any]] = ContextVar("structured_log_context", default={})


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            **current_log_context(),
        }
        payload.update(safe_extra_fields(record))
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(sanitize_log_payload(payload), ensure_ascii=False, default=str)


class HumanLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="seconds")
        fields = {**current_log_context(), **safe_extra_fields(record)}
        compact = " ".join(f"{key}={value}" for key, value in sanitize_log_payload(fields).items() if value not in {"", None})
        message = f"{timestamp} {record.levelname:<8} {record.name} {record.getMessage()}"
        if compact:
            message = f"{message} {compact}"
        if record.exc_info:
            message = f"{message}\n{self.formatException(record.exc_info)}"
        return message


def configure_logging() -> None:
    level_name = os.getenv("LOG_LEVEL", "INFO").strip().upper() or "INFO"
    level = getattr(logging, level_name, logging.INFO)
    format_mode = os.getenv("LOG_FORMAT", "auto").strip().lower()
    formatter: logging.Formatter
    if format_mode == "json" or (format_mode == "auto" and is_production()):
        formatter = JsonLogFormatter()
    else:
        formatter = HumanLogFormatter()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(logger_name).handlers.clear()
        logging.getLogger(logger_name).propagate = True


def current_log_context() -> dict[str, Any]:
    context = _request_context.get() or {}
    return {
        "correlation_id": context.get("correlation_id", ""),
        "user_id": context.get("user_id", ""),
        "company_id": context.get("company_id", ""),
        "request_path": context.get("request_path", ""),
        "http_method": context.get("http_method", ""),
        "status_code": context.get("status_code", ""),
        "execution_time_ms": context.get("execution_time_ms", ""),
    }


def bind_request_context(*, correlation_id: str, request_path: str, http_method: str):
    return _request_context.set(
        {
            "correlation_id": correlation_id,
            "company_id": "",
            "request_path": request_path,
            "http_method": http_method,
            "status_code": "",
            "execution_time_ms": "",
            "user_id": "",
        }
    )


def reset_request_context(token) -> None:
    _request_context.reset(token)


def update_log_context(**fields: Any) -> None:
    context = dict(_request_context.get() or {})
    context.update({key: value for key, value in fields.items() if value is not None})
    _request_context.set(context)


def correlation_id_from_request(request) -> str:
    return (
        request.headers.get(CORRELATION_ID_HEADER)
        or request.headers.get("X-Request-ID")
        or request.headers.get("X-Amzn-Trace-Id")
        or str(uuid.uuid4())
    )


def sanitize_log_payload(value: Any) -> Any:
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if is_sensitive_key(str(key)):
                result[key] = "***"
            else:
                result[key] = sanitize_log_payload(item)
        return result
    if isinstance(value, list):
        return [sanitize_log_payload(item) for item in value]
    if isinstance(value, tuple):
        return tuple(sanitize_log_payload(item) for item in value)
    return value


def is_sensitive_key(key: str) -> bool:
    lowered = key.lower()
    return any(fragment in lowered for fragment in SENSITIVE_FIELD_FRAGMENTS)


def safe_extra_fields(record: logging.LogRecord) -> dict[str, Any]:
    standard = {
        "args",
        "asctime",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "module",
        "msecs",
        "message",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "stack_info",
        "thread",
        "threadName",
    }
    return {key: value for key, value in record.__dict__.items() if key not in standard and not key.startswith("_")}


def log_event(logger: logging.Logger, level: int, event: str, **fields: Any) -> None:
    exc_info = fields.pop("exc_info", None)
    logger.log(level, event, extra={"event": event, **sanitize_log_payload(fields)}, exc_info=exc_info)


def log_authentication_event(event: str, *, username: str = "", user_id: Any = "", status: str = "SUCCESS", reason: str = "") -> None:
    log_event(
        logging.getLogger("cmms.authentication"),
        logging.INFO if status == "SUCCESS" else logging.WARNING,
        event,
        username=username,
        user_id=user_id,
        auth_status=status,
        reason=reason,
    )


def log_authorization_failure(*, permission: str = "", user_id: Any = "", role: str = "", request_path: str = "") -> None:
    log_event(
        logging.getLogger("cmms.authorization"),
        logging.WARNING,
        "authorization_failure",
        permission=permission,
        user_id=user_id,
        role=role,
        request_path=request_path,
    )


def log_database_failure(*, operation: str, backend: str, error: BaseException) -> None:
    log_event(
        logging.getLogger("cmms.database"),
        logging.ERROR,
        "database_failure",
        database_operation=operation,
        database_backend=backend,
        error_type=error.__class__.__name__,
    )


def log_background_job(event: str, *, job_name: str, status: str = "SUCCESS", duration_ms: float | None = None, error: BaseException | None = None, **fields: Any) -> None:
    payload = {
        "job_name": job_name,
        "job_status": status,
        "duration_ms": round(duration_ms, 2) if duration_ms is not None else "",
        **fields,
    }
    if error is not None:
        payload["error_type"] = error.__class__.__name__
    log_event(
        logging.getLogger("cmms.background_jobs"),
        logging.INFO if status == "SUCCESS" else logging.WARNING,
        event,
        **payload,
    )


def log_file_upload(event: str, *, asset_id: Any = "", file_name: str = "", file_type: str = "", user_id: Any = "", status: str = "SUCCESS") -> None:
    log_event(
        logging.getLogger("cmms.file_uploads"),
        logging.INFO if status == "SUCCESS" else logging.WARNING,
        event,
        asset_id=asset_id,
        file_name=file_name,
        file_type=file_type,
        user_id=user_id,
        upload_status=status,
    )


def log_export_operation(event: str, *, export_type: str = "", module: str = "", user_id: Any = "", status: str = "SUCCESS") -> None:
    log_event(
        logging.getLogger("cmms.exports"),
        logging.INFO if status == "SUCCESS" else logging.WARNING,
        event,
        export_type=export_type,
        export_module=module,
        user_id=user_id,
        export_status=status,
    )


def monotonic_ms(start_time: float) -> float:
    return round((time.perf_counter() - start_time) * 1000, 2)
