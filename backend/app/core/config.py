from __future__ import annotations

import os
import secrets
from functools import lru_cache
from pathlib import Path

REQUIRED_PRODUCTION_ENV = ("ADMIN_USERNAME", "ADMIN_PASSWORD", "JWT_SECRET_KEY")
DEVELOPMENT_JWT_SECRET = secrets.token_urlsafe(48)


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _load_env_file(path: Path) -> None:
    if not path.exists() or not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = _strip_quotes(value)


def load_development_environment() -> None:
    backend_dir = Path(__file__).resolve().parents[2]
    project_dir = backend_dir.parent
    _load_env_file(project_dir / ".env")
    _load_env_file(backend_dir / ".env")


load_development_environment()


def app_environment() -> str:
    return (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or ("production" if os.getenv("RENDER") else "development")).strip().lower()


def is_production() -> bool:
    return app_environment() in {"prod", "production"}


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}. Set it before starting the CMMS backend.")
    return value


def validate_startup_configuration() -> None:
    if not is_production():
        return
    missing = [name for name in REQUIRED_PRODUCTION_ENV if not os.getenv(name, "").strip()]
    if missing:
        names = ", ".join(missing)
        raise RuntimeError(f"Production configuration error. Missing required environment variable(s): {names}.")


@lru_cache(maxsize=1)
def jwt_secret_key() -> str:
    if is_production():
        validate_startup_configuration()
        return require_env("JWT_SECRET_KEY")
    return os.getenv("JWT_SECRET_KEY", "").strip() or DEVELOPMENT_JWT_SECRET


def admin_credentials_configured() -> bool:
    return bool(os.getenv("ADMIN_USERNAME", "").strip() and os.getenv("ADMIN_PASSWORD", ""))


def admin_username() -> str:
    return os.getenv("ADMIN_USERNAME", "").strip()


def admin_password() -> str:
    return os.getenv("ADMIN_PASSWORD", "")


def admin_email() -> str:
    return os.getenv("ADMIN_EMAIL", "admin@ecs.local").strip() or "admin@ecs.local"


def database_url() -> str:
    return os.getenv("DATABASE_URL", "").strip()
