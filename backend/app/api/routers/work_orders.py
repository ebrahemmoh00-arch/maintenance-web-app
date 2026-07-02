from fastapi import APIRouter, Depends

from ...core.auth import CurrentUser, require_permission
from ...schemas import WorkOrder, WorkOrderCreate, WorkOrderLifecycleAction, WorkOrderUpdate
from ...services import WorkOrderService

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])
service = WorkOrderService()


@router.get("", response_model=list[WorkOrder])
def list_work_orders(_=Depends(require_permission("work_orders:read"))):
    return service.list()


@router.get("/{work_order_id}", response_model=WorkOrder)
def get_work_order(work_order_id: int, _=Depends(require_permission("work_orders:read"))):
    return service.get(work_order_id)


@router.post("", response_model=WorkOrder, status_code=201)
def create_work_order(work_order: WorkOrderCreate, _=Depends(require_permission("work_orders:create"))):
    return service.create(work_order)


@router.put("/{work_order_id}", response_model=WorkOrder)
def update_work_order(work_order_id: int, work_order: WorkOrderUpdate, _=Depends(require_permission("work_orders:update"))):
    return service.update(work_order_id, work_order)


@router.delete("/{work_order_id}")
def delete_work_order(work_order_id: int, _=Depends(require_permission("work_orders:delete"))):
    return service.delete(work_order_id)


def with_actor(payload: WorkOrderLifecycleAction, current_user: CurrentUser) -> WorkOrderLifecycleAction:
    if payload.actor_id:
        return payload
    data = payload.model_dump()
    data["actor_id"] = current_user.id
    return WorkOrderLifecycleAction(**data)


@router.post("/{work_order_id}/assign", response_model=WorkOrder)
def assign_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.assign(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/accept", response_model=WorkOrder)
def accept_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.accept(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/start", response_model=WorkOrder)
def start_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.start(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/pause", response_model=WorkOrder)
def pause_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.pause(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/waiting-parts", response_model=WorkOrder)
def waiting_parts_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.waiting_parts(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/resume", response_model=WorkOrder)
def resume_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.resume(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/complete", response_model=WorkOrder)
def complete_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.complete(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/approve", response_model=WorkOrder)
def approve_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.approve(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/reject", response_model=WorkOrder)
def reject_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.reject(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/cancel", response_model=WorkOrder)
def cancel_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.cancel(work_order_id, with_actor(action, current_user))


@router.post("/{work_order_id}/close", response_model=WorkOrder)
def close_work_order(
    work_order_id: int,
    action: WorkOrderLifecycleAction,
    current_user: CurrentUser = Depends(require_permission("work_orders:update")),
):
    return service.close(work_order_id, with_actor(action, current_user))
