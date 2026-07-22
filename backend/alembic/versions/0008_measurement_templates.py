"""Add asset measurement templates.

Revision ID: 0008_measurement_templates
Revises: 0007_enterprise_asset_history
Create Date: 2026-07-22
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision = "0008_measurement_templates"
down_revision = "0007_enterprise_asset_history"
branch_labels = None
depends_on = None


MEASUREMENT_COLUMNS = [
    ("template_id", sa.Integer(), None),
    ("measurement_table", sa.Text(), "''"),
    ("table_snapshot", sa.Text(), "''"),
]


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if "measurement_templates" not in existing_tables:
        op.create_table(
            "measurement_templates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.Text(), nullable=False, unique=True),
            sa.Column("description", sa.Text(), server_default=sa.text("''")),
            sa.Column("category", sa.Text(), server_default=sa.text("''")),
            sa.Column("unit", sa.Text(), server_default=sa.text("''")),
            sa.Column("table_schema", sa.Text(), server_default=sa.text("''")),
            sa.Column("guidance_title", sa.Text(), server_default=sa.text("''")),
            sa.Column("guidance_file_name", sa.Text(), server_default=sa.text("''")),
            sa.Column("guidance_file_url", sa.Text(), server_default=sa.text("''")),
            sa.Column("guidance_notes", sa.Text(), server_default=sa.text("''")),
            sa.Column("ideal_values", sa.Text(), server_default=sa.text("''")),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("engineers.id", ondelete="SET NULL")),
            sa.Column("status", sa.Text(), server_default=sa.text("'active'")),
            sa.Column("created_at", sa.Text(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.Text(), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
    existing_columns = {column["name"] for column in inspector.get_columns("asset_measurements")}
    for name, column_type, server_default in MEASUREMENT_COLUMNS:
        if name in existing_columns:
            continue
        kwargs = {}
        if server_default is not None:
            kwargs["server_default"] = sa.text(server_default)
        op.add_column("asset_measurements", sa.Column(name, column_type, **kwargs))
    op.execute("CREATE INDEX IF NOT EXISTS idx_asset_measurements_template_id ON asset_measurements(template_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_measurement_templates_status ON measurement_templates(status)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_measurement_templates_status")
    op.execute("DROP INDEX IF EXISTS idx_asset_measurements_template_id")
    op.drop_table("measurement_templates")
