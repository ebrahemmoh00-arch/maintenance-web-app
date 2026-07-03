from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import math
from typing import Any

from fastapi import Query


def paginate_items(items: list[dict[str, Any]], page: int = 1, page_size: int = 25) -> dict[str, Any]:
    safe_page = max(int(page or 1), 1)
    safe_page_size = min(max(int(page_size or 25), 1), 500)
    total = len(items)
    start = (safe_page - 1) * safe_page_size
    end = start + safe_page_size
    return {
        "items": items[start:end],
        "page": safe_page,
        "page_size": safe_page_size,
        "total": total,
        "pages": max(math.ceil(total / safe_page_size), 1) if total else 0,
    }


@dataclass(frozen=True)
class ListQuery:
    page: int | None = None
    page_size: int = 25
    sort_by: str | None = None
    sort_order: str = "asc"
    search: str | None = None
    status: str | None = None
    priority: str | None = None
    asset: str | None = None
    site: str | None = None
    department: str | None = None
    engineer: str | None = None
    date_from: date | None = None
    date_to: date | None = None

    @property
    def paginated(self) -> bool:
        return self.page is not None

    def apply(
        self,
        rows: list[dict[str, Any]],
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        filtered = filter_items(
            rows,
            self,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
        )
        sorted_rows = sort_items(filtered, self.sort_by, self.sort_order)
        if self.paginated:
            return paginate_items(sorted_rows, self.page or 1, self.page_size)
        return sorted_rows


def get_list_query(
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=25, ge=1, le=500),
    sort_by: str | None = Query(default=None),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    asset: str | None = Query(default=None),
    site: str | None = Query(default=None),
    department: str | None = Query(default=None),
    engineer: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> ListQuery:
    return ListQuery(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
        status=status,
        priority=priority,
        asset=asset,
        site=site,
        department=department,
        engineer=engineer,
        date_from=date_from,
        date_to=date_to,
    )


def filter_items(
    rows: list[dict[str, Any]],
    query: ListQuery,
    *,
    search_fields: list[str] | None = None,
    filter_aliases: dict[str, list[str]] | None = None,
    date_fields: list[str] | None = None,
) -> list[dict[str, Any]]:
    result = rows
    if query.search:
        fields = search_fields or sorted({key for row in rows for key in row.keys()})
        needle = query.search.lower()
        result = [
            row
            for row in result
            if any(needle in normalize_value(row.get(field)).lower() for field in fields)
        ]

    aliases = filter_aliases or {}
    for filter_name in ["status", "priority", "asset", "site", "department", "engineer"]:
        value = getattr(query, filter_name)
        if not value:
            continue
        fields = aliases.get(filter_name, [filter_name])
        result = [row for row in result if any(matches_filter(row.get(field), value) for field in fields)]

    if query.date_from or query.date_to:
        fields = date_fields or ["date", "created_at", "updated_at", "scheduled_date", "due_date"]
        result = [row for row in result if matches_date_range(row, fields, query.date_from, query.date_to)]

    return result


def sort_items(rows: list[dict[str, Any]], sort_by: str | None, sort_order: str = "asc") -> list[dict[str, Any]]:
    if not sort_by or not rows or sort_by not in rows[0]:
        return rows
    return sorted(rows, key=lambda row: normalize_value(row.get(sort_by)), reverse=sort_order == "desc")


def matches_filter(current: Any, expected: str) -> bool:
    return normalize_value(current).lower() == expected.lower()


def matches_date_range(row: dict[str, Any], fields: list[str], date_from: date | None, date_to: date | None) -> bool:
    for field in fields:
        current = parse_date(row.get(field))
        if current is None:
            continue
        if date_from and current < date_from:
            return False
        if date_to and current > date_to:
            return False
        return True
    return False


def parse_date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return date.fromisoformat(str(value)[:10])
        except ValueError:
            return None


def normalize_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value)
