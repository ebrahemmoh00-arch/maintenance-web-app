from __future__ import annotations

import fnmatch
import logging
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from math import ceil
from typing import Deque

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("cmms.rate_limit")


EXEMPT_PATHS = {
    "/api/health",
    "/health",
    "/docs",
    "/docs/oauth2-redirect",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}

DEFAULT_HEAVY_PATHS = (
    "/api/dashboard*",
    "/api/reports*",
    "/api/audit-logs*",
    "/api/assets/*/history*",
    "/api/assets/*/timeline*",
    "/api/assets/*/measurements*",
)

DEFAULT_EXPORT_PATHS = (
    "*/export*",
    "*/pdf*",
    "*/print*",
)


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    limit: int
    window_seconds: int


_requests: dict[str, Deque[float]] = defaultdict(deque)


def _env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() not in {"0", "false", "no", "off"}


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(int(os.getenv(name, str(default)) or default), minimum)
    except ValueError:
        return default


def _env_patterns(name: str, defaults: tuple[str, ...]) -> tuple[str, ...]:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return defaults
    return tuple(item.strip() for item in raw_value.split(",") if item.strip())


def rate_limit_enabled() -> bool:
    return _env_bool("RATE_LIMIT_ENABLED", True)


def trust_proxy_headers() -> bool:
    return _env_bool("RATE_LIMIT_TRUST_PROXY_HEADERS", True)


def _client_ip_from_forwarded_header(header_value: str) -> str:
    for section in header_value.split(","):
        for item in section.split(";"):
            key, _, value = item.strip().partition("=")
            if key.lower() == "for" and value:
                return value.strip().strip('"').strip("[]")
    return ""


def client_identifier(request: Request) -> str:
    if trust_proxy_headers():
        for header in ("cf-connecting-ip", "x-real-ip"):
            value = request.headers.get(header, "").strip()
            if value:
                return value
        forwarded_for = request.headers.get("x-forwarded-for", "").strip()
        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()
        forwarded = request.headers.get("forwarded", "").strip()
        forwarded_ip = _client_ip_from_forwarded_header(forwarded)
        if forwarded_ip:
            return forwarded_ip
    return request.client.host if request.client else "unknown"


def _matches(path: str, patterns: tuple[str, ...]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def rate_limit_rule_for(request: Request) -> RateLimitRule | None:
    path = request.url.path.rstrip("/") or "/"
    if request.method == "OPTIONS" or path in EXEMPT_PATHS:
        return None
    if not path.startswith("/api"):
        return None

    window_seconds = _env_int("RATE_LIMIT_WINDOW_SECONDS", 60)
    if path == "/api/login":
        return RateLimitRule(
            name="login",
            limit=_env_int("RATE_LIMIT_LOGIN_PER_MINUTE", 5),
            window_seconds=window_seconds,
        )
    if path == "/api/refresh-token":
        return RateLimitRule(
            name="refresh_token",
            limit=_env_int("RATE_LIMIT_REFRESH_TOKEN_PER_MINUTE", 20),
            window_seconds=window_seconds,
        )
    if _matches(path, _env_patterns("RATE_LIMIT_EXPORT_PATHS", DEFAULT_EXPORT_PATHS)):
        return RateLimitRule(
            name="export",
            limit=_env_int("RATE_LIMIT_EXPORT_PER_MINUTE", 20),
            window_seconds=window_seconds,
        )
    if _matches(path, _env_patterns("RATE_LIMIT_HEAVY_PATHS", DEFAULT_HEAVY_PATHS)):
        return RateLimitRule(
            name="heavy",
            limit=_env_int("RATE_LIMIT_HEAVY_PER_MINUTE", 50),
            window_seconds=window_seconds,
        )
    return RateLimitRule(
        name="api",
        limit=_env_int("RATE_LIMIT_API_PER_MINUTE", 100),
        window_seconds=window_seconds,
    )


def _rate_key(request: Request, rule: RateLimitRule, identifier: str) -> str:
    return f"{rule.name}:{identifier}"


def _prune(bucket: Deque[float], now: float, window_seconds: int) -> None:
    threshold = now - window_seconds
    while bucket and bucket[0] <= threshold:
        bucket.popleft()


def reset_rate_limit_state() -> None:
    _requests.clear()


async def rate_limit_api_routes(request: Request, call_next):
    if not rate_limit_enabled():
        return await call_next(request)

    rule = rate_limit_rule_for(request)
    if rule is None:
        return await call_next(request)

    now = time.monotonic()
    identifier = client_identifier(request)
    key = _rate_key(request, rule, identifier)
    bucket = _requests[key]
    _prune(bucket, now, rule.window_seconds)

    if len(bucket) >= rule.limit:
        retry_after = max(ceil(rule.window_seconds - (now - bucket[0])), 1)
        logger.warning(
            "rate_limit_exceeded",
            extra={
                "event": "rate_limit_exceeded",
                "rate_limit_bucket": rule.name,
                "rate_limit_limit": rule.limit,
                "rate_limit_window_seconds": rule.window_seconds,
                "rate_limit_retry_after": retry_after,
                "client_ip": identifier,
                "request_method": request.method,
                "request_path": request.url.path,
            },
        )
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded"},
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(rule.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(retry_after),
            },
        )

    bucket.append(now)
    response = await call_next(request)
    response.headers.setdefault("X-RateLimit-Limit", str(rule.limit))
    response.headers.setdefault("X-RateLimit-Remaining", str(max(rule.limit - len(bucket), 0)))
    return response
