from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError

from ..database import get_connection
from .config import jwt_secret_key
from .security import hash_password, is_password_hash, verify_password

JWT_SECRET_KEY = jwt_secret_key()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: int
    username: str
    name: str
    role: str
    permissions: str
    token_jti: str
    work_location: str = ""


ROLE_ALIASES = {
    "super admin": "super_admin",
    "super_admin": "super_admin",
    "admin": "super_admin",
    "branch manager": "branch_manager",
    "branch_manager": "branch_manager",
    "maintenance manager": "maintenance_manager",
    "maintenance_manager": "maintenance_manager",
    "engineer": "engineer",
    "supervisor": "supervisor",
    "technician": "technician",
    "store keeper": "store_keeper",
    "store_keeper": "store_keeper",
    "viewer": "viewer",
    "user": "viewer",
}

MODULE_ALIASES = {
    "customers": "customers",
    "equipment": "assets",
    "assets": "assets",
    "measurement-templates": "measurement_templates",
    "measurement_templates": "measurement_templates",
    "asset-history": "asset_history",
    "asset_history": "asset_history",
    "engineers": "users",
    "users": "users",
    "work-orders": "work_orders",
    "work_orders": "work_orders",
    "preventive-maintenance": "preventive_maintenance",
    "preventive_maintenance": "preventive_maintenance",
    "pm-plans": "pm_plans",
    "pm_plans": "pm_plans",
    "inventory": "inventory",
    "reports": "reports",
    "settings": "settings",
    "audit-logs": "audit_logs",
    "audit_logs": "audit_logs",
}

READ_ALL = {
    "customers:read",
    "assets:read",
    "asset_history:read",
    "measurement_templates:read",
    "work_orders:read",
    "inventory:read",
    "users:read",
    "reports:read",
    "settings:read",
    "preventive_maintenance:read",
    "pm_plans:read",
    "schedule:read",
    "dashboard:read",
    "alerts:read",
    "job_titles:read",
    "server_time:read",
}

ROLE_PERMISSIONS = {
    "super_admin": {"*"},
    "branch_manager": {
        *READ_ALL,
        "assets:write",
        "work_orders:create",
        "work_orders:update",
        "work_orders:delete",
        "audit_logs:read",
    },
    "maintenance_manager": {
        *READ_ALL,
        "assets:write",
        "work_orders:create",
        "work_orders:update",
        "work_orders:delete",
        "preventive_maintenance:create",
        "preventive_maintenance:update",
        "preventive_maintenance:delete",
        "pm_plans:create",
        "pm_plans:update",
        "pm_plans:delete",
        "pm_plans:run",
        "inventory:write",
        "job_titles:write",
        "audit_logs:read",
    },
    "engineer": {
        *READ_ALL,
        "assets:write",
        "work_orders:create",
        "work_orders:update",
        "preventive_maintenance:update",
        "pm_plans:read",
    },
    "supervisor": {
        *READ_ALL,
        "work_orders:create",
        "work_orders:update",
        "preventive_maintenance:create",
        "preventive_maintenance:update",
        "pm_plans:read",
        "pm_plans:create",
        "pm_plans:update",
    },
    "technician": {
        "assets:read",
        "work_orders:read",
        "work_orders:update",
        "preventive_maintenance:read",
        "pm_plans:read",
        "schedule:read",
        "dashboard:read",
        "alerts:read",
        "server_time:read",
    },
    "store_keeper": {
        "assets:read",
        "work_orders:read",
        "inventory:read",
        "pm_plans:read",
        "inventory:write",
        "dashboard:read",
        "alerts:read",
        "server_time:read",
    },
    "viewer": READ_ALL,
}


def access_denied(status_code: int = status.HTTP_403_FORBIDDEN) -> HTTPException:
    return HTTPException(status_code=status_code, detail="Access Denied")


def normalize_role(role: str | None) -> str:
    key = str(role or "viewer").strip().lower().replace("-", "_")
    return ROLE_ALIASES.get(key, ROLE_ALIASES.get(key.replace("_", " "), "viewer"))


