"""Add enterprise asset history fields and indexes.

Revision ID: 0007_enterprise_asset_history
Revises: 0006_architecture_refactor_indexes
Create Date: 2026-07-04
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision = "0007_enterprise_asset_history"
down_revision = "0006_architecture_refactor_indexes"
branch_labels = None
depends_on = None


COLUMNS = [
    ("event_time", sa.Text(), "''"),
    ("reference_type", sa.Text(), "''"),
    ("reference_id", sa.Text(), "''"),
    ("user_id", sa.Integer(), None),
    ("summary", sa.Text(), "''"),
    ("details", sa.Text(), "''"),
    ("status", sa.Text(), "''"),
    ("work_order_id", sa.Integer(), None),
    ("pm_plan_id", sa.Integer(), None),
    ("failure_code", sa.Text(), "''"),
    ("downtime_duration_minutes", sa.Integer(), "0"),
    ("parts_used", sa.Text(), "''"),
    ("technician_name", sa.Text(), "''"),
    ("category", sa.Text(), "''"),
    ("event_icon", sa.Text(), "''"),
]


INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_asset_history_event_time ON asset_history(event_time)",
    "CREATE INDEX IF NOT EXISTS idx_asset_history_event_type ON asset_history(event_type)",
    "CREATE INDEX IF NOT EXISTS idx_asset_history_work_order_id ON asset_history(work_order_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_history_pm_plan_id ON asset_history(pm_plan_id)",
]


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    existing = {column["name"] for column in inspector.get_columns("asset_history")}
    for name, column_type, server_default in COLUMNS:
        if name in existing:
            continue
        kwargs = {}
        if server_default is not None:
            kwargs["server_default"] = sa.text(server_default)
        op.add_column("asset_history", sa.Column(name, column_type, **kwargs))
    for statement in INDEXES:
        op.execute(statement)


def downgrade() -> None:
    for statement in reversed(INDEXES):
        name = statement.split("INDEX IF NOT EXISTS ", 1)[1].split(" ON ", 1)[0]
        op.execute(f"DROP INDEX IF EXISTS {name}")
