from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import FailureEvent, FailureEventCreate, FailureEventUpdate, RootCauseAnalysis, RootCauseAnalysisCreate, ReliabilityCode, ReliabilityCodeCreate, ReliabilityCodeUpdate
from ...services import FailureManagementService

router = APIRouter(prefix="/failure-events", tags=["Failure Events"])
service = FailureManagementService()


@router.get("", response_model=list[FailureEvent])
def list_failure_events(_=Depends(require_permission("assets:read"))):
    return service.list()


@router.get("/codes")
def list_failure_code_lists(_=Depends(require_permission("assets:read"))):
    return service.codes()


@router.post("/codes/{code_type}", response_model=ReliabilityCode, status_code=201)
def create_failure_code(code_type: str, item: ReliabilityCodeCreate, _=Depends(require_permission("settings:write"))):
    return service.create_code(code_type, item)


@router.put("/codes/{code_type}/{code_id}", response_model=ReliabilityCode)
def update_failure_code(code_type: str, code_id: int, item: ReliabilityCodeUpdate, _=Depends(require_permission("settings:write"))):
    return service.update_code(code_type, code_id, item)


@router.post("", response_model=FailureEvent, status_code=201)
def create_failure_event(failure: FailureEventCreate, _=Depends(require_permission("work_orders:update"))):
    return service.create(failure)


@router.get("/{failure_id}", response_model=FailureEvent)
def get_failure_event(failure_id: int, _=Depends(require_permission("assets:read"))):
    return service.get(failure_id)


@router.put("/{failure_id}", response_model=FailureEvent)
def update_failure_event(failure_id: int, failure: FailureEventUpdate, _=Depends(require_permission("work_orders:update"))):
    return service.update(failure_id, failure)


@router.post("/{failure_id}/approve", response_model=FailureEvent)
def approve_failure_event(failure_id: int, payload: dict, _=Depends(require_permission("work_orders:update"))):
    return service.approve(failure_id, payload)


@router.post("/{failure_id}/rca", response_model=RootCauseAnalysis, status_code=201)
def upsert_failure_rca(failure_id: int, item: RootCauseAnalysisCreate, _=Depends(require_permission("work_orders:update"))):
    return service.upsert_rca(failure_id, item)
