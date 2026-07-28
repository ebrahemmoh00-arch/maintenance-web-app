from dataclasses import replace
from datetime import date

from fastapi import APIRouter, Depends, Query

from ...core.auth import CurrentUser, require_permission
from ...core.structured_logging import log_file_upload
from ...schemas import AssetDocument, AssetDocumentCreate, AssetHealth, AssetMeasurement, AssetMeasurementCreate, AssetPhoto, AssetPhotoCreate, MeasurementTemplate, MeasurementTemplateCreate, MeasurementTemplateUpdate
from ...services import AssetHistoryService, AssetLifecycleService, DowntimeService, FailureManagementService, MeasurementTemplateService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/assets", tags=["Asset Lifecycle"])
service = AssetLifecycleService()
template_service = MeasurementTemplateService()
history_service = AssetHistoryService()
failures = FailureManagementService()
downtime = DowntimeService()


@router.get("/measurement-templates", response_model=list[MeasurementTemplate])
def measurement_templates(
    asset_id: int | None = Query(default=None),
    _=Depends(require_permission("measurement_templates:read")),
):
    return template_service.list(asset_id)


@router.post("/measurement-templates", response_model=MeasurementTemplate, status_code=201)
def create_measurement_template(template: MeasurementTemplateCreate, user=Depends(require_permission("measurement_templates:create"))):
    created = template_service.create(template, user.id)
    if created.get("guidance_file_name") or created.get("guidance_file_url"):
        log_file_upload(
            "guidance_file_linked",
            asset_id=created.get("asset_id", ""),
            file_name=created.get("guidance_file_name", ""),
            file_type="measurement_guidance",
            user_id=user.id,
        )
    return created


@router.put("/measurement-templates/{template_id}", response_model=MeasurementTemplate)
def update_measurement_template(template_id: int, template: MeasurementTemplateUpdate, current_user=Depends(require_permission("measurement_templates:update"))):
    updated = template_service.update(template_id, template)
    if updated.get("guidance_file_name") or updated.get("guidance_file_url"):
        log_file_upload(
            "guidance_file_linked",
            asset_id=updated.get("asset_id", ""),
            file_name=updated.get("guidance_file_name", ""),
            file_type="measurement_guidance",
            user_id=current_user.id,
        )
    return updated


@router.delete("/measurement-templates/{template_id}")
def delete_measurement_template(template_id: int, _=Depends(require_permission("measurement_templates:delete"))):
    return template_service.delete(template_id)


@router.get("/{asset_id}/history", response_model=None)
def asset_history(
    asset_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=500),
    event_type: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    technician: str | None = Query(default=None),
    status: str | None = Query(default=None),
    work_order: str | None = Query(default=None),
    pm_cm: str | None = Query(default=None),
    failure: str | None = Query(default=None),
    downtime_filter: str | None = Query(default=None, alias="downtime"),
    search: str | None = Query(default=None),
    _=Depends(require_permission("asset_history:view")),
):
    return history_service.history(
        asset_id,
        page=page,
        page_size=page_size,
        event_type=event_type,
        date_from=date_from,
        date_to=date_to,
        technician=technician,
        status=status,
        work_order=work_order,
        pm_cm=pm_cm,
        failure=failure,
        downtime=downtime_filter,
        search=search,
    )


