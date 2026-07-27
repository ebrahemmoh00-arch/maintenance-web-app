from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..repositories import OperationalPerformanceReportRepository, OperationalReportItemRepository
from .common import normalize_json_text, payload

class OperationalPerformanceReportService:
    json_fields = ("asset_ids", "readings", "summary", "table_rows", "charts")

    def __init__(self) -> None:
        self.repo = OperationalPerformanceReportRepository()

    def list(self):
        return self.repo.list()

    def get(self, item_id: int):
        return self.repo.get(item_id)

    def create(self, data, created_by: str = ""):
        item = payload(data)
        self._prepare_payload(item)
        item["created_by"] = created_by or item.get("created_by") or ""
        created = self.repo.create(item)
        AuditService.log_event(
            action="CREATE",
            module="Reports",
            record_id=created.get("id"),
            description=f"Operational performance report saved: {created.get('report_name') or created.get('id')}",
            new_values=created,
        )
        return created

    def update(self, item_id: int, data):
        item = payload(data)
        self._prepare_payload(item, partial=True)
        updated = self.repo.update(item_id, item)
        AuditService.log_event(
            action="UPDATE",
            module="Reports",
            record_id=item_id,
            description=f"Operational performance report updated: {updated.get('report_name') or item_id}",
            new_values=updated,
        )
        return updated

    def delete(self, item_id: int):
        return self.repo.delete(item_id)

    def _prepare_payload(self, item: dict[str, Any], partial: bool = False) -> None:
        if not partial and not str(item.get("report_type") or "").strip():
            raise HTTPException(status_code=400, detail="Report type is required")
        for field in self.json_fields:
            if field in item:
                default = "[]" if field in {"asset_ids", "table_rows"} else "{}"
                item[field] = normalize_json_text(item.get(field), default)
        if "year" in item:
            item["year"] = int(item.get("year") or 0)
        if "month" in item:
            item["month"] = int(item.get("month") or 0)
        if "site_id" in item and item.get("site_id") in {"", 0}:
            item["site_id"] = None


class OperationalReportItemService:
    def __init__(self) -> None:
        self.repo = OperationalReportItemRepository()

    def list(self):
        return [self._normalize_row(item) for item in self.repo.list()]

    def get(self, item_id: int):
        return self._normalize_row(self.repo.get(item_id))

    def create(self, data):
        item = self._prepare_payload(payload(data))
        return self._normalize_row(self.repo.create(item))

    def update(self, item_id: int, data):
        item = self._prepare_payload(payload(data), partial=True)
        return self._normalize_row(self.repo.update(item_id, item))

    def delete(self, item_id: int):
        return self.repo.delete(item_id)

    def _prepare_payload(self, item: dict[str, Any], partial: bool = False) -> dict[str, Any]:
        if "label" in item:
            item["label"] = str(item.get("label") or "").strip()
        if not partial and not item.get("label"):
            raise HTTPException(status_code=400, detail="Operational item label is required")
        if "key" in item:
            item["key"] = self._normalize_key(item.get("key") or item.get("label"))
        elif not partial:
            item["key"] = self._normalize_key(item.get("label"))
        if "unit" in item:
            item["unit"] = str(item.get("unit") or "").strip()
        if "sort_order" in item:
            item["sort_order"] = int(item.get("sort_order") or 0)
        if "is_active" in item:
            item["is_active"] = 1 if bool(item.get("is_active")) else 0
        return item

    def _normalize_key(self, value: Any) -> str:
        key = "".join(ch if ch.isalnum() else "_" for ch in str(value or "").strip().lower()).strip("_")
        key = "_".join(part for part in key.split("_") if part)
        if not key:
            raise HTTPException(status_code=400, detail="Operational item key is required")
        return key[:80]

    def _normalize_row(self, item: dict[str, Any]) -> dict[str, Any]:
        row = dict(item)
        row["is_active"] = bool(row.get("is_active"))
        return row


