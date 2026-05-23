from fastapi import APIRouter

from ..schemas import WorkOrder, WorkOrderCreate, WorkOrderUpdate
from ..services import WorkOrderService

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])
service = WorkOrderService()


@router.get("", response_model=list[WorkOrder])
def list_work_orders():
    return service.list()


@router.get("/{work_order_id}", response_model=WorkOrder)
def get_work_order(work_order_id: int):
    return service.get(work_order_id)


@router.post("", response_model=WorkOrder, status_code=201)
def create_work_order(work_order: WorkOrderCreate):
    return service.create(work_order)


@router.put("/{work_order_id}", response_model=WorkOrder)
def update_work_order(work_order_id: int, work_order: WorkOrderUpdate):
    return service.update(work_order_id, work_order)


@router.delete("/{work_order_id}")
def delete_work_order(work_order_id: int):
    return service.delete(work_order_id)
