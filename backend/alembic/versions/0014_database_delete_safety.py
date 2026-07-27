"""Harden delete behavior for historical maintenance records.

Revision ID: 0014_database_delete_safety
Revises: 0013_operational_report_items
Create Date: 2026-07-27
"""

from __future__ import annotations

from alembic import op


revision = "0014_database_delete_safety"
down_revision = "0013_operational_report_items"
branch_labels = None
depends_on = None


SAFE_RESTRICT_FOREIGN_KEYS = [
    ("equipment", "customer_id", "customers"),
    ("asset_history", "asset_id", "equipment"),
    ("asset_events", "asset_id", "equipment"),
    ("asset_measurements", "asset_id", "equipment"),
    ("asset_documents", "asset_id", "equipment"),
    ("asset_photos", "asset_id", "equipment"),
    ("failure_events", "asset_id", "equipment"),
    ("downtime_events", "asset_id", "equipment"),
    ("root_cause_analysis", "failure_event_id", "failure_events"),
    ("corrective_actions", "failure_event_id", "failure_events"),
    ("work_order_timeline", "work_order_id", "work_orders"),
    ("work_order_status_history", "work_order_id", "work_orders"),
    ("work_order_assignment_history", "work_order_id", "work_orders"),
    ("work_order_approvals", "work_order_id", "work_orders"),
    ("preventive_maintenance", "equipment_id", "equipment"),
    ("preventive_maintenance_history", "pm_task_id", "preventive_maintenance"),
    ("preventive_maintenance_history", "equipment_id", "equipment"),
    ("pm_plans", "equipment_id", "equipment"),
    ("pm_plan_history", "pm_plan_id", "pm_plans"),
    ("pm_plan_history", "equipment_id", "equipment"),
    ("pm_plan_work_orders", "pm_plan_id", "pm_plans"),
    ("pm_plan_work_orders", "work_order_id", "work_orders"),
    ("measurement_templates", "asset_id", "equipment"),
]


SQLITE_REBUILD_TABLES = sorted({table for table, _, _ in SAFE_RESTRICT_FOREIGN_KEYS})
SQLITE_FOREIGN_KEYS_BY_TABLE = {
    table: [(column, ref_table) for fk_table, column, ref_table in SAFE_RESTRICT_FOREIGN_KEYS if fk_table == table]
    for table in SQLITE_REBUILD_TABLES
}


def _quote(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def _postgres_set_fk(table: str, column: str, ref_table: str, on_delete: str) -> None:
    constraint_name = f"fk_{table}_{column}_delete_safety"
    op.execute(
        f"""
        DO $$
        DECLARE
            existing_name text;
        BEGIN
            SELECT c.conname
            INTO existing_name
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            JOIN pg_class rt ON rt.oid = c.confrelid
            WHERE c.contype = 'f'
              AND t.relname = '{table}'
              AND a.attname = '{column}'
              AND rt.relname = '{ref_table}'
            LIMIT 1;

            IF existing_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', '{table}', existing_name);
            END IF;

            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '{table}'
                  AND column_name = '{column}'
            ) THEN
                EXECUTE format(
                    'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE {on_delete}',
                    '{table}',
                    '{constraint_name}',
                    '{column}',
                    '{ref_table}'
                );
            END IF;
        END $$;
        """
    )


def _sqlite_table_exists(connection, table: str) -> bool:
    return (
        connection.exec_driver_sql(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table,),
        ).fetchone()
        is not None
    )


def _sqlite_rewrite_delete_behavior(create_sql: str, table: str, on_delete: str) -> str:
    rewritten_sql = create_sql
    for column, ref_table in SQLITE_FOREIGN_KEYS_BY_TABLE.get(table, []):
        for current_behavior in ("CASCADE", "RESTRICT"):
            rewritten_sql = rewritten_sql.replace(
                f"FOREIGN KEY({column}) REFERENCES {ref_table}(id) ON DELETE {current_behavior}",
                f"FOREIGN KEY({column}) REFERENCES {ref_table}(id) ON DELETE {on_delete}",
            )
            rewritten_sql = rewritten_sql.replace(
                f"{column} INTEGER REFERENCES {ref_table}(id) ON DELETE {current_behavior}",
                f"{column} INTEGER REFERENCES {ref_table}(id) ON DELETE {on_delete}",
            )
    return rewritten_sql


def _sqlite_rebuild_table(connection, table: str, on_delete: str) -> None:
    if not _sqlite_table_exists(connection, table):
        return

    create_row = connection.exec_driver_sql(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    if not create_row or not create_row[0]:
        return

    old_table = f"{table}__delete_safety_old"
    connection.exec_driver_sql(f"DROP TABLE IF EXISTS {_quote(old_table)}")

    index_rows = connection.exec_driver_sql(
        "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL",
        (table,),
    ).fetchall()

    create_sql = _sqlite_rewrite_delete_behavior(create_row[0], table, on_delete)
    connection.exec_driver_sql(f"ALTER TABLE {_quote(table)} RENAME TO {_quote(old_table)}")
    connection.exec_driver_sql(create_sql)

    old_columns = [
        row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({_quote(old_table)})").fetchall()
    ]
    new_columns = [
        row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({_quote(table)})").fetchall()
    ]
    copy_columns = [column for column in old_columns if column in new_columns]
    if copy_columns:
        columns_sql = ", ".join(_quote(column) for column in copy_columns)
        connection.exec_driver_sql(
            f"INSERT INTO {_quote(table)} ({columns_sql}) SELECT {columns_sql} FROM {_quote(old_table)}"
        )

    connection.exec_driver_sql(f"DROP TABLE {_quote(old_table)}")
    for _, index_sql in index_rows:
        connection.exec_driver_sql(index_sql)


def _sqlite_set_delete_behavior(on_delete: str) -> None:
    connection = op.get_bind()
    connection.exec_driver_sql("PRAGMA foreign_keys = OFF")
    for table in SQLITE_REBUILD_TABLES:
        _sqlite_rebuild_table(connection, table, on_delete)
    connection.exec_driver_sql("PRAGMA foreign_keys = ON")


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "postgresql":
        for table, column, ref_table in SAFE_RESTRICT_FOREIGN_KEYS:
            _postgres_set_fk(table, column, ref_table, "RESTRICT")
        return

    if dialect == "sqlite":
        _sqlite_set_delete_behavior("RESTRICT")


def downgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "postgresql":
        for table, column, ref_table in SAFE_RESTRICT_FOREIGN_KEYS:
            _postgres_set_fk(table, column, ref_table, "CASCADE")
        return

    if dialect == "sqlite":
        _sqlite_set_delete_behavior("CASCADE")
