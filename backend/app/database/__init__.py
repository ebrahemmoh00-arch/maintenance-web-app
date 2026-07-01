from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any

from ..core.config import admin_credentials_configured, admin_email, admin_password, admin_username, database_url
from ..core.security import hash_password, is_password_hash

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover - SQLite-only local installs can still run.
    psycopg = None
    dict_row = None

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "maintenance.db"
DATABASE_URL = database_url()
DB_BACKEND = "postgres" if DATABASE_URL else "sqlite"


SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS job_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jti TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    token_type TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
"""


POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

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
);

CREATE TABLE IF NOT EXISTS job_titles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

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
);

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
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    jti TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    token_type TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

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
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
"""


class DatabaseConnection:
    def __init__(self, raw: Any, backend: str):
        self.raw = raw
        self.backend = backend

    def __enter__(self) -> "DatabaseConnection":
        self.raw.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.raw.__exit__(exc_type, exc, tb)

    def execute(self, query: str, params: tuple[Any, ...] | list[Any] | None = None):
        return self.raw.execute(adapt_query(query, self.backend), params or ())

    def executescript(self, script: str) -> None:
        if self.backend == "sqlite":
            self.raw.executescript(script)
            return
        for statement in split_sql_script(script):
            self.execute(statement)

    def commit(self) -> None:
        self.raw.commit()


def get_connection() -> DatabaseConnection:
    if DB_BACKEND == "postgres":
        if psycopg is None:
            raise RuntimeError("DATABASE_URL is set, but psycopg is not installed.")
        connection = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        return DatabaseConnection(connection, "postgres")

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return DatabaseConnection(connection, "sqlite")


def adapt_query(query: str, backend: str) -> str:
    if backend != "postgres":
        return query
    adapted = query.replace("?", "%s")
    adapted = adapted.replace("COLLATE NOCASE", "")
    adapted = re.sub(r"\bINSERT OR IGNORE INTO\b", "INSERT INTO", adapted, flags=re.IGNORECASE)
    return adapted


def split_sql_script(script: str) -> list[str]:
    return [statement.strip() for statement in script.split(";") if statement.strip()]


def insert_row(db: DatabaseConnection, table: str, data: dict[str, Any]) -> int:
    columns = ", ".join(data)
    placeholders = ", ".join(["?"] * len(data))
    query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    if db.backend == "postgres":
        cursor = db.execute(f"{query} RETURNING id", tuple(data.values()))
        row = cursor.fetchone()
        return int(row["id"])
    cursor = db.execute(query, tuple(data.values()))
    return int(cursor.lastrowid)


def init_db() -> None:
    with get_connection() as db:
        db.executescript(POSTGRES_SCHEMA if db.backend == "postgres" else SQLITE_SCHEMA)
        ensure_columns(
            db,
            "engineers",
            {
                "employee_code": "TEXT DEFAULT ''",
                "username": "TEXT DEFAULT ''",
                "password": "TEXT DEFAULT ''",
                "role": "TEXT DEFAULT 'viewer'",
                "permissions": "TEXT DEFAULT ''",
                "job_title": "TEXT DEFAULT ''",
                "department": "TEXT DEFAULT ''",
                "work_location": "TEXT DEFAULT ''",
                "supervisor": "TEXT DEFAULT ''",
            },
        )
        ensure_columns(
            db,
            "equipment",
            {
                "parent_id": "INTEGER",
                "asset_type": "TEXT DEFAULT 'Equipment'",
                "asset_level": "TEXT DEFAULT 'Equipment'",
                "asset_code": "TEXT DEFAULT ''",
                "criticality": "TEXT DEFAULT 'Medium'",
            },
        )
        ensure_columns(
            db,
            "auth_tokens",
            {
                "jti": "TEXT DEFAULT ''",
                "username": "TEXT DEFAULT ''",
                "token_type": "TEXT DEFAULT ''",
                "expires_at": "TEXT DEFAULT ''",
                "revoked_at": "TEXT DEFAULT ''",
            },
        )
        ensure_columns(
            db,
            "audit_logs",
            {
                "timestamp": "TEXT DEFAULT ''",
                "user_id": "TEXT DEFAULT ''",
                "user_name": "TEXT DEFAULT ''",
                "role": "TEXT DEFAULT ''",
                "action": "TEXT DEFAULT ''",
                "module": "TEXT DEFAULT ''",
                "record_id": "TEXT DEFAULT ''",
                "description": "TEXT DEFAULT ''",
                "old_values": "TEXT DEFAULT ''",
                "new_values": "TEXT DEFAULT ''",
                "ip_address": "TEXT DEFAULT ''",
                "device_info": "TEXT DEFAULT ''",
                "status": "TEXT DEFAULT 'SUCCESS'",
            },
        )
        seed_data(db)
        ensure_super_admin(db)
        migrate_plaintext_passwords(db)


