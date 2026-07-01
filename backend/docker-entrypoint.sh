#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
    python - <<'PY'
import os
import sys
import time

import psycopg

deadline = time.time() + int(os.getenv("POSTGRES_WAIT_TIMEOUT_SECONDS", "60"))
database_url = os.getenv("DATABASE_URL", "")

while True:
    try:
        with psycopg.connect(database_url, connect_timeout=3) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        print("PostgreSQL is ready.")
        break
    except Exception:
        if time.time() >= deadline:
            print("PostgreSQL was not ready before startup timeout.", file=sys.stderr)
            sys.exit(1)
        print("Waiting for PostgreSQL...")
        time.sleep(2)
PY
fi

exec "$@"
