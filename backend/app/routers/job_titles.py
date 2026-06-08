from fastapi import APIRouter, Depends

from ..auth import require_permission
from ..schemas import JobTitle, JobTitleCreate, JobTitleUpdate
from ..services import JobTitleService

router = APIRouter(prefix="/job-titles", tags=["Job Titles"])
service = JobTitleService()


@router.get("", response_model=list[JobTitle])
def list_job_titles(_=Depends(require_permission("job_titles:read"))):
    return service.list()


@router.get("/{job_title_id}", response_model=JobTitle)
def get_job_title(job_title_id: int, _=Depends(require_permission("job_titles:read"))):
    return service.get(job_title_id)


@router.post("", response_model=JobTitle, status_code=201)
def create_job_title(job_title: JobTitleCreate, _=Depends(require_permission("job_titles:write"))):
    return service.create(job_title)


@router.put("/{job_title_id}", response_model=JobTitle)
def update_job_title(job_title_id: int, job_title: JobTitleUpdate, _=Depends(require_permission("job_titles:write"))):
    return service.update(job_title_id, job_title)


@router.delete("/{job_title_id}")
def delete_job_title(job_title_id: int, _=Depends(require_permission("job_titles:write"))):
    return service.delete(job_title_id)
