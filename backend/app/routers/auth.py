from fastapi import APIRouter, Depends

from ..auth import CurrentUser, get_current_user, authenticate_user, issue_token_pair, logout_user, refresh_token_pair
from ..schemas import LoginRequest, LogoutRequest, TokenResponse, RefreshTokenRequest

router = APIRouter(tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest):
    user = authenticate_user(credentials.username, credentials.password)
    return issue_token_pair(user)


@router.post("/refresh-token", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest):
    return refresh_token_pair(payload.refresh_token)


@router.post("/logout")
def logout(payload: LogoutRequest, current_user: CurrentUser = Depends(get_current_user)):
    return logout_user(current_user.token_jti, payload.refresh_token)
