from __future__ import annotations

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "maintenance.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with get_connection() as db:
        db.executescript(
            """
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
            """
        )
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
        seed_data(db)


def ensure_columns(db: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    existing = {row["name"] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}
    for name, definition in columns.items():
        if name not in existing:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def seed_data(db: sqlite3.Connection) -> None:
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
            "ebrahim",
            "123456",
            "technician",
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


def seed_job_titles(db: sqlite3.Connection) -> None:
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
        db.execute("INSERT OR IGNORE INTO job_titles (name) VALUES (?)", (title,))
