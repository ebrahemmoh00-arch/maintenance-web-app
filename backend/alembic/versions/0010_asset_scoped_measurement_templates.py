"""Scope measurement templates by asset.

Revision ID: 0010_asset_scoped_measurement_templates
Revises: 0009_measurement_record_actor
Create Date: 2026-07-25
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision = "0010_asset_scoped_measurement_templates"
down_revision = "0009_measurement_record_actor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    if "measurement_templates" not in set(inspector.get_table_names()):
        return

    dialect = connection.dialect.name
    existing_columns = {column["name"] for column in inspector.get_columns("measurement_templates")}
    if "asset_id" not in existing_columns:
        op.add_column("measurement_templates", sa.Column("asset_id", sa.Integer(), nullable=True))

    if dialect == "sqlite":
        _rebuild_sqlite_without_global_name_unique(connection)
    else:
        op.execute(
            """
            DO $$
            DECLARE unique_constraint_name text;
            BEGIN
                SELECT c.conname INTO unique_constraint_name
                FROM pg_constraint c
                JOIN pg_attribute a
                  ON a.attrelid = c.conrelid
                 AND a.attnum = ANY(c.conkey)
                WHERE c.conrelid = 'measurement_templates'::regclass
                  AND c.contype = 'u'
                  AND a.attname = 'name'
                LIMIT 1;

                IF unique_constraint_name IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE measurement_templates DROP CONSTRAINT %I', unique_constraint_name);
                END IF;
            END $$;
            """
        )
        existing_fk_names = {fk["name"] for fk in inspector.get_foreign_keys("measurement_templates")}
        if "fk_measurement_templates_asset_id" not in existing_fk_names:
            op.create_foreign_key(
                "fk_measurement_templates_asset_id",
                "measurement_templates",
                "equipment",
                ["asset_id"],
                ["id"],
                ondelete="CASCADE",
            )

    op.execute("CREATE INDEX IF NOT EXISTS idx_measurement_templates_asset_id ON measurement_templates(asset_id)")
    op.execute(
        """
        UPDATE measurement_templates
        SET asset_id = usage.asset_id
        FROM (
            SELECT template_id, MIN(asset_id) AS asset_id
            FROM asset_measurements
            WHERE template_id IS NOT NULL
            GROUP BY template_id
            HAVING COUNT(DISTINCT asset_id) = 1
        ) AS usage
        WHERE measurement_templates.id = usage.template_id
          AND measurement_templates.asset_id IS NULL
        """
        if dialect != "sqlite"
        else
        """
        UPDATE measurement_templates
        SET asset_id = (
            SELECT MIN(asset_measurements.asset_id)
            FROM asset_measurements
            WHERE asset_measurements.template_id = measurement_templates.id
            GROUP BY asset_measurements.template_id
            HAVING COUNT(DISTINCT asset_measurements.asset_id) = 1
        )
        WHERE asset_id IS NULL
          AND id IN (
            SELECT template_id
            FROM asset_measurements
            WHERE template_id IS NOT NULL
            GROUP BY template_id
            HAVING COUNT(DISTINCT asset_id) = 1
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_measurement_templates_asset_id")
    connection = op.get_bind()
    inspector = inspect(connection)
    if "measurement_templates" in set(inspector.get_table_names()):
        columns = {column["name"] for column in inspector.get_columns("measurement_templates")}
        if "asset_id" in columns:
            with op.batch_alter_table("measurement_templates") as batch_op:
                batch_op.drop_column("asset_id")


def _rebuild_sqlite_without_global_name_unique(connection) -> None:
    indexes = connection.exec_driver_sql("PRAGMA index_list(measurement_templates)").fetchall()
    has_unique_name_index = any(int(row[2] or 0) == 1 for row in indexes)
    if not has_unique_name_index:
        return

    columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(measurement_templates)").fetchall()}
    asset_expr = "asset_id" if "asset_id" in columns else "NULL"
    connection.exec_driver_sql("PRAGMA foreign_keys = OFF")
    connection.exec_driver_sql("DROP TABLE IF EXISTS measurement_templates_new")
    connection.exec_driver_sql(
        """
        CREATE TABLE measurement_templates_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT '',
            unit TEXT DEFAULT '',
            table_schema TEXT DEFAULT '',
            guidance_title TEXT DEFAULT '',
            guidance_file_name TEXT DEFAULT '',
            guidance_file_url TEXT DEFAULT '',
            guidance_notes TEXT DEFAULT '',
            ideal_values TEXT DEFAULT '',
            created_by_id INTEGER,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
            FOREIGN KEY(created_by_id) REFERENCES engineers(id) ON DELETE SET NULL
        )
        """
    )
    connection.exec_driver_sql(
        f"""
        INSERT INTO measurement_templates_new (
            id, asset_id, name, description, category, unit, table_schema,
            guidance_title, guidance_file_name, guidance_file_url, guidance_notes,
            ideal_values, created_by_id, status, created_at, updated_at
        )
        SELECT
            id, {asset_expr}, name, description, category, unit, table_schema,
            guidance_title, guidance_file_name, guidance_file_url, guidance_notes,
            ideal_values, created_by_id, status, created_at, updated_at
        FROM measurement_templates
        """
    )
    connection.exec_driver_sql("DROP TABLE measurement_templates")
    connection.exec_driver_sql("ALTER TABLE measurement_templates_new RENAME TO measurement_templates")
    connection.exec_driver_sql("PRAGMA foreign_keys = ON")
