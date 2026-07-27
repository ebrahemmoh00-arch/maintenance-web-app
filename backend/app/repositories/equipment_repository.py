from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import HTTPException

from ..database import DB_BACKEND, get_connection
from ..utils.pagination import ListQuery, query_database_items
from .base import (
    MAINTENANCE_ALERT_WINDOW_DAYS,
    MAINTENANCE_ALERT_WINDOW_HOURS,
    Repository,
    add_maintenance_calculations,
)

class EquipmentRepository(Repository):
    table = "equipment"
    fields = (
        "customer_id",
        "name",
        "serial_number",
        "model",
        "description",
        "category",
        "manufacturer",
        "location",
        "parent_id",
        "asset_type",
        "asset_level",
        "asset_code",
        "qr_code",
        "barcode",
        "criticality",
        "site",
        "department",
        "commission_date",
        "installation_date",
        "warranty_start",
        "warranty_end",
        "expected_life_years",
        "replacement_cost",
        "current_condition",
        "maintenance_interval_hours",
        "maintenance_interval_days",
        "current_hours",
        "last_reading",
        "current_reading",
        "last_pm_date",
        "next_pm_date",
        "last_breakdown_date",
        "last_repair_date",
        "purchase_cost",
        "total_maintenance_cost",
        "spare_parts_cost",
        "labor_cost",
        "contractor_cost",
        "last_maintenance_date",
        "status",
    )

    def list(self) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(f"SELECT * FROM {self.table} ORDER BY id DESC").fetchall()
            return [add_maintenance_calculations(dict(row)) for row in rows]

    def list_query(
        self,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        field_map = {field: field for field in ("id", "created_at", *self.fields)}
        return query_database_items(
            base_sql="SELECT * FROM equipment",
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[("id", "DESC")],
            row_mapper=add_maintenance_calculations,
        )

    def get(self, item_id: int) -> dict[str, Any]:
        with get_connection() as db:
            row = db.execute(f"SELECT * FROM {self.table} WHERE id = ?", (item_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Equipment not found")
            return add_maintenance_calculations(dict(row))

    def children(self, item_id: int) -> list[dict[str, Any]]:
        with get_connection() as db:
            rows = db.execute(f"SELECT * FROM {self.table} WHERE parent_id = ? ORDER BY name ASC", (item_id,)).fetchall()
            return [add_maintenance_calculations(dict(row)) for row in rows]

    def maintenance_alerts(self) -> list[dict[str, Any]]:
        alerts = []
        for item in self.list():
            if item["maintenance_alert"] == "OK":
                continue
            alerts.append(self._format_maintenance_alert(item))
        return alerts

    def maintenance_alerts_query(
        self,
        query: ListQuery,
        *,
        search_fields: list[str] | None = None,
        filter_aliases: dict[str, list[str]] | None = None,
        date_fields: list[str] | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        if DB_BACKEND == "postgres":
            next_date_expr = """
                CASE
                    WHEN maintenance_interval_days > 0 AND NULLIF(last_maintenance_date, '') IS NOT NULL
                    THEN (NULLIF(last_maintenance_date, '')::date + (maintenance_interval_days::int * INTERVAL '1 day'))::date
                    ELSE NULL
                END
            """
            days_until_expr = f"""
                CASE
                    WHEN maintenance_interval_days > 0 AND NULLIF(last_maintenance_date, '') IS NOT NULL
                    THEN ({next_date_expr}) - CURRENT_DATE
                    ELSE NULL
                END
            """
        else:
            next_date_expr = """
                CASE
                    WHEN maintenance_interval_days > 0 AND NULLIF(last_maintenance_date, '') IS NOT NULL
                    THEN date(NULLIF(last_maintenance_date, ''), '+' || CAST(maintenance_interval_days AS TEXT) || ' days')
                    ELSE NULL
                END
            """
            days_until_expr = f"""
                CASE
                    WHEN maintenance_interval_days > 0 AND NULLIF(last_maintenance_date, '') IS NOT NULL
                    THEN CAST(julianday({next_date_expr}) - julianday(date('now')) AS INTEGER)
                    ELSE NULL
                END
            """
        hours_until_expr = """
            CASE
                WHEN maintenance_interval_hours > 0 THEN maintenance_interval_hours - current_hours
                ELSE NULL
            END
        """
        base_sql = f"""
            SELECT
                alert_source.*,
                CASE
                    WHEN COALESCE(alert_source.hours_until_maintenance, 999999999) <= 0
                      OR COALESCE(alert_source.days_until_maintenance, 999999999) <= 0
                    THEN 'DUE NOW'
                    ELSE 'UPCOMING'
                END AS alert_level
            FROM (
                SELECT
                    id AS equipment_id,
                    name AS equipment_name,
                    serial_number,
                    location,
                    {next_date_expr} AS next_maintenance_date,
                    {days_until_expr} AS days_until_maintenance,
                    {hours_until_expr} AS hours_until_maintenance
                FROM equipment
            ) AS alert_source
            WHERE
                (alert_source.hours_until_maintenance IS NOT NULL AND alert_source.hours_until_maintenance <= {MAINTENANCE_ALERT_WINDOW_HOURS})
                OR (alert_source.days_until_maintenance IS NOT NULL AND alert_source.days_until_maintenance <= {MAINTENANCE_ALERT_WINDOW_DAYS})
        """
        field_map = {
            "id": "equipment_id",
            "equipment_id": "equipment_id",
            "asset_id": "equipment_id",
            "equipment_name": "equipment_name",
            "asset_name": "equipment_name",
            "serial_number": "serial_number",
            "location": "location",
            "alert_level": "alert_level",
            "status": "alert_level",
            "priority": "alert_level",
            "severity": "alert_level",
            "next_maintenance_date": "next_maintenance_date",
            "due_date": "next_maintenance_date",
            "timestamp": "next_maintenance_date",
            "created_at": "next_maintenance_date",
            "days_until_maintenance": "days_until_maintenance",
            "hours_until_maintenance": "hours_until_maintenance",
        }
        return query_database_items(
            base_sql=base_sql,
            query=query,
            field_map=field_map,
            search_fields=search_fields,
            filter_aliases=filter_aliases,
            date_fields=date_fields,
            default_sort=[
                ("alert_level", "ASC"),
                ("days_until_maintenance", "ASC"),
                ("hours_until_maintenance", "ASC"),
                ("equipment_name", "ASC"),
            ],
            row_mapper=self._format_maintenance_alert,
        )

    def _format_maintenance_alert(self, item: dict[str, Any]) -> dict[str, Any]:
        next_date = item.get("next_maintenance_date")
        if isinstance(next_date, (date, datetime)):
            next_date = next_date.isoformat()
        days_until = item.get("days_until_maintenance")
        hours_until = item.get("hours_until_maintenance")
        days_until = int(days_until) if days_until is not None else None
        hours_until = int(hours_until) if hours_until is not None else None
        reasons = []
        if hours_until is not None and hours_until <= 0:
            reasons.append("service hours reached the maintenance interval")
        elif hours_until is not None and hours_until <= MAINTENANCE_ALERT_WINDOW_HOURS:
            reasons.append(f"{hours_until} service hours remaining")
        if days_until is not None and days_until <= 0:
            reasons.append("scheduled maintenance date is due")
        elif days_until is not None and days_until <= MAINTENANCE_ALERT_WINDOW_DAYS:
            reasons.append(f"{days_until} days remaining")
        return {
            "equipment_id": item.get("equipment_id") or item.get("id"),
            "equipment_name": item.get("equipment_name") or item.get("name"),
            "serial_number": item.get("serial_number", ""),
            "location": item.get("location", ""),
            "alert_level": item.get("alert_level") or item.get("maintenance_alert"),
            "reason": "; ".join(reasons) or "maintenance threshold is approaching",
            "next_maintenance_date": next_date,
            "days_until_maintenance": days_until,
            "hours_until_maintenance": hours_until,
        }
