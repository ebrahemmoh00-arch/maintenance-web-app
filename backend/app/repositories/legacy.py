"""Compatibility facade for repository imports during module migration."""

from .asset_repository import AssetLifecycleRepository, EquipmentRepository, MeasurementTemplateRepository
from .base import (
    MAINTENANCE_ALERT_WINDOW_DAYS,
    MAINTENANCE_ALERT_WINDOW_HOURS,
    Repository,
    add_maintenance_calculations,
    parse_date,
)
from .inventory_repository import InventoryRepository, inventory_status
from .people_repository import CustomerRepository, EngineerRepository, JobTitleRepository
from .pm_repository import (
    PMPlanHistoryRepository,
    PMPlanRepository,
    PMPlanTaskRepository,
    PMPlanWorkOrderRepository,
    PreventiveMaintenanceRepository,
    add_pm_calculations,
)
from .reliability_repository import (
    CauseCodeRepository,
    CorrectiveActionRepository,
    DowntimeEventRepository,
    FailureCodeRepository,
    FailureEventRepository,
    FailureStatisticsRepository,
    ProblemCodeRepository,
    ReliabilityCodeRepository,
    RemedyCodeRepository,
    RootCauseAnalysisRepository,
)
from .report_repository import (
    DEFAULT_OPERATIONAL_REPORT_ITEMS,
    OperationalPerformanceReportRepository,
    OperationalReportItemRepository,
)
from .work_order_repository import WorkOrderRepository

__all__ = [
    "AssetLifecycleRepository",
    "CauseCodeRepository",
    "CorrectiveActionRepository",
    "CustomerRepository",
    "DEFAULT_OPERATIONAL_REPORT_ITEMS",
    "DowntimeEventRepository",
    "EngineerRepository",
    "EquipmentRepository",
    "FailureCodeRepository",
    "FailureEventRepository",
    "FailureStatisticsRepository",
    "InventoryRepository",
    "JobTitleRepository",
    "MAINTENANCE_ALERT_WINDOW_DAYS",
    "MAINTENANCE_ALERT_WINDOW_HOURS",
    "MeasurementTemplateRepository",
    "OperationalPerformanceReportRepository",
    "OperationalReportItemRepository",
    "PMPlanHistoryRepository",
    "PMPlanRepository",
    "PMPlanTaskRepository",
    "PMPlanWorkOrderRepository",
    "PreventiveMaintenanceRepository",
    "ProblemCodeRepository",
    "ReliabilityCodeRepository",
    "RemedyCodeRepository",
    "Repository",
    "RootCauseAnalysisRepository",
    "WorkOrderRepository",
    "add_maintenance_calculations",
    "add_pm_calculations",
    "inventory_status",
    "parse_date",
]
