"""Add production work order lifecycle engine tables.

Revision ID: 0003_work_order_lifecycle_engine
Revises: 0002_pm_plan_engine
Create Date: 2026-07-02
"""

from alembic import op


revision = "0003_work_order_lifecycle_engine"
down_revision = "0002_pm_plan_engine"
branch_labels = None
depends_on = None


WORK_ORDER_COLUMNS = {
    "assigned_by_id": "INTEGER",
    "assigned_at": "TEXT DEFAULT ''",
    "accepted_at": "TEXT DEFAULT ''",
    "started_at": "TEXT DEFAULT ''",
    "paused_at": "TEXT DEFAULT ''",
    "resumed_at": "TEXT DEFAULT ''",
    "completed_at": "TEXT DEFAULT ''",
    "approved_by_id": "INTEGER",
    "approved_at": "TEXT DEFAULT ''",
    "closed_at": "TEXT DEFAULT ''",
    "cancelled_at": "TEXT DEFAULT ''",
    "rejected_at": "TEXT DEFAULT ''",
    "hold_reason": "TEXT DEFAULT ''",
    "waiting_parts_reason": "TEXT DEFAULT ''",
    "runtime_reading_start": "INTEGER DEFAULT 0",
    "runtime_reading_end": "INTEGER DEFAULT 0",
    "technician_notes": "TEXT DEFAULT ''",
    "completion_notes": "TEXT DEFAULT ''",
    "supervisor_notes": "TEXT DEFAULT ''",
    "checklist_completed": "INTEGER DEFAULT 0",
    "work_duration_minutes": "INTEGER DEFAULT 0",
}


SQLITE_TABLES = [
    """
    CREATE TABLE IF NOT EXISTS work_order_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        from_status TEXT DEFAULT '',
        to_status TEXT DEFAULT '',
        actor_id INTEGER,
        actor_name TEXT DEFAULT '',
        description TEXT DEFAULT '',
        metadata TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
        FOREIGN KEY(actor_id) REFERENCES engineers(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS work_order_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order_id INTEGER NOT NULL,
        from_status TEXT DEFAULT '',
        to_status TEXT NOT NULL,
        changed_by_id INTEGER,
        reason TEXT DEFAULT '',
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
        FOREIGN KEY(changed_by_id) REFERENCES engineers(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS work_order_assignment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order_id INTEGER NOT NULL,
        engineer_id INTEGER NOT NULL,
        assigned_by_id INTEGER,
        assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        notes TEXT DEFAULT '',
        FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
        FOREIGN KEY(engineer_id) REFERENCES engineers(id) ON DELETE RESTRICT,
        FOREIGN KEY(assigned_by_id) REFERENCES engineers(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS work_order_approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order_id INTEGER NOT NULL,
        supervisor_id INTEGER,
        action TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
        FOREIGN KEY(supervisor_id) REFERENCES engineers(id) ON DELETE SET NULL
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
    "CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date)",
    "CREATE INDEX IF NOT EXISTS idx_work_order_timeline_work_order_id ON work_order_timeline(work_order_id)",
    "CREATE INDEX IF NOT EXISTS idx_work_order_status_history_work_order_id ON work_order_status_history(work_order_id)",
    "CREATE INDEX IF NOT EXISTS idx_work_order_assignment_history_work_order_id ON work_order_assignment_history(work_order_id)",
    "CREATE INDEX IF NOT EXISTS idx_work_order_approvals_work_order_id ON work_order_approvals(work_order_id)",
]


def _sqlite_column_exists(column_name: str) -> bool:
    rows = op.get_bind().exec_driver_sql("PRAGMA table_info(work_orders)").fetchall()
    return column_name in {row[1] for row in rows}


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "postgresql":
        for column, definition in WORK_ORDER_COLUMNS.items():
            op.execute(f"ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS {column} {definition}")
        statements = POSTGRES_TABLES
    else:
        for column, definition in WORK_ORDER_COLUMNS.items():
            if not _sqlite_column_exists(column):
                op.execute(f"ALTER TABLE work_orders ADD COLUMN {column} {definition}")
        statements = SQLITE_TABLES

    for statement in [*statements, *INDEX_STATEMENTS]:
        op.execute(statement)


def downgrade() -> None:
    for index_name in [
        "idx_work_order_approvals_work_order_id",
        "idx_work_order_assignment_history_work_order_id",
        "idx_work_order_status_history_work_order_id",
        "idx_work_order_timeline_work_order_id",
        "idx_work_orders_due_date",
        "idx_work_orders_status",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {index_name}")
    op.execute("DROP TABLE IF EXISTS work_order_approvals")
    op.execute("DROP TABLE IF EXISTS work_order_assignment_history")
    op.execute("DROP TABLE IF EXISTS work_order_status_history")
    op.execute("DROP TABLE IF EXISTS work_order_timeline")
