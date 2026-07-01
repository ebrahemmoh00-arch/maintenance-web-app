"""Initial CMMS schema baseline.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-01
"""

from alembic import op


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


SQLITE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        contact_person TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS engineers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_code TEXT DEFAULT '',
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        specialty TEXT DEFAULT '',
        job_title TEXT DEFAULT '',
        department TEXT DEFAULT '',
        work_location TEXT DEFAULT '',
        supervisor TEXT DEFAULT '',
        username TEXT DEFAULT '',
        password TEXT DEFAULT '',
        role TEXT DEFAULT 'viewer',
        permissions TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS job_titles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        serial_number TEXT DEFAULT '',
        model TEXT DEFAULT '',
        location TEXT DEFAULT '',
        parent_id INTEGER,
        asset_type TEXT DEFAULT 'Equipment',
        asset_level TEXT DEFAULT 'Equipment',
        asset_code TEXT DEFAULT '',
        criticality TEXT DEFAULT 'Medium',
        maintenance_interval_hours INTEGER DEFAULT 1000,
        maintenance_interval_days INTEGER DEFAULT 90,
        current_hours INTEGER DEFAULT 0,
        last_maintenance_date TEXT DEFAULT '',
        status TEXT DEFAULT 'operational',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS work_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        customer_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        engineer_id INTEGER NOT NULL,
        scheduled_date TEXT NOT NULL,
        due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        service_hours INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
        FOREIGN KEY(engineer_id) REFERENCES engineers(id) ON DELETE RESTRICT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_number TEXT DEFAULT '',
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        stock_quantity INTEGER DEFAULT 0,
        minimum_quantity INTEGER DEFAULT 1,
        unit TEXT DEFAULT 'pcs',
        location TEXT DEFAULT '',
        linked_work_order_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS preventive_maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        interval_hours INTEGER DEFAULT 0,
        interval_days INTEGER DEFAULT 30,
        last_service_hours INTEGER DEFAULT 0,
        last_service_date TEXT DEFAULT '',
        next_due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS preventive_maintenance_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pm_task_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        service_hours INTEGER DEFAULT 0,
        service_date TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pm_task_id) REFERENCES preventive_maintenance(id) ON DELETE CASCADE,
        FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jti TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        token_type TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT DEFAULT '',
        user_name TEXT DEFAULT '',
        role TEXT DEFAULT '',
        action TEXT DEFAULT '',
        module TEXT DEFAULT '',
        record_id TEXT DEFAULT '',
        description TEXT DEFAULT '',
        old_values TEXT DEFAULT '',
        new_values TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        device_info TEXT DEFAULT '',
        status TEXT DEFAULT 'SUCCESS'
    )
    """,
]


POSTGRES_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        contact_person TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS engineers (
        id SERIAL PRIMARY KEY,
        employee_code TEXT DEFAULT '',
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        specialty TEXT DEFAULT '',
        job_title TEXT DEFAULT '',
        department TEXT DEFAULT '',
        work_location TEXT DEFAULT '',
        supervisor TEXT DEFAULT '',
        username TEXT DEFAULT '',
        password TEXT DEFAULT '',
        role TEXT DEFAULT 'viewer',
        permissions TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS job_titles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        serial_number TEXT DEFAULT '',
        model TEXT DEFAULT '',
        location TEXT DEFAULT '',
        parent_id INTEGER,
        asset_type TEXT DEFAULT 'Equipment',
        asset_level TEXT DEFAULT 'Equipment',
        asset_code TEXT DEFAULT '',
        criticality TEXT DEFAULT 'Medium',
        maintenance_interval_hours INTEGER DEFAULT 1000,
        maintenance_interval_days INTEGER DEFAULT 90,
        current_hours INTEGER DEFAULT 0,
        last_maintenance_date TEXT DEFAULT '',
        status TEXT DEFAULT 'operational',
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        customer_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        engineer_id INTEGER NOT NULL,
        scheduled_date TEXT NOT NULL,
        due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        service_hours INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
        FOREIGN KEY(engineer_id) REFERENCES engineers(id) ON DELETE RESTRICT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        part_number TEXT DEFAULT '',
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        stock_quantity INTEGER DEFAULT 0,
        minimum_quantity INTEGER DEFAULT 1,
        unit TEXT DEFAULT 'pcs',
        location TEXT DEFAULT '',
        linked_work_order_id INTEGER,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS preventive_maintenance (
        id SERIAL PRIMARY KEY,
        equipment_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        interval_hours INTEGER DEFAULT 0,
        interval_days INTEGER DEFAULT 30,
        last_service_hours INTEGER DEFAULT 0,
        last_service_date TEXT DEFAULT '',
        next_due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS preventive_maintenance_history (
        id SERIAL PRIMARY KEY,
        pm_task_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        service_hours INTEGER DEFAULT 0,
        service_date TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        FOREIGN KEY(pm_task_id) REFERENCES preventive_maintenance(id) ON DELETE CASCADE,
        FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS auth_tokens (
        id SERIAL PRIMARY KEY,
        jti TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        token_type TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT DEFAULT '',
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        timestamp TEXT DEFAULT (CURRENT_TIMESTAMP::text),
        user_id TEXT DEFAULT '',
        user_name TEXT DEFAULT '',
        role TEXT DEFAULT '',
        action TEXT DEFAULT '',
        module TEXT DEFAULT '',
        record_id TEXT DEFAULT '',
        description TEXT DEFAULT '',
        old_values TEXT DEFAULT '',
        new_values TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        device_info TEXT DEFAULT '',
        status TEXT DEFAULT 'SUCCESS'
    )
    """,
]


INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
]


DROP_TABLES = [
    "audit_logs",
    "auth_tokens",
    "preventive_maintenance_history",
    "preventive_maintenance",
    "inventory_items",
    "work_orders",
    "equipment",
    "job_titles",
    "engineers",
    "customers",
]


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    statements = POSTGRES_STATEMENTS if dialect == "postgresql" else SQLITE_STATEMENTS
    for statement in [*statements, *INDEX_STATEMENTS]:
        op.execute(statement)


def downgrade() -> None:
    for table in DROP_TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table}")
