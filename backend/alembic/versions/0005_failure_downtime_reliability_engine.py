"""Add failure, downtime, and reliability engine tables.

Revision ID: 0005_failure_downtime_reliability_engine
Revises: 0004_asset_lifecycle_engine
Create Date: 2026-07-02
"""

from alembic import op


revision = "0005_failure_downtime_reliability_engine"
down_revision = "0004_asset_lifecycle_engine"
branch_labels = None
depends_on = None


SQLITE_TABLES = [
    """
    CREATE TABLE IF NOT EXISTS problem_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS failure_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cause_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS remedy_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS failure_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        failure_id TEXT NOT NULL UNIQUE,
        failure_datetime TEXT NOT NULL,
        failure_start TEXT NOT NULL,
        failure_end TEXT DEFAULT '',
        detection_method TEXT DEFAULT '',
        failure_type TEXT DEFAULT '',
        failure_category TEXT DEFAULT '',
        severity TEXT DEFAULT 'medium',
        operational_impact TEXT DEFAULT '',
        breakdown_indicator INTEGER DEFAULT 0,
        emergency_indicator INTEGER DEFAULT 0,
        failure_description TEXT DEFAULT '',
        problem_code_id INTEGER,
        failure_code_id INTEGER,
        cause_code_id INTEGER,
        remedy_code_id INTEGER,
        reported_by_id INTEGER,
        assigned_technician_id INTEGER,
        linked_work_order_id INTEGER,
        linked_pm_id INTEGER,
        status TEXT DEFAULT 'open',
        rca_status TEXT DEFAULT 'not_required',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY(problem_code_id) REFERENCES problem_codes(id) ON DELETE SET NULL,
        FOREIGN KEY(failure_code_id) REFERENCES failure_codes(id) ON DELETE SET NULL,
        FOREIGN KEY(cause_code_id) REFERENCES cause_codes(id) ON DELETE SET NULL,
        FOREIGN KEY(remedy_code_id) REFERENCES remedy_codes(id) ON DELETE SET NULL,
        FOREIGN KEY(reported_by_id) REFERENCES engineers(id) ON DELETE SET NULL,
        FOREIGN KEY(assigned_technician_id) REFERENCES engineers(id) ON DELETE SET NULL,
        FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
        FOREIGN KEY(linked_pm_id) REFERENCES preventive_maintenance(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS downtime_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT DEFAULT '',
        total_downtime_minutes INTEGER DEFAULT 0,
        planned INTEGER DEFAULT 0,
        production_lost REAL DEFAULT 0,
        downtime_category TEXT DEFAULT '',
        downtime_reason TEXT DEFAULT '',
        linked_failure_id INTEGER,
        linked_work_order_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY(linked_failure_id) REFERENCES failure_events(id) ON DELETE SET NULL,
        FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS root_cause_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        failure_event_id INTEGER NOT NULL UNIQUE,
        problem TEXT DEFAULT '',
        cause TEXT DEFAULT '',
        root_cause TEXT DEFAULT '',
        corrective_action TEXT DEFAULT '',
        preventive_action TEXT DEFAULT '',
        lessons_learned TEXT DEFAULT '',
        verification_status TEXT DEFAULT 'pending',
        approval_status TEXT DEFAULT 'pending',
        approved_by_id INTEGER,
        approved_at TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(failure_event_id) REFERENCES failure_events(id) ON DELETE CASCADE,
        FOREIGN KEY(approved_by_id) REFERENCES engineers(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS corrective_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        failure_event_id INTEGER NOT NULL,
        work_order_id INTEGER,
        repair_type TEXT DEFAULT 'Corrective',
        temporary_repair INTEGER DEFAULT 0,
        permanent_repair INTEGER DEFAULT 0,
        parts_used TEXT DEFAULT '',
        labor_hours REAL DEFAULT 0,
        contractor TEXT DEFAULT '',
        repair_notes TEXT DEFAULT '',
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(failure_event_id) REFERENCES failure_events(id) ON DELETE CASCADE,
        FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS failure_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL UNIQUE,
        mtbf_hours REAL DEFAULT 0,
        mttr_hours REAL DEFAULT 0,
        availability_percent REAL DEFAULT 100,
        reliability_percent REAL DEFAULT 100,
        failure_frequency INTEGER DEFAULT 0,
        total_downtime_hours REAL DEFAULT 0,
        downtime_percent REAL DEFAULT 0,
        average_repair_time_hours REAL DEFAULT 0,
        repair_cost REAL DEFAULT 0,
        downtime_cost REAL DEFAULT 0,
        calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '',
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
]


POSTGRES_TABLES = [
    statement
    .replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    .replace("CURRENT_TIMESTAMP", "(CURRENT_TIMESTAMP::text)")
    for statement in SQLITE_TABLES
]


INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_failure_events_asset_id ON failure_events(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_failure_events_failure_datetime ON failure_events(failure_datetime)",
    "CREATE INDEX IF NOT EXISTS idx_failure_events_status ON failure_events(status)",
    "CREATE INDEX IF NOT EXISTS idx_failure_events_linked_work_order_id ON failure_events(linked_work_order_id)",
    "CREATE INDEX IF NOT EXISTS idx_downtime_events_asset_id ON downtime_events(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_downtime_events_start_time ON downtime_events(start_time)",
    "CREATE INDEX IF NOT EXISTS idx_downtime_events_linked_failure_id ON downtime_events(linked_failure_id)",
    "CREATE INDEX IF NOT EXISTS idx_root_cause_failure_event_id ON root_cause_analysis(failure_event_id)",
    "CREATE INDEX IF NOT EXISTS idx_corrective_actions_failure_event_id ON corrective_actions(failure_event_id)",
    "CREATE INDEX IF NOT EXISTS idx_failure_statistics_asset_id ON failure_statistics(asset_id)",
]


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    statements = POSTGRES_TABLES if dialect == "postgresql" else SQLITE_TABLES
    for statement in [*statements, *INDEX_STATEMENTS]:
        op.execute(statement)


def downgrade() -> None:
    for index_name in [
        "idx_failure_statistics_asset_id",
        "idx_corrective_actions_failure_event_id",
        "idx_root_cause_failure_event_id",
        "idx_downtime_events_linked_failure_id",
        "idx_downtime_events_start_time",
        "idx_downtime_events_asset_id",
        "idx_failure_events_linked_work_order_id",
        "idx_failure_events_status",
        "idx_failure_events_failure_datetime",
        "idx_failure_events_asset_id",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {index_name}")
    op.execute("DROP TABLE IF EXISTS failure_statistics")
    op.execute("DROP TABLE IF EXISTS corrective_actions")
    op.execute("DROP TABLE IF EXISTS root_cause_analysis")
    op.execute("DROP TABLE IF EXISTS downtime_events")
    op.execute("DROP TABLE IF EXISTS failure_events")
    op.execute("DROP TABLE IF EXISTS remedy_codes")
    op.execute("DROP TABLE IF EXISTS cause_codes")
    op.execute("DROP TABLE IF EXISTS failure_codes")
    op.execute("DROP TABLE IF EXISTS problem_codes")
