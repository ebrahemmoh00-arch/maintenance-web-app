from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..core.audit import AuditService
from ..database import get_connection, insert_row
from ..utils.pagination import ListQuery, query_database_items
from .base import Repository

class CustomerRepository(Repository):
    table = "customers"
    fields = ("name", "contact_person", "email", "phone", "address")


class EngineerRepository(Repository):
    table = "engineers"
    fields = (
        "employee_code",
        "name",
        "email",
        "phone",
        "specialty",
        "job_title",
        "department",
        "work_location",
        "supervisor",
        "username",
        "password",
        "role",
        "permissions",
        "status",
    )


class JobTitleRepository(Repository):
    table = "job_titles"
    fields = ("name",)

    def list(self) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute("SELECT * FROM job_titles ORDER BY name COLLATE NOCASE ASC").fetchall()
            return [dict(row) for row in rows]

    def list_query(
        self,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        return query_database_items(
            base_sql="SELECT * FROM job_titles",
            query=query,
            field_map={"id": "id", "name": "name", "created_at": "created_at"},
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("name", "ASC"), ("id", "ASC")],
        )

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        name = str(payload.get("name", "")).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Job title name is required")
        with get_connection() as db:
            existing = db.execute("SELECT * FROM job_titles WHERE lower(name) = lower(?)", (name,)).fetchone()
            if existing:
                return dict(existing)
            item_id = insert_row(db, "job_titles", {"name": name})
            db.commit()
        created = self.get(item_id)
        AuditService.log_repository_action(self.table, "CREATE", None, created, item_id)
        return created
