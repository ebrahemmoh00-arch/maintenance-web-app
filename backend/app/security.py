from __future__ import annotations

import bcrypt


def is_password_hash(value: str | None) -> bool:
    if not value:
        return False
    return value.startswith("$2a$") or value.startswith("$2b$") or value.startswith("$2y$")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, stored_password: str | None) -> bool:
    if not password or not stored_password:
        return False
    if is_password_hash(stored_password):
        return bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8"))
    return password == stored_password
