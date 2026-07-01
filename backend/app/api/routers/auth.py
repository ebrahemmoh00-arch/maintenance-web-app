from fastapi import APIRouter, Depends, HTTPException, Request

from ...core.audit import AuditService, client_ip, device_info
from ...core.auth import CurrentUser, get_current_user, authenticate_user, issue_token_pair, logout_user, refresh_token_pair
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
        AuditService.log_event(
            action="LOGIN",
            module="Authentication",
            description=f"Failed login attempt for {credentials.username}",
            status="FAILED",
            context=context,
        )
        raise
    token_pair = issue_token_pair(user)
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
    return refresh_token_pair(payload.refresh_token)


@router.post("/logout")
def logout(payload: LogoutRequest, request: Request, current_user: CurrentUser = Depends(get_current_user)):
    result = logout_user(current_user.token_jti, payload.refresh_token)
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
