from __future__ import annotations

import os

from fastapi import Request

from ..core.config import is_production


SWAGGER_PATHS = {
    "/docs",
    "/docs/oauth2-redirect",
    "/redoc",
    "/openapi.json",
}


DEVELOPMENT_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' data: blob: http: https:; "
    "font-src 'self' data: https://cdn.jsdelivr.net; "
    "connect-src 'self' http: https: ws: wss:; "
    "media-src 'self' data: blob:; "
    "frame-src 'self' data: blob:; "
    "worker-src 'self' blob:; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'self'"
)

PRODUCTION_CSP = (
    "default-src 'none'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; "
    "font-src 'self' data:; "
    "connect-src 'self'; "
    "media-src 'self' data: blob:; "
    "frame-src 'none'; "
    "worker-src 'self' blob:; "
    "object-src 'none'; "
    "base-uri 'none'; "
    "form-action 'none'; "
    "frame-ancestors 'none'"
)

SWAGGER_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "font-src 'self' data: https://cdn.jsdelivr.net; "
    "connect-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'self'"
)


def _env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() not in {"0", "false", "no", "off"}


def _env_int(name: str, default: int, minimum: int = 0) -> int:
    try:
        return max(int(os.getenv(name, str(default)) or default), minimum)
    except ValueError:
        return default


def _env_value(name: str, default: str) -> str:
    return os.getenv(name, "").strip() or default


def security_headers_enabled() -> bool:
    return _env_bool("SECURITY_HEADERS_ENABLED", True)


def csp_header_name() -> str:
    return "Content-Security-Policy-Report-Only" if _env_bool("SECURITY_CSP_REPORT_ONLY", False) else "Content-Security-Policy"


def content_security_policy(path: str) -> str:
    if path in SWAGGER_PATHS:
        return _env_value("SECURITY_CSP_SWAGGER", SWAGGER_CSP)

    csp_mode = _env_value("SECURITY_CSP_MODE", "auto").lower()
    if csp_mode == "development":
        return _env_value("SECURITY_CSP_DEVELOPMENT", DEVELOPMENT_CSP)
    if csp_mode == "production":
        return _env_value("SECURITY_CSP_PRODUCTION", PRODUCTION_CSP)
    if is_production():
        return _env_value("SECURITY_CSP_PRODUCTION", PRODUCTION_CSP)
    return _env_value("SECURITY_CSP_DEVELOPMENT", DEVELOPMENT_CSP)


def hsts_header_value() -> str:
    max_age = _env_int("SECURITY_HSTS_MAX_AGE", 31536000)
    include_subdomains = "; includeSubDomains" if _env_bool("SECURITY_HSTS_INCLUDE_SUBDOMAINS", True) else ""
    preload = "; preload" if _env_bool("SECURITY_HSTS_PRELOAD", False) else ""
    return f"max-age={max_age}{include_subdomains}{preload}"


def apply_security_headers(response, request: Request):
    path = request.url.path.rstrip("/") or "/"
    response.headers.setdefault(csp_header_name(), content_security_policy(path))
    response.headers.setdefault("X-Frame-Options", _env_value("SECURITY_FRAME_OPTIONS", "SAMEORIGIN"))
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", _env_value("SECURITY_REFERRER_POLICY", "strict-origin-when-cross-origin"))
    response.headers.setdefault(
        "Permissions-Policy",
        _env_value(
            "SECURITY_PERMISSIONS_POLICY",
            "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
        ),
    )
    if is_production() and _env_bool("SECURITY_HSTS_ENABLED", True):
        response.headers.setdefault("Strict-Transport-Security", hsts_header_value())
    return response


async def secure_http_responses(request: Request, call_next):
    response = await call_next(request)
    if not security_headers_enabled():
        return response
    return apply_security_headers(response, request)
