from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import AssetDocument, AssetDocumentCreate, AssetEvent, AssetHealth, AssetHistory, AssetMeasurement, AssetMeasurementCreate, AssetPhoto, AssetPhotoCreate, DowntimeEvent, FailureEvent
from ...services import AssetLifecycleService, DowntimeService, FailureManagementService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/assets", tags=["Asset Lifecycle"])
service = AssetLifecycleService()
failures = FailureManagementService()
downtime = DowntimeService()


@router.get("/{asset_id}/history", response_model=None)
def asset_history(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(service.history(asset_id), search_fields=["event_type", "description", "user_name"], date_fields=["created_at", "timestamp"])


@router.get("/{asset_id}/timeline", response_model=None)
def asset_timeline(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(service.timeline(asset_id), search_fields=["event_type", "description", "user_name"], date_fields=["created_at", "timestamp"])


@router.get("/{asset_id}/health", response_model=AssetHealth)
def asset_health(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.health(asset_id)


@router.get("/{asset_id}/measurements", response_model=None)
def asset_measurements(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(service.measurements(asset_id), search_fields=["measurement_type", "unit", "notes"], date_fields=["recorded_at", "created_at"])


@router.get("/{asset_id}/events", response_model=None)
def asset_events(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(service.events(asset_id), search_fields=["event_type", "severity", "description"], filter_aliases={"status": ["status"], "priority": ["severity"]}, date_fields=["event_date", "created_at"])


@router.get("/{asset_id}/failures", response_model=None)
def asset_failures(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(failures.list_asset_failures(asset_id), search_fields=["failure_code", "description", "root_cause"], filter_aliases={"status": ["status"], "priority": ["priority", "severity"]}, date_fields=["failure_date", "created_at"])


@router.get("/{asset_id}/downtime", response_model=None)
def asset_downtime(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(downtime.list_asset_downtime(asset_id), search_fields=["reason", "description", "failure_code"], filter_aliases={"status": ["status"]}, date_fields=["start_time", "end_time", "created_at"])


@router.get("/{asset_id}/documents", response_model=None)
def asset_documents(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(service.documents(asset_id), search_fields=["name", "document_type", "file_name"], date_fields=["created_at", "uploaded_at"])


@router.get("/{asset_id}/photos", response_model=None)
def asset_photos(
    asset_id: int,
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("assets:read")),
):
    return query.apply(service.photos(asset_id), search_fields=["caption", "photo_type", "file_name"], date_fields=["created_at", "uploaded_at"])


@router.post("/{asset_id}/documents", response_model=AssetDocument, status_code=201)
def add_asset_document(asset_id: int, document: AssetDocumentCreate, _=Depends(require_permission("assets:update"))):
    return service.add_document(asset_id, document)


@router.post("/{asset_id}/photos", response_model=AssetPhoto, status_code=201)
def add_asset_photo(asset_id: int, photo: AssetPhotoCreate, _=Depends(require_permission("assets:update"))):
    return service.add_photo(asset_id, photo)


@router.post("/{asset_id}/measurements", response_model=AssetMeasurement, status_code=201)
def add_asset_measurement(asset_id: int, measurement: AssetMeasurementCreate, _=Depends(require_permission("assets:update"))):
    return service.add_measurement(asset_id, measurement)
