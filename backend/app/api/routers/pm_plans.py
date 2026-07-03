from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import PMPlan, PMPlanCreate, PMPlanTask, PMPlanTaskCreate, PMPlanTaskUpdate, PMPlanUpdate, PMSchedulerRunResult
from ...services import PMPlanService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/pm-plans", tags=["PM Plans"])
service = PMPlanService()


@router.get("", response_model=None)
def list_pm_plans(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("pm_plans:read")),
):
    return query.apply(
        service.list(),
        search_fields=["name", "description", "recurrence_type", "asset_name"],
        filter_aliases={
            "asset": ["asset_id", "equipment_id", "asset_name"],
            "status": ["status", "state"],
            "priority": ["priority"],
            "site": ["site", "location"],
        },
        date_fields=["created_at", "updated_at", "start_date", "next_due_date", "last_service_date"],
    )


@router.post("/scheduler/run", response_model=PMSchedulerRunResult)
def run_pm_scheduler(_=Depends(require_permission("pm_plans:run"))):
    return service.run_scheduler()


@router.get("/{plan_id}", response_model=PMPlan)
def get_pm_plan(plan_id: int, _=Depends(require_permission("pm_plans:read"))):
    return service.get(plan_id)


@router.post("", response_model=PMPlan, status_code=201)
def create_pm_plan(plan: PMPlanCreate, _=Depends(require_permission("pm_plans:create"))):
    return service.create(plan)


@router.put("/{plan_id}", response_model=PMPlan)
def update_pm_plan(plan_id: int, plan: PMPlanUpdate, _=Depends(require_permission("pm_plans:update"))):
    return service.update(plan_id, plan)


@router.delete("/{plan_id}")
def delete_pm_plan(plan_id: int, _=Depends(require_permission("pm_plans:delete"))):
    return service.delete(plan_id)


@router.post("/{plan_id}/tasks", response_model=PMPlanTask, status_code=201)
def create_pm_plan_task(plan_id: int, task: PMPlanTaskCreate, _=Depends(require_permission("pm_plans:update"))):
    return service.create_task(plan_id, task)


@router.put("/tasks/{task_id}", response_model=PMPlanTask)
def update_pm_plan_task(task_id: int, task: PMPlanTaskUpdate, _=Depends(require_permission("pm_plans:update"))):
    return service.update_task(task_id, task)


@router.delete("/tasks/{task_id}")
def delete_pm_plan_task(task_id: int, _=Depends(require_permission("pm_plans:update"))):
    return service.delete_task(task_id)
