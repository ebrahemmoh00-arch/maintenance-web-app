from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from ..core.audit import client_ip, device_info, reset_audit_context, set_audit_context
from ..core.auth import authenticate_access_header

PUBLIC_API_PATHS = {
    "/api/login",
    "/api/refresh-token",
    "/api/health",
    "/health",
}


async def protect_api_routes(request: Request, call_next):
    path = request.url.path.rstrip("/") or "/"
    if request.method == "OPTIONS" or path in PUBLIC_API_PATHS or not path.startswith("/api"):
        return await call_next(request)
    try:
        current_user = authenticate_access_header(request.headers.get("Authorization"))
        request.state.current_user = current_user
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": "Access Denied"})
    token = set_audit_context(current_user, ip_address=client_ip(request), device_info=device_info(request))
    try:
        return await call_next(request)
    finally:
        reset_audit_context(token)