def ensure_columns(db: DatabaseConnection, table: str, columns: dict[str, str]) -> None:
    if db.backend == "postgres":
        existing_rows = db.execute(
            """
            SELECT column_name AS name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table,),
        ).fetchall()
        existing = {row["name"] for row in existing_rows}
    else:
        existing = {row["name"] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}

    for name, definition in columns.items():
        if name not in existing:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def seed_data(db: DatabaseConnection) -> None:
    seed_job_titles(db)
    customer_count = db.execute("SELECT COUNT(*) AS total FROM customers").fetchone()["total"]
    if customer_count:
        return

    db.execute(
        "INSERT INTO customers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)",
        ("Gabal Elasfar Power Plant", "Operations Manager", "ops@gabal-plant.local", "+20 000 0000", "Cairo, Egypt"),
    )
    db.execute(
        """
        INSERT INTO engineers (
            employee_code, name, email, phone, specialty, job_title, department,
            work_location, supervisor, username, password, role, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "EMP-0001",
            "Ebrahim Mohamed",
            "ebrahim@ecs.local",
            "+20 111 0000",
            "Power Plant Maintenance",
            "Shift Engineer",
            "Maintenance",
            "Gabal Elasfar Power Plant",
            "Maintenance Manager",
            "",
            "",
            "engineer",
            "active",
        ),
    )
    db.execute(
        """
        INSERT INTO equipment (
            customer_id, name, serial_number, model, location,
            maintenance_interval_hours, maintenance_interval_days, current_hours,
            last_maintenance_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (1, "M01 Generator", "1655893-BF80", "Gas Engine Unit", "Gabal Elasfar M01", 1000, 90, 4427, "2026-04-01", "operational"),
    )
    db.execute(
        """
        INSERT INTO work_orders (
            title, description, customer_id, equipment_id, engineer_id,
            scheduled_date, due_date, status, priority, service_hours, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "Oil service inspection",
            "Inspect oil level, filters, and operating readings.",
            1,
            1,
            1,
            "2026-05-06",
            "2026-05-07",
            "pending",
            "high",
            4427,
            "Initial seeded work order.",
        ),
    )


def ensure_super_admin(db: DatabaseConnection) -> None:
    if not admin_credentials_configured():
        return
    username = admin_username()
    password = admin_password()
    email = admin_email()
    existing = db.execute("SELECT * FROM engineers WHERE username = ? COLLATE NOCASE", (username,)).fetchone()
    if existing:
        row = dict(existing)
        stored_password = row.get("password") or password
        next_password = hash_password(password) if password else (stored_password if is_password_hash(stored_password) else hash_password(stored_password))
        db.execute(
            """
            UPDATE engineers
            SET name = ?, email = ?, job_title = ?, department = ?, role = ?, status = ?, password = ?
            WHERE id = ?
            """,
            ("System Administrator", email, "Super Admin", "Administration", "admin", "active", next_password, row["id"]),
        )
        return

    db.execute(
        """
        INSERT INTO engineers (
            employee_code, name, email, phone, specialty, job_title, department,
            work_location, supervisor, username, password, role, permissions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "ADMIN-0001",
            "System Administrator",
            email,
            "",
            "Administration",
            "Super Admin",
            "Administration",
            "Available for All Sites",
            "",
            username,
            hash_password(password),
            "admin",
            "",
            "active",
        ),
    )


def migrate_plaintext_passwords(db: DatabaseConnection) -> None:
    rows = db.execute("SELECT id, password FROM engineers WHERE password IS NOT NULL AND password != ''").fetchall()
    for row in rows:
        item = dict(row)
        password = item.get("password", "")
        if password and not is_password_hash(password):
            db.execute("UPDATE engineers SET password = ? WHERE id = ?", (hash_password(password), item["id"]))


def seed_job_titles(db: DatabaseConnection) -> None:
    titles = [
        "Shift Engineer",
        "Maintenance Engineer",
        "Electrical Engineer",
        "Mechanical Engineer",
        "Senior Electrical Technician",
        "Electrical Technician",
        "Mechanical Technician",
        "Maintenance Supervisor",
        "Technician",
        "Viewer",
    ]
    for title in titles:
        if db.backend == "postgres":
            db.execute("INSERT INTO job_titles (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (title,))
        else:
            db.execute("INSERT OR IGNORE INTO job_titles (name) VALUES (?)", (title,))
