from __future__ import annotations

from ..repositories import InventoryRepository, WorkOrderRepository
from .common import payload
from .inventory_email_alerts import InventoryEmailAlertService

class InventoryService:
    def __init__(self) -> None:
        self.repo = InventoryRepository()
        self.work_orders = WorkOrderRepository()
        self.email_alerts = InventoryEmailAlertService()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)

    def create(self, data):
        item = payload(data)
        if item.get("linked_work_order_id"):
            self.work_orders.get(item["linked_work_order_id"])
        created = self.repo.create(item)
        self.email_alerts.notify_if_threshold_crossed(created, None, source="Inventory create")
        return created

    def update(self, item_id: int, data):
        item = payload(data)
        if item.get("linked_work_order_id"):
            self.work_orders.get(item["linked_work_order_id"])
        previous = self.repo.get(item_id)
        updated = self.repo.update(item_id, item)
        self.email_alerts.notify_if_threshold_crossed(updated, previous, source="Inventory update")
        return updated

    def delete(self, item_id: int): return self.repo.delete(item_id)

