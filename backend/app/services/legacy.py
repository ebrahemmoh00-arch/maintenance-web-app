"""Compatibility facade for service imports during module migration."""

from .asset_service import AssetLifecycleService, EquipmentService, MeasurementTemplateService, asset_prefix, classify_asset_level
from .common import *  # noqa: F401,F403
from .inventory_service import InventoryService
from .people_service import CustomerService, EngineerService, JobTitleService
from .pm_service import PMPlanEngineService, PMPlanService, PreventiveMaintenanceService, add_months, normalize_recurrence_type, recurrence_key
from .reliability_service import DowntimeService, FailureManagementService, ReliabilityService
from .report_service import OperationalPerformanceReportService, OperationalReportItemService
from .work_order_service import WorkOrderService

__all__ = [
    "AssetLifecycleService",
    "CustomerService",
    "DowntimeService",
    "EngineerService",
    "EquipmentService",
    "FailureManagementService",
    "InventoryService",
    "JobTitleService",
    "MeasurementTemplateService",
    "OperationalPerformanceReportService",
    "OperationalReportItemService",
    "PMPlanEngineService",
    "PMPlanService",
    "PreventiveMaintenanceService",
    "ReliabilityService",
    "WorkOrderService",
    "add_months",
    "asset_prefix",
    "classify_asset_level",
    "normalize_recurrence_type",
    "recurrence_key",
]
