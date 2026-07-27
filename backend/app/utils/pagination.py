from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import math
import re
from typing import Any

from fastapi import Query

from ..database import get_connection


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


def query_database_items(
    *,
    base_sql: str,
    query: ListQuery,
    field_map: dict[str, str],
    params: tuple[Any, ...] | list[Any] | None = None,
    search_fields: list[str] | None = None,
    filter_aliases: dict[str, list[str]] | None = None,
    date_fields: list[str] | None = None,
    default_sort: list[tuple[str, str]] | None = None,
    row_mapper=None,
) -> list[dict[str, Any]] | dict[str, Any]:
    """Apply list filtering, sorting, and pagination in SQL.

    The function intentionally returns the same shape as ListQuery.apply:
    a plain list for non-paginated calls, or a pagination envelope when
    page is provided.
    """

    source_sql = base_sql.strip().rstrip(";")
    base_params: list[Any] = list(params or [])
    where_sql, where_params = _build_where(query, field_map, search_fields, filter_aliases, date_fields)
    order_sql = _build_order(query, field_map, default_sort)
    page = max(int(query.page or 1), 1)
    page_size = min(max(int(query.page_size or 25), 1), 500)
    offset = (page - 1) * page_size
    clause = f" WHERE {' AND '.join(where_sql)}" if where_sql else ""
    from_sql = f"FROM ({source_sql}) AS list_source"

    with get_connection() as db:
        if query.paginated:
            count_row = db.execute(
                f"SELECT COUNT(*) AS total {from_sql}{clause}",
                (*base_params, *where_params),
            ).fetchone()
            total = int(count_row["total"] if isinstance(count_row, dict) else count_row[0])
            rows = db.execute(
                f"SELECT * {from_sql}{clause}{order_sql} LIMIT ? OFFSET ?",
                (*base_params, *where_params, page_size, offset),
            ).fetchall()
            items = [_map_row(dict(row), row_mapper) for row in rows]
            return {
                "items": items,
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": max(math.ceil(total / page_size), 1) if total else 0,
            }

        rows = db.execute(
            f"SELECT * {from_sql}{clause}{order_sql}",
            (*base_params, *where_params),
        ).fetchall()
        return [_map_row(dict(row), row_mapper) for row in rows]


def _build_where(
    query: ListQuery,
    field_map: dict[str, str],
    search_fields: list[str] | None,
    filter_aliases: dict[str, list[str]] | None,
    date_fields: list[str] | None,
) -> tuple[list[str], list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    if query.search:
        expressions = [_field_expression(field_map, field) for field in (search_fields or sorted(field_map))]
        expressions = [expression for expression in expressions if expression]
        if expressions:
            clauses.append("(" + " OR ".join([f"LOWER(COALESCE(CAST({expression} AS TEXT), '')) LIKE LOWER(?)" for expression in expressions]) + ")")
            params.extend([f"%{query.search}%"] * len(expressions))
        else:
            clauses.append("1 = 0")

    aliases = filter_aliases or {}
    for filter_name in ["status", "priority", "asset", "site", "department", "engineer"]:
        value = getattr(query, filter_name)
        if not value:
            continue
        fields = aliases.get(filter_name, [filter_name])
        expressions = [_field_expression(field_map, field) for field in fields]
        expressions = [expression for expression in expressions if expression]
        if expressions:
            clauses.append("(" + " OR ".join([f"LOWER(COALESCE(CAST({expression} AS TEXT), '')) = LOWER(?)" for expression in expressions]) + ")")
            params.extend([str(value)] * len(expressions))
        else:
            clauses.append("1 = 0")

    if query.date_from or query.date_to:
        expressions = [_field_expression(field_map, field) for field in (date_fields or ["date", "created_at", "updated_at", "scheduled_date", "due_date"])]
        expressions = [expression for expression in expressions if expression]
        if expressions:
            date_clauses = []
            for expression in expressions:
                date_text = f"SUBSTR(COALESCE(CAST({expression} AS TEXT), ''), 1, 10)"
                field_clause = [f"{date_text} <> ''"]
                if query.date_from:
                    field_clause.append(f"{date_text} >= ?")
                    params.append(query.date_from.isoformat())
                if query.date_to:
                    field_clause.append(f"{date_text} <= ?")
                    params.append(query.date_to.isoformat())
                date_clauses.append("(" + " AND ".join(field_clause) + ")")
            clauses.append("(" + " OR ".join(date_clauses) + ")")
        else:
            clauses.append("1 = 0")

    return clauses, params


def _build_order(query: ListQuery, field_map: dict[str, str], default_sort: list[tuple[str, str]] | None) -> str:
    direction = "DESC" if query.sort_order.lower() == "desc" else "ASC"
    if query.sort_by:
        expression = _field_expression(field_map, query.sort_by)
        if expression:
            return f" ORDER BY {expression} {direction}"

    sort_parts = []
    for field, order in default_sort or [("id", "DESC")]:
        expression = _field_expression(field_map, field)
        if expression:
            safe_order = "DESC" if str(order).upper() == "DESC" else "ASC"
            sort_parts.append(f"{expression} {safe_order}")
    return f" ORDER BY {', '.join(sort_parts)}" if sort_parts else ""


def _field_expression(field_map: dict[str, str], field: str) -> str | None:
    mapped = field_map.get(field)
    if not mapped:
        return None
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", mapped):
        return mapped
    return f"list_source.{mapped}"


def _map_row(row: dict[str, Any], row_mapper):
    return row_mapper(row) if row_mapper else row
