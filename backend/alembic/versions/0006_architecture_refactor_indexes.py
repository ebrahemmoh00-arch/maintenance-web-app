"""Add architecture refactor performance indexes.

Revision ID: 0006_architecture_refactor_indexes
Revises: 0005_failure_downtime_reliability_engine
Create Date: 2026-07-03
"""

from alembic import op


revision = "0006_architecture_refactor_indexes"
down_revision = "0005_failure_downtime_reliability_engine"
branch_labels = None
depends_on = None


INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)",
    "CREATE INDEX IF NOT EXISTS idx_engineers_role ON engineers(role)",
    "CREATE INDEX IF NOT EXISTS idx_engineers_status ON engineers(status)",
    "CREATE INDEX IF NOT EXISTS idx_engineers_work_location ON engineers(work_location)",
    "CREATE INDEX IF NOT EXISTS idx_equipment_customer_id ON equipment(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_equipment_parent_id ON equipment(parent_id)",
    "CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status)",
    "CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category)",
    "CREATE INDEX IF NOT EXISTS idx_equipment_asset_level ON equipment(asset_level)",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON work_orders(equipment_id)",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_engineer_id ON work_orders(engineer_id)",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority)",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON work_orders(scheduled_date)",
    "CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category)",
    "CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_quantity ON inventory_items(stock_quantity)",
    "CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_equipment_id ON preventive_maintenance(equipment_id)",
    "CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_status ON preventive_maintenance(status)",
]


def upgrade() -> None:
    for statement in INDEXES:
        op.execute(statement)


def downgrade() -> None:
    for name in reversed([statement.split("INDEX IF NOT EXISTS ", 1)[1].split(" ON ", 1)[0] for statement in INDEXES]):
        op.execute(f"DROP INDEX IF EXISTS {name}")
