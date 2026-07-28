from __future__ import annotations

import logging
import time

from fastapi import Request

from ..core.structured_logging import (
    CORRELATION_ID_HEADER,
    bind_request_context,
    correlation_id_from_request,
    log_event,
    monotonic_ms,
    reset_request_context,
    update_log_context,
)

logger = logging.getLogger("cmms.requests")


async def log_http_requests(request: Request, call_next):
    correlation_id = correlation_id_from_request(request)
    token = bind_request_context(
        correlation_id=correlation_id,
        request_path=request.url.path,
        http_method=request.method,
    )
    start_time = time.perf_counter()
    log_event(logger, logging.INFO, "request_started")
    try:
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = monotonic_ms(start_time)
            update_log_context(status_code=500, execution_time_ms=duration_ms)
            log_event(
                logger,
                logging.ERROR,
                "request_exception",
                error_type=exc.__class__.__name__,
                exc_info=True,
            )
            raise
        duration_ms = monotonic_ms(start_time)
        update_log_context(status_code=response.status_code, execution_time_ms=duration_ms)
        response.headers.setdefault(CORRELATION_ID_HEADER, correlation_id)
        log_event(logger, logging.INFO, "request_completed")
        return response
    finally:
        reset_request_context(token)
