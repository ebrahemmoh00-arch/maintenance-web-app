from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TABLES = [
    "customers",
    "engineers",
    "job_titles",
    "equipment",
    "work_orders",
    "inventory_items",
    "preventive_maintenance",
    "preventive_maintenance_history",
]


def sqlite_rows(sqlite_path: Path, table: str) -> list[dict[str, Any]]:
    with sqlite3.connect(sqlite_path) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute(f"SELECT * FROM {table} ORDER BY id ASC").fetchall()
        return [dict(row) for row in rows]


def init_postgres_schema(postgres_url: str) -> None:
    os.environ["DATABASE_URL"] = postgres_url
    from app.database import init_db

    init_db()


def upsert_rows(pg, table: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        print(f"{table}: no rows")
        return
    columns = list(rows[0].keys())
    column_sql = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    update_columns = [column for column in columns if column != "id"]
    updates = ", ".join([f"{column} = EXCLUDED.{column}" for column in update_columns])
    query = f"""
        INSERT INTO {table} ({column_sql})
        VALUES ({placeholders})
        ON CONFLICT (id) DO UPDATE SET {updates}
    """
    for row in rows:
        pg.execute(query, tuple(row[column] for column in columns))
    print(f"{table}: migrated {len(rows)} rows")


def reset_sequence(pg, table: str) -> None:
    pg.execute(
        """
        SELECT setval(
            pg_get_serial_sequence(%s, 'id'),
            COALESCE((SELECT MAX(id) FROM """ + table + """), 1),
            true
        )
        """,
        (table,),
    )


def truncate_tables(pg) -> None:
    ordered = ", ".join(reversed(TABLES))
    pg.execute(f"TRUNCATE TABLE {ordered} RESTART IDENTITY CASCADE")


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate local SQLite CMMS data into PostgreSQL.")
    parser.add_argument("--sqlite", default=str(BACKEND_DIR / "maintenance.db"), help="Path to local SQLite database.")
    parser.add_argument("--postgres-url", default=os.getenv("POSTGRES_DATABASE_URL") or os.getenv("DATABASE_URL"), help="PostgreSQL external database URL.")
    parser.add_argument("--replace", action="store_true", help="Delete current PostgreSQL data before importing local SQLite data.")
    parser.add_argument("--dry-run", action="store_true", help="Only print row counts; do not write to PostgreSQL.")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite)
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite database was not found: {sqlite_path}")
    if not args.postgres_url:
        raise SystemExit("Set POSTGRES_DATABASE_URL or pass --postgres-url with the Render External Database URL.")

    table_rows = {table: sqlite_rows(sqlite_path, table) for table in TABLES}
    print(f"SQLite source: {sqlite_path}")
    for table, rows in table_rows.items():
        print(f"{table}: {len(rows)} rows")

    if args.dry_run:
        print("Dry run complete. No PostgreSQL data was changed.")
        return 0

    init_postgres_schema(args.postgres_url)
    with psycopg.connect(args.postgres_url, row_factory=dict_row) as pg:
        if args.replace:
            truncate_tables(pg)
        for table in TABLES:
            upsert_rows(pg, table, table_rows[table])
        for table in TABLES:
            reset_sequence(pg, table)
        pg.commit()

    print("Migration complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