def public_role(role: str | None) -> str:
    normalized = normalize_role(role)
    return "admin" if normalized == "super_admin" else normalized


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "employee_code": row.get("employee_code", ""),
        "name": row.get("name", ""),
        "email": row.get("email", ""),
        "phone": row.get("phone", ""),
        "specialty": row.get("specialty", ""),
        "job_title": row.get("job_title", ""),
        "department": row.get("department", ""),
        "work_location": row.get("work_location", ""),
        "supervisor": row.get("supervisor", ""),
        "username": row.get("username", ""),
        "role": public_role(row.get("role")),
        "permissions": row.get("permissions", ""),
        "status": row.get("status", "active"),
        "created_at": row.get("created_at", ""),
    }


def find_user_by_username(username: str) -> dict[str, Any] | None:
    identifier = username.strip()
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM engineers WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE",
            (identifier, identifier),
        ).fetchone()
        return dict(row) if row else None


def migrate_user_password(user_id: int, password: str) -> None:
    with get_connection() as db:
        db.execute("UPDATE engineers SET password = ? WHERE id = ?", (hash_password(password), user_id))
        db.commit()


def authenticate_user(username: str, password: str) -> dict[str, Any]:
    user = find_user_by_username(username)
    if not user or str(user.get("status", "active")).lower() != "active":
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    if not verify_password(password, user.get("password", "")):
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    if user.get("password") and not is_password_hash(user.get("password")):
        migrate_user_password(user["id"], password)
        user["password"] = hash_password(password)
    return user


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_jwt(user: dict[str, Any], token_type: str, expires_delta: timedelta) -> tuple[str, str, datetime]:
    now = utc_now()
    expires_at = now + expires_delta
    jti = str(uuid.uuid4())
    payload = {
        "sub": user["username"],
        "user_id": user["id"],
        "name": user.get("name", ""),
        "role": public_role(user.get("role")),
        "permissions": user.get("permissions", ""),
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    store_token(jti, user["username"], token_type, expires_at)
    return token, jti, expires_at


def issue_token_pair(user: dict[str, Any]) -> dict[str, Any]:
    access_token, _, access_expires_at = create_jwt(user, "access", timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token, _, _ = create_jwt(user, "refresh", timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": int((access_expires_at - utc_now()).total_seconds()),
        "user": public_user(user),
    }


def store_token(jti: str, username: str, token_type: str, expires_at: datetime) -> None:
    with get_connection() as db:
        db.execute(
            """
            INSERT INTO auth_tokens (jti, username, token_type, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (jti, username, token_type, expires_at.isoformat()),
        )
        db.commit()


def revoke_token(jti: str | None) -> None:
    if not jti:
        return
    with get_connection() as db:
        db.execute("UPDATE auth_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE jti = ?", (jti,))
        db.commit()


def token_is_active(jti: str, token_type: str) -> bool:
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM auth_tokens WHERE jti = ? AND token_type = ?",
            (jti, token_type),
        ).fetchone()
    if not row:
        return False
    item = dict(row)
    if item.get("revoked_at"):
        return False
    try:
        expires_at = datetime.fromisoformat(str(item["expires_at"]))
    except ValueError:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at > utc_now()


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except InvalidTokenError as exc:
        raise access_denied(status.HTTP_401_UNAUTHORIZED) from exc
    if payload.get("type") != expected_type:
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    jti = payload.get("jti")
    if not jti or not token_is_active(jti, expected_type):
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    return payload


def authenticate_access_header(authorization: str | None) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    payload = decode_token(authorization.split(" ", 1)[1].strip(), "access")
    user = find_user_by_username(payload.get("sub", ""))
    if not user or str(user.get("status", "active")).lower() != "active":
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    return CurrentUser(
        id=int(user["id"]),
        username=user.get("username", ""),
        name=user.get("name", ""),
        role=public_role(user.get("role")),
        permissions=user.get("permissions", ""),
        token_jti=payload["jti"],
        work_location=user.get("work_location", ""),
    )


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    existing = getattr(request.state, "current_user", None)
    if existing:
        return existing
    token = credentials.credentials if credentials else None
    if not token:
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    return authenticate_access_header(f"Bearer {token}")


def refresh_token_pair(refresh_token: str) -> dict[str, Any]:
    payload = decode_token(refresh_token, "refresh")
    user = find_user_by_username(payload.get("sub", ""))
    if not user or str(user.get("status", "active")).lower() != "active":
        raise access_denied(status.HTTP_401_UNAUTHORIZED)
    revoke_token(payload.get("jti"))
    return issue_token_pair(user)


def logout_user(access_jti: str, refresh_token: str | None = None) -> dict[str, bool]:
    revoke_token(access_jti)
    if refresh_token:
        try:
            payload = decode_token(refresh_token, "refresh")
            revoke_token(payload.get("jti"))
        except HTTPException:
            pass
    return {"ok": True}


def role_permissions(role: str | None) -> set[str]:
    return set(ROLE_PERMISSIONS.get(normalize_role(role), ROLE_PERMISSIONS["viewer"]))


def normalize_permission_name(permission: str) -> str:
    if ":" not in permission:
        return permission.strip()
    module_key, action = permission.split(":", 1)
    module = MODULE_ALIASES.get(str(module_key).strip(), str(module_key).strip())
    action_aliases = {
        "view": "read",
        "read": "read",
        "add": "create",
        "create": "create",
        "edit": "update",
        "update": "update",
        "delete": "delete",
        "write": "write",
        "emailAlerts": "email_alerts",
        "email_alerts": "email_alerts",
    }
    return f"{module}:{action_aliases.get(action.strip(), action.strip())}"


def custom_permissions(raw_permissions: str | None) -> set[str]:
    if not raw_permissions:
        return set()
    try:
        parsed = json.loads(raw_permissions) if isinstance(raw_permissions, str) else raw_permissions
    except json.JSONDecodeError:
        return {normalize_permission_name(item.strip()) for item in raw_permissions.split(",") if item.strip()}
    if not isinstance(parsed, dict):
        return set()

    permissions: set[str] = set()
    for module_key, actions in parsed.items():
        module = MODULE_ALIASES.get(str(module_key), str(module_key))
        if not isinstance(actions, dict):
            continue
        if actions.get("view"):
            permissions.add(f"{module}:read")
        if actions.get("add"):
            permissions.add(f"{module}:create")
            permissions.add(f"{module}:write")
        if actions.get("edit"):
            permissions.add(f"{module}:update")
            permissions.add(f"{module}:write")
        if actions.get("delete"):
            permissions.add(f"{module}:delete")
            permissions.add(f"{module}:write")
        if actions.get("email_alerts") or actions.get("emailAlerts"):
            permissions.add(f"{module}:email_alerts")
    if "asset-history" not in parsed and "asset_history" not in parsed and legacy_full_access_permissions(parsed):
        permissions.add("asset_history:read")
    return permissions


def legacy_full_access_permissions(parsed: dict[str, Any]) -> bool:
    required_modules = [
        "customers",
        "equipment",
        "engineers",
        "work-orders",
        "preventive-maintenance",
        "inventory",
        "reports",
        "settings",
    ]
    for module in required_modules:
        actions = parsed.get(module)
        if not isinstance(actions, dict) or not actions.get("view"):
            return False
        if module not in {"reports", "settings"} and not (actions.get("add") and actions.get("edit") and actions.get("delete")):
            return False
    return True


def has_permission(user: CurrentUser, permission: str) -> bool:
    normalized_permission = normalize_permission_name(permission)
    allowed = {normalize_permission_name(item) for item in (role_permissions(user.role) | custom_permissions(user.permissions))}
    if "*" in allowed or normalized_permission in allowed:
        return True
    module, action = normalized_permission.split(":", 1)
    if action in {"create", "update", "delete"} and f"{module}:write" in allowed:
        return True
    if action == "read" and f"{module}:write" in allowed:
        return True
    return False


def require_permission(permission: str) -> Callable[[CurrentUser], CurrentUser]:
    def dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not has_permission(current_user, permission):
            raise access_denied()
        return current_user

    return dependency
