from fastapi import APIRouter, Depends

from ...core.auth import CurrentUser, require_permission
from ...schemas import (
    OperationalReportItem,
    OperationalReportItemCreate,
    OperationalReportItemUpdate,
    OperationalPerformanceReport,
    OperationalPerformanceReportCreate,
    OperationalPerformanceReportUpdate,
)
from ...services import OperationalPerformanceReportService, OperationalReportItemService
from ...utils.pagination import ListQuery, get_list_query

router = APIRouter(prefix="/reports", tags=["Reports"])
service = OperationalPerformanceReportService()
item_service = OperationalReportItemService()


@router.get("/operational-items", response_model=list[OperationalReportItem])
def list_operational_report_items(_=Depends(require_permission("reports:read"))):
    return item_service.list()


@router.post("/operational-items", response_model=OperationalReportItem, status_code=201)
def create_operational_report_item(
    item: OperationalReportItemCreate,
    _=Depends(require_permission("reports:create")),
):
    return item_service.create(item)


@router.put("/operational-items/{item_id}", response_model=OperationalReportItem)
def update_operational_report_item(
    item_id: int,
    item: OperationalReportItemUpdate,
    _=Depends(require_permission("reports:update")),
):
    return item_service.update(item_id, item)


@router.delete("/operational-items/{item_id}")
def delete_operational_report_item(item_id: int, _=Depends(require_permission("reports:delete"))):
    return item_service.delete(item_id)


@router.get("/operational-performance", response_model=None)
def list_operational_performance_reports(
    query: ListQuery = Depends(get_list_query),
    _=Depends(require_permission("reports:read")),
):
    return service.repo.list_query(
        query,
        search_fields=["report_name", "site_name", "equipment_type", "asset_names", "created_by"],
        filter_aliases={
            "site": ["site_id", "site_name"],
            "asset": ["asset_ids", "asset_names"],
        },
        date_fields=["created_at", "period_from", "period_to"],
    )


@router.get("/operational-performance/{report_id}", response_model=OperationalPerformanceReport)
def get_operational_performance_report(report_id: int, _=Depends(require_permission("reports:read"))):
    return service.get(report_id)


@router.post("/operational-performance", response_model=OperationalPerformanceReport, status_code=201)
def create_operational_performance_report(
    report: OperationalPerformanceReportCreate,
    current_user: CurrentUser = Depends(require_permission("reports:create")),
):
    return service.create(report, created_by=current_user.name or current_user.username)


@router.put("/operational-performance/{report_id}", response_model=OperationalPerformanceReport)
def update_operational_performance_report(
    report_id: int,
    report: OperationalPerformanceReportUpdate,
    _=Depends(require_permission("reports:update")),
):
    return service.update(report_id, report)


@router.delete("/operational-performance/{report_id}")
def delete_operational_performance_report(report_id: int, _=Depends(require_permission("reports:delete"))):
    return service.delete(report_id)
