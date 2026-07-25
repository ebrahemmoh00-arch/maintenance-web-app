"""Track asset measurement record actor.

Revision ID: 0009_measurement_record_actor
Revises: 0008_measurement_templates
Create Date: 2026-07-25
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision = "0009_measurement_record_actor"
down_revision = "0008_measurement_templates"
branch_labels = None
depends_on = None


MEASUREMENT_ACTOR_COLUMNS = [
    ("created_by_id", sa.Integer(), None),
    ("user_name", sa.Text(), "''"),
]


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    existing_columns = {column["name"] for column in inspector.get_columns("asset_measurements")}
    for name, column_type, server_default in MEASUREMENT_ACTOR_COLUMNS:
        if name in existing_columns:
            continue
        kwargs = {}
        if server_default is not None:
            kwargs["server_default"] = sa.text(server_default)
        op.add_column("asset_measurements", sa.Column(name, column_type, **kwargs))
    op.execute("CREATE INDEX IF NOT EXISTS idx_asset_measurements_created_by_id ON asset_measurements(created_by_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_asset_measurements_created_by_id")
    existing_columns = {column["name"] for column in inspect(op.get_bind()).get_columns("asset_measurements")}
    for name, _, _ in reversed(MEASUREMENT_ACTOR_COLUMNS):
        if name in existing_columns:
            op.drop_column("asset_measurements", name)
