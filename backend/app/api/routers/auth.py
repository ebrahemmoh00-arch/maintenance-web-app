from fastapi import APIRouter, Depends, HTTPException, Request

from ...core.audit import AuditService, client_ip, device_info
from ...core.auth import CurrentUser, get_current_user, authenticate_user, issue_token_pair, logout_user, refresh_token_pair
from ...core.structured_logging import log_authentication_event, update_log_context
from ...schemas import LoginRequest, LogoutRequest, TokenResponse, RefreshTokenRequest

router = APIRouter(tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request):
    context = {
        "user_name": credentials.username,
        "ip_address": client_ip(request),
        "device_info": device_info(request),
    }
    try:
        user = authenticate_user(credentials.username, credentials.password)
    except HTTPException:
        log_authentication_event("login_failed", username=credentials.username, status="FAILED", reason="invalid_credentials")
        AuditService.log_event(
            action="LOGIN",
            module="Authentication",
            description=f"Failed login attempt for {credentials.username}",
            status="FAILED",
            context=context,
        )
        raise
    token_pair = issue_token_pair(user)
    update_log_context(user_id=user["id"])
    log_authentication_event("login_succeeded", username=credentials.username, user_id=user["id"])
    AuditService.log_event(
        action="LOGIN",
        module="Authentication",
        record_id=user["id"],
        description=f"User {user.get('name') or user.get('username')} logged in successfully",
        status="SUCCESS",
        context={**context, "user_id": user["id"], "user_name": user.get("name") or user.get("username"), "role": token_pair["user"]["role"]},
    )
    return token_pair


@router.post("/refresh-token", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest):
    try:
        token_pair = refresh_token_pair(payload.refresh_token)
    except HTTPException:
        log_authentication_event("refresh_token_failed", status="FAILED", reason="invalid_refresh_token")
        raise
    update_log_context(user_id=token_pair["user"]["id"])
    log_authentication_event("refresh_token_succeeded", user_id=token_pair["user"]["id"])
    return token_pair


@router.post("/logout")
def logout(payload: LogoutRequest, request: Request, current_user: CurrentUser = Depends(get_current_user)):
    result = logout_user(current_user.token_jti, payload.refresh_token)
    log_authentication_event("logout_succeeded", username=current_user.username, user_id=current_user.id)
    AuditService.log_event(
        action="LOGOUT",
        module="Authentication",
        record_id=current_user.id,
        description=f"User {current_user.name or current_user.username} logged out",
        context={
            "user_id": current_user.id,
            "user_name": current_user.name or current_user.username,
            "role": current_user.role,
            "ip_address": client_ip(request),
            "device_info": device_info(request),
        },
    )
    return result
