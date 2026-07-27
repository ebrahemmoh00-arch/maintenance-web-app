"""Asset repository compatibility exports."""

from .asset_lifecycle_repository import AssetLifecycleRepository
from .equipment_repository import EquipmentRepository
from .measurement_template_repository import MeasurementTemplateRepository

__all__ = [
    "AssetLifecycleRepository",
    "EquipmentRepository",
    "MeasurementTemplateRepository",
]
