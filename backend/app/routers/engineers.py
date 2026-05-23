from fastapi import APIRouter

from ..schemas import Engineer, EngineerCreate, EngineerUpdate
from ..services import EngineerService

router = APIRouter(prefix="/engineers", tags=["Engineers"])
service = EngineerService()


@router.get("", response_model=list[Engineer])
def list_engineers():
    return service.list()


@router.get("/{engineer_id}", response_model=Engineer)
def get_engineer(engineer_id: int):
    return service.get(engineer_id)


@router.post("", response_model=Engineer, status_code=201)
def create_engineer(engineer: EngineerCreate):
    return service.create(engineer)


@router.put("/{engineer_id}", response_model=Engineer)
def update_engineer(engineer_id: int, engineer: EngineerUpdate):
    return service.update(engineer_id, engineer)


@router.delete("/{engineer_id}")
def delete_engineer(engineer_id: int):
    return service.delete(engineer_id)
