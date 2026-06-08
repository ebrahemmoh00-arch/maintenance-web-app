from fastapi import APIRouter, Depends, HTTPException, Query

from ..audit import AuditService
from ..auth import CurrentUser, get_current_user, require_permission
from ..schemas import AuditDeleteRequest, AuditExportRequest, AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=list[AuditLog])
def list_audit_logs(
    from_date: str = "",
    to_date: str = "",
    user_id: str = "",
    role: str = "",
    module: str = "",
    action: str = "",
    status: str = "",
    search: str = "",
    limit: int = Query(default=500, ge=1, le=2000),
    current_user: CurrentUser = Depends(require_permission("audit_logs:read")),
):
    return AuditService.list_logs(
        {
            "from_date": from_date,
            "to_date": to_date,
            "user_id": user_id,
            "role": role,
            "module": module,
            "action": action,
            "status": status,
            "search": search,
            "limit": limit,
        },
        current_user,
    )


@router.post("/export")
def export_audit_logs(payload: AuditExportRequest, current_user: CurrentUser = Depends(require_permission("audit_logs:read"))):
    if not current_user:
        return {"ok": False}
    AuditService.log_event(
        action="EXPORT",
        module="Reports",
        description=f"Audit logs exported as {payload.format.upper()}",
        context={
            "user_id": current_user.id,
            "user_name": current_user.name or current_user.username,
            "role": current_user.role,
        },
    )
    return {"ok": True}


@router.delete("")
def delete_audit_logs(payload: AuditDeleteRequest, current_user: CurrentUser = Depends(require_permission("audit_logs:delete"))):
    if current_user.role not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Access Denied")
    return AuditService.delete_logs(payload.ids, current_user)


@router.get("/{log_id}", response_model=AuditLog)
def get_audit_log(log_id: int, current_user: CurrentUser = Depends(require_permission("audit_logs:read"))):
    return AuditService.get_log(log_id, current_user)
