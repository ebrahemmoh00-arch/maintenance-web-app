"""Add configurable operational report meter items.

Revision ID: 0013_operational_report_items
Revises: 0012_operational_performance_reports
Create Date: 2026-07-26
"""

from __future__ import annotations

from alembic import op


revision = "0013_operational_report_items"
down_revision = "0012_operational_performance_reports"
branch_labels = None
depends_on = None


SQLITE_STATEMENT = """
CREATE TABLE IF NOT EXISTS operational_report_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL UNIQUE,
    unit TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
"""

POSTGRES_STATEMENT = SQLITE_STATEMENT.replace(
    "INTEGER PRIMARY KEY AUTOINCREMENT",
    "SERIAL PRIMARY KEY",
).replace(
    "CURRENT_TIMESTAMP",
    "(CURRENT_TIMESTAMP::text)",
)

DEFAULT_ITEMS = [
    ("runningHours", "Running Hours", "h", 10, 1),
    ("energy", "Energy", "kWh", 20, 1),
    ("gas", "Gas", "m3", 30, 1),
    ("oil", "Oil", "L", 40, 1),
    ("water", "Water", "m3", 50, 1),
    ("steam", "Steam", "t", 60, 1),
    ("chiller", "Chiller", "h", 70, 1),
]

INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_operational_report_items_sort_order ON operational_report_items(sort_order)",
    "CREATE INDEX IF NOT EXISTS idx_operational_report_items_is_active ON operational_report_items(is_active)",
]


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    op.execute(POSTGRES_STATEMENT if dialect == "postgresql" else SQLITE_STATEMENT)
    for statement in INDEX_STATEMENTS:
        op.execute(statement)
    for key, label, unit, sort_order, is_active in DEFAULT_ITEMS:
        op.execute(
            """
            INSERT INTO operational_report_items (key, label, unit, sort_order, is_active)
            SELECT '{key}', '{label}', '{unit}', {sort_order}, {is_active}
            WHERE NOT EXISTS (
                SELECT 1 FROM operational_report_items WHERE lower(key) = lower('{key}')
            )
            """.format(
                key=key,
                label=label,
                unit=unit,
                sort_order=sort_order,
                is_active=is_active,
            )
        )


def downgrade() -> None:
    for index_name in [
        "idx_operational_report_items_is_active",
        "idx_operational_report_items_sort_order",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {index_name}")
    op.execute("DROP TABLE IF EXISTS operational_report_items")
