"""Add production asset lifecycle engine tables.

Revision ID: 0004_asset_lifecycle_engine
Revises: 0003_work_order_lifecycle_engine
Create Date: 2026-07-02
"""

from alembic import op


revision = "0004_asset_lifecycle_engine"
down_revision = "0003_work_order_lifecycle_engine"
branch_labels = None
depends_on = None


EQUIPMENT_COLUMNS = {
    "description": "TEXT DEFAULT ''",
    "category": "TEXT DEFAULT ''",
    "manufacturer": "TEXT DEFAULT ''",
    "qr_code": "TEXT DEFAULT ''",
    "barcode": "TEXT DEFAULT ''",
    "site": "TEXT DEFAULT ''",
    "department": "TEXT DEFAULT ''",
    "commission_date": "TEXT DEFAULT ''",
    "installation_date": "TEXT DEFAULT ''",
    "warranty_start": "TEXT DEFAULT ''",
    "warranty_end": "TEXT DEFAULT ''",
    "expected_life_years": "INTEGER DEFAULT 0",
    "replacement_cost": "REAL DEFAULT 0",
    "current_condition": "TEXT DEFAULT ''",
    "last_reading": "REAL DEFAULT 0",
    "current_reading": "REAL DEFAULT 0",
    "last_pm_date": "TEXT DEFAULT ''",
    "next_pm_date": "TEXT DEFAULT ''",
    "last_breakdown_date": "TEXT DEFAULT ''",
    "last_repair_date": "TEXT DEFAULT ''",
    "purchase_cost": "REAL DEFAULT 0",
    "total_maintenance_cost": "REAL DEFAULT 0",
    "spare_parts_cost": "REAL DEFAULT 0",
    "labor_cost": "REAL DEFAULT 0",
    "contractor_cost": "REAL DEFAULT 0",
}


SQLITE_TABLES = [
    """
    CREATE TABLE IF NOT EXISTS asset_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        source_module TEXT DEFAULT '',
        source_record_id TEXT DEFAULT '',
        actor_id INTEGER,
        metadata TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY(actor_id) REFERENCES engineers(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS asset_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        status TEXT DEFAULT 'open',
        due_date TEXT DEFAULT '',
        description TEXT DEFAULT '',
        source_module TEXT DEFAULT '',
        source_record_id TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT DEFAULT '',
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS asset_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        measurement_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT DEFAULT '',
        reading_date TEXT DEFAULT CURRENT_TIMESTAMP,
        source_module TEXT DEFAULT '',
        source_record_id TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS asset_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        document_type TEXT DEFAULT 'Manual',
        title TEXT NOT NULL,
        file_name TEXT DEFAULT '',
        file_url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        uploaded_by_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY(uploaded_by_id) REFERENCES engineers(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS asset_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        photo_type TEXT DEFAULT 'Current Photo',
        title TEXT NOT NULL,
        file_name TEXT DEFAULT '',
        file_url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        uploaded_by_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY(uploaded_by_id) REFERENCES engineers(id) ON DELETE SET NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS asset_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL UNIQUE,
        health_score INTEGER DEFAULT 100,
        health_status TEXT DEFAULT 'Excellent',
        availability REAL DEFAULT 100,
        mtbf REAL DEFAULT 0,
        mttr REAL DEFAULT 0,
        total_downtime_hours REAL DEFAULT 0,
        maintenance_cost REAL DEFAULT 0,
        pm_compliance REAL DEFAULT 100,
        failure_frequency INTEGER DEFAULT 0,
        open_work_orders INTEGER DEFAULT 0,
        completed_pm INTEGER DEFAULT 0,
        upcoming_pm INTEGER DEFAULT 0,
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
    "CREATE INDEX IF NOT EXISTS idx_equipment_asset_code ON equipment(asset_code)",
    "CREATE INDEX IF NOT EXISTS idx_equipment_site ON equipment(site)",
    "CREATE INDEX IF NOT EXISTS idx_equipment_department ON equipment(department)",
    "CREATE INDEX IF NOT EXISTS idx_asset_history_asset_id ON asset_history(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_history_created_at ON asset_history(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_asset_events_asset_id ON asset_events(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_events_status ON asset_events(status)",
    "CREATE INDEX IF NOT EXISTS idx_asset_measurements_asset_id ON asset_measurements(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON asset_documents(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_photos_asset_id ON asset_photos(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_health_asset_id ON asset_health(asset_id)",
]


def _sqlite_column_exists(column_name: str) -> bool:
    rows = op.get_bind().exec_driver_sql("PRAGMA table_info(equipment)").fetchall()
    return column_name in {row[1] for row in rows}


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "postgresql":
        for column, definition in EQUIPMENT_COLUMNS.items():
            op.execute(f"ALTER TABLE equipment ADD COLUMN IF NOT EXISTS {column} {definition}")
        statements = POSTGRES_TABLES
    else:
        for column, definition in EQUIPMENT_COLUMNS.items():
            if not _sqlite_column_exists(column):
                op.execute(f"ALTER TABLE equipment ADD COLUMN {column} {definition}")
        statements = SQLITE_TABLES

    for statement in [*statements, *INDEX_STATEMENTS]:
        op.execute(statement)


def downgrade() -> None:
    for index_name in [
        "idx_asset_health_asset_id",
        "idx_asset_photos_asset_id",
        "idx_asset_documents_asset_id",
        "idx_asset_measurements_asset_id",
        "idx_asset_events_status",
        "idx_asset_events_asset_id",
        "idx_asset_history_created_at",
        "idx_asset_history_asset_id",
        "idx_equipment_department",
        "idx_equipment_site",
        "idx_equipment_asset_code",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {index_name}")
    op.execute("DROP TABLE IF EXISTS asset_health")
    op.execute("DROP TABLE IF EXISTS asset_photos")
    op.execute("DROP TABLE IF EXISTS asset_documents")
    op.execute("DROP TABLE IF EXISTS asset_measurements")
    op.execute("DROP TABLE IF EXISTS asset_events")
    op.execute("DROP TABLE IF EXISTS asset_history")
