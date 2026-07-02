"""Add production PM plan engine tables.

Revision ID: 0002_pm_plan_engine
Revises: 0001_initial_schema
Create Date: 2026-07-02
"""

from alembic import op


revision = "0002_pm_plan_engine"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


SQLITE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS pm_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        recurrence_type TEXT DEFAULT 'Runtime Hours',
        interval_value INTEGER DEFAULT 1,
        start_date TEXT NOT NULL,
        next_due_date TEXT DEFAULT '',
        next_due_runtime INTEGER DEFAULT 0,
        last_service_date TEXT DEFAULT '',
        last_runtime INTEGER DEFAULT 0,
        estimated_duration_minutes INTEGER DEFAULT 0,
        required_skills TEXT DEFAULT '',
        checklist_template TEXT DEFAULT '',
        planned_spare_parts TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pm_plan_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pm_plan_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        task_description TEXT DEFAULT '',
        sequence INTEGER DEFAULT 1,
        is_required INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pm_plan_id) REFERENCES pm_plans(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pm_plan_work_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pm_plan_id INTEGER NOT NULL,
        work_order_id INTEGER NOT NULL UNIQUE,
        cycle_key TEXT NOT NULL,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'generated',
        FOREIGN KEY(pm_plan_id) REFERENCES pm_plans(id) ON DELETE CASCADE,
        FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
        UNIQUE(pm_plan_id, cycle_key)
    )
    """,
]


POSTGRES_STATEMENTS = [
    statement
    .replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    .replace("CURRENT_TIMESTAMP", "(CURRENT_TIMESTAMP::text)")
    for statement in SQLITE_STATEMENTS
]


INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_pm_plans_equipment_id ON pm_plans(equipment_id)",
    "CREATE INDEX IF NOT EXISTS idx_pm_plans_status ON pm_plans(status)",
    "CREATE INDEX IF NOT EXISTS idx_pm_plans_next_due_date ON pm_plans(next_due_date)",
    "CREATE INDEX IF NOT EXISTS idx_pm_plans_next_due_runtime ON pm_plans(next_due_runtime)",
    "CREATE INDEX IF NOT EXISTS idx_pm_plan_tasks_plan_id ON pm_plan_tasks(pm_plan_id)",
    "CREATE INDEX IF NOT EXISTS idx_pm_plan_work_orders_plan_id ON pm_plan_work_orders(pm_plan_id)",
    "CREATE INDEX IF NOT EXISTS idx_pm_plan_work_orders_work_order_id ON pm_plan_work_orders(work_order_id)",
]


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    statements = POSTGRES_STATEMENTS if dialect == "postgresql" else SQLITE_STATEMENTS
    for statement in [*statements, *INDEX_STATEMENTS]:
        op.execute(statement)


def downgrade() -> None:
    for index_name in [
        "idx_pm_plan_work_orders_work_order_id",
        "idx_pm_plan_work_orders_plan_id",
        "idx_pm_plan_tasks_plan_id",
        "idx_pm_plans_next_due_runtime",
        "idx_pm_plans_next_due_date",
        "idx_pm_plans_status",
        "idx_pm_plans_equipment_id",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {index_name}")
    op.execute("DROP TABLE IF EXISTS pm_plan_work_orders")
    op.execute("DROP TABLE IF EXISTS pm_plan_tasks")
    op.execute("DROP TABLE IF EXISTS pm_plans")
