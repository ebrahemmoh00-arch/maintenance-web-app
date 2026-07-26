"""Add PM plan maintenance history records.

Revision ID: 0011_pm_plan_history
Revises: 0010_asset_scoped_measurement_templates
Create Date: 2026-07-26
"""

from __future__ import annotations

from alembic import op


revision = "0011_pm_plan_history"
down_revision = "0010_asset_scoped_measurement_templates"
branch_labels = None
depends_on = None


SQLITE_STATEMENT = """
CREATE TABLE IF NOT EXISTS pm_plan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pm_plan_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    service_hours INTEGER DEFAULT 0,
    service_date TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(pm_plan_id) REFERENCES pm_plans(id) ON DELETE CASCADE,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
)
"""

POSTGRES_STATEMENT = SQLITE_STATEMENT.replace(
    "INTEGER PRIMARY KEY AUTOINCREMENT",
    "SERIAL PRIMARY KEY",
).replace(
    "CURRENT_TIMESTAMP",
    "(CURRENT_TIMESTAMP::text)",
)

INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_pm_plan_history_plan_id ON pm_plan_history(pm_plan_id)",
    "CREATE INDEX IF NOT EXISTS idx_pm_plan_history_equipment_id ON pm_plan_history(equipment_id)",
]


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    op.execute(POSTGRES_STATEMENT if dialect == "postgresql" else SQLITE_STATEMENT)
    for statement in INDEX_STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    for index_name in [
        "idx_pm_plan_history_equipment_id",
        "idx_pm_plan_history_plan_id",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {index_name}")
    op.execute("DROP TABLE IF EXISTS pm_plan_history")