@router.get("/{asset_id}/timeline", response_model=None)
def asset_timeline(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    service.assets.get(asset_id)
    return service.lifecycle.list_for_asset_query(
        "asset_history",
        asset_id,
        query,
        search_fields=["event_type", "description", "summary", "details", "technician_name"],
        date_fields=["created_at", "event_time"],
        default_sort=[("created_at", "ASC"), ("id", "ASC")],
    )


@router.delete("/{asset_id}/timeline/{entry_id}")
def delete_asset_timeline_entry(
    asset_id: int,
    entry_id: int,
    _=Depends(require_permission("asset_history:delete")),
):
    return service.delete_timeline_entry(asset_id, entry_id)


@router.get("/{asset_id}/health", response_model=AssetHealth)
def asset_health(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.health(asset_id)


@router.get("/{asset_id}/measurements", response_model=None)
def asset_measurements(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    service.assets.get(asset_id)
    return service.lifecycle.list_for_asset_query(
        "asset_measurements",
        asset_id,
        query,
        search_fields=["measurement_type", "unit", "notes", "user_name"],
        date_fields=["reading_date", "created_at"],
        default_sort=[("reading_date", "DESC"), ("id", "DESC")],
    )


@router.get("/{asset_id}/events", response_model=None)
def asset_events(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    service.assets.get(asset_id)
    return service.lifecycle.list_for_asset_query(
        "asset_events",
        asset_id,
        query,
        search_fields=["event_type", "severity", "description"],
        filter_aliases={"status": ["status"], "priority": ["severity"]},
        date_fields=["due_date", "created_at"],
    )


@router.get("/{asset_id}/failures", response_model=None)
def asset_failures(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    failures.assets.get(asset_id)
    asset_query = replace(query, asset=str(asset_id))
    return failures.failures.list_query(
        asset_query,
        search_fields=["failure_code", "description", "root_cause"],
        filter_aliases={"status": ["status"], "priority": ["priority", "severity"], "asset": ["asset_id"]},
        date_fields=["failure_date", "created_at"],
    )


@router.get("/{asset_id}/downtime", response_model=None)
def asset_downtime(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    downtime.assets.get(asset_id)
    asset_query = replace(query, asset=str(asset_id))
    return downtime.downtime.list_query(
        asset_query,
        search_fields=["reason", "description", "failure_code"],
        filter_aliases={"status": ["status"], "asset": ["asset_id"]},
        date_fields=["start_time", "end_time", "created_at"],
    )


@router.get("/{asset_id}/documents", response_model=None)
def asset_documents(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    service.assets.get(asset_id)
    return service.lifecycle.list_for_asset_query(
        "asset_documents",
        asset_id,
        query,
        search_fields=["title", "document_type", "file_name", "description"],
        date_fields=["created_at"],
    )


@router.get("/{asset_id}/photos", response_model=None)
def asset_photos(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    service.assets.get(asset_id)
    return service.lifecycle.list_for_asset_query(
        "asset_photos",
        asset_id,
        query,
        search_fields=["title", "description", "photo_type", "file_name"],
        date_fields=["created_at"],
    )


@router.post("/{asset_id}/documents", response_model=AssetDocument, status_code=201)
def add_asset_document(asset_id: int, document: AssetDocumentCreate, current_user=Depends(require_permission("assets:update"))):
    created = service.add_document(asset_id, document)
    log_file_upload(
        "asset_document_uploaded",
        asset_id=asset_id,
        file_name=created.get("file_name", "") or created.get("title", ""),
        file_type=created.get("document_type", ""),
        user_id=current_user.id,
    )
    return created


@router.post("/{asset_id}/photos", response_model=AssetPhoto, status_code=201)
def add_asset_photo(asset_id: int, photo: AssetPhotoCreate, current_user=Depends(require_permission("assets:update"))):
    created = service.add_photo(asset_id, photo)
    log_file_upload(
        "asset_photo_uploaded",
        asset_id=asset_id,
        file_name=created.get("file_name", "") or created.get("title", ""),
        file_type=created.get("photo_type", ""),
        user_id=current_user.id,
    )
    return created


@router.post("/{asset_id}/measurements", response_model=AssetMeasurement, status_code=201)
def add_asset_measurement(asset_id: int, measurement: AssetMeasurementCreate, current_user: CurrentUser = Depends(require_permission("assets:update"))):
    return service.add_measurement(asset_id, measurement, current_user)


@router.delete("/{asset_id}/measurements/{measurement_id}")
def delete_asset_measurement(asset_id: int, measurement_id: int, _=Depends(require_permission("assets:update"))):
    return service.delete_measurement(asset_id, measurement_id)
