"""Add saved operational performance reports.

Revision ID: 0012_operational_performance_reports
Revises: 0011_pm_plan_history
Create Date: 2026-07-26
"""

from __future__ import annotations

from alembic import op


revision = "0012_operational_performance_reports"
down_revision = "0011_pm_plan_history"
branch_labels = None
depends_on = None


SQLITE_STATEMENT = """
CREATE TABLE IF NOT EXISTS operational_performance_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_name TEXT DEFAULT '',
    report_type TEXT NOT NULL,
    site_id INTEGER,
    site_name TEXT DEFAULT '',
    equipment_type TEXT DEFAULT '',
    asset_ids TEXT DEFAULT '[]',
    asset_names TEXT DEFAULT '',
    year INTEGER DEFAULT 0,
    month INTEGER DEFAULT 0,
    period_from TEXT DEFAULT '',
    period_to TEXT DEFAULT '',
    readings TEXT DEFAULT '{}',
    summary TEXT DEFAULT '{}',
    table_rows TEXT DEFAULT '[]',
    charts TEXT DEFAULT '{}',
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(site_id) REFERENCES customers(id) ON DELETE SET NULL
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
    "CREATE INDEX IF NOT EXISTS idx_operational_reports_site_id ON operational_performance_reports(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_operational_reports_year ON operational_performance_reports(year)",
    "CREATE INDEX IF NOT EXISTS idx_operational_reports_month ON operational_performance_reports(month)",
    "CREATE INDEX IF NOT EXISTS idx_operational_reports_created_at ON operational_performance_reports(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_operational_reports_report_type ON operational_performance_reports(report_type)",
]


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    op.execute(POSTGRES_STATEMENT if dialect == "postgresql" else SQLITE_STATEMENT)
    for statement in INDEX_STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    for index_name in [
        "idx_operational_reports_report_type",
        "idx_operational_reports_created_at",
        "idx_operational_reports_month",
        "idx_operational_reports_year",
        "idx_operational_reports_site_id",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {index_name}")
    op.execute("DROP TABLE IF EXISTS operational_performance_reports")
