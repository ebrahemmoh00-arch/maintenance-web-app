from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import Engineer, EngineerCreate, EngineerUpdate
from ...services import EngineerService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/engineers", tags=["Engineers"])
service = EngineerService()


@router.get("", response_model=None)
def list_engineers(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("users:read")),
):
    return query.apply(
        service.list(),
        search_fields=["name", "email", "phone", "job_title", "department", "work_location", "role"],
        filter_aliases={
            "status": ["status"],
            "department": ["department"],
            "site": ["work_location", "site"],
            "engineer": ["id", "name", "email"],
        },
    )


@router.get("/{engineer_id}", response_model=Engineer)
def get_engineer(engineer_id: int, _=Depends(require_permission("users:read"))):
    return service.get(engineer_id)


@router.post("", response_model=Engineer, status_code=201)
def create_engineer(engineer: EngineerCreate, _=Depends(require_permission("users:create"))):
    return service.create(engineer)


@router.put("/{engineer_id}", response_model=Engineer)
def update_engineer(engineer_id: int, engineer: EngineerUpdate, _=Depends(require_permission("users:update"))):
    return service.update(engineer_id, engineer)


@router.delete("/{engineer_id}")
def delete_engineer(engineer_id: int, _=Depends(require_permission("users:delete"))):
    return service.delete(engineer_id)
