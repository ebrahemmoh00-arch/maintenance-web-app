from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import AssetDocument, AssetDocumentCreate, AssetEvent, AssetHealth, AssetHistory, AssetMeasurement, AssetMeasurementCreate, AssetPhoto, AssetPhotoCreate, DowntimeEvent, FailureEvent
from ...services import AssetLifecycleService, DowntimeService, FailureManagementService

router = APIRouter(prefix="/assets", tags=["Asset Lifecycle"])
service = AssetLifecycleService()
failures = FailureManagementService()
downtime = DowntimeService()


@router.get("/{asset_id}/history", response_model=list[AssetHistory])
def asset_history(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.history(asset_id)


@router.get("/{asset_id}/timeline", response_model=list[AssetHistory])
def asset_timeline(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.timeline(asset_id)


@router.get("/{asset_id}/health", response_model=AssetHealth)
def asset_health(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.health(asset_id)


@router.get("/{asset_id}/measurements", response_model=list[AssetMeasurement])
def asset_measurements(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.measurements(asset_id)


@router.get("/{asset_id}/events", response_model=list[AssetEvent])
def asset_events(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.events(asset_id)


@router.get("/{asset_id}/failures", response_model=list[FailureEvent])
def asset_failures(asset_id: int, _=Depends(require_permission("assets:read"))):
    return failures.list_asset_failures(asset_id)


@router.get("/{asset_id}/downtime", response_model=list[DowntimeEvent])
def asset_downtime(asset_id: int, _=Depends(require_permission("assets:read"))):
    return downtime.list_asset_downtime(asset_id)


@router.get("/{asset_id}/documents", response_model=list[AssetDocument])
def asset_documents(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.documents(asset_id)


@router.get("/{asset_id}/photos", response_model=list[AssetPhoto])
def asset_photos(asset_id: int, _=Depends(require_permission("assets:read"))):
    return service.photos(asset_id)


@router.post("/{asset_id}/documents", response_model=AssetDocument, status_code=201)
def add_asset_document(asset_id: int, document: AssetDocumentCreate, _=Depends(require_permission("assets:update"))):
    return service.add_document(asset_id, document)


@router.post("/{asset_id}/photos", response_model=AssetPhoto, status_code=201)
def add_asset_photo(asset_id: int, photo: AssetPhotoCreate, _=Depends(require_permission("assets:update"))):
    return service.add_photo(asset_id, photo)


@router.post("/{asset_id}/measurements", response_model=AssetMeasurement, status_code=201)
def add_asset_measurement(asset_id: int, measurement: AssetMeasurementCreate, _=Depends(require_permission("assets:update"))):
    return service.add_measurement(asset_id, measurement)
