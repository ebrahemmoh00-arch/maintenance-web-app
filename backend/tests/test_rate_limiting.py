from __future__ import annotations

import asyncio
import os
import sys
import unittest
from pathlib import Path

from fastapi.responses import JSONResponse
from starlette.requests import Request


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.middleware.rate_limiting import rate_limit_api_routes, reset_rate_limit_state  # noqa: E402


RATE_LIMIT_ENV_KEYS = {
    "RATE_LIMIT_ENABLED",
    "RATE_LIMIT_TRUST_PROXY_HEADERS",
    "RATE_LIMIT_WINDOW_SECONDS",
    "RATE_LIMIT_LOGIN_PER_MINUTE",
    "RATE_LIMIT_REFRESH_TOKEN_PER_MINUTE",
    "RATE_LIMIT_API_PER_MINUTE",
    "RATE_LIMIT_HEAVY_PER_MINUTE",
    "RATE_LIMIT_EXPORT_PER_MINUTE",
    "RATE_LIMIT_HEAVY_PATHS",
    "RATE_LIMIT_EXPORT_PATHS",
}


def build_request(path: str, *, method: str = "GET", headers: dict[str, str] | None = None) -> Request:
    encoded_headers = [(key.lower().encode("latin-1"), value.encode("latin-1")) for key, value in (headers or {}).items()]
    scope = {
        "type": "http",
        "method": method,
        "path": path,
        "root_path": "",
        "scheme": "http",
        "query_string": b"",
        "headers": encoded_headers,
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }
    return Request(scope)


async def successful_response(_request: Request):
    return JSONResponse({"ok": True})


def run_request(path: str, *, method: str = "GET", headers: dict[str, str] | None = None):
    return asyncio.run(rate_limit_api_routes(build_request(path, method=method, headers=headers), successful_response))


class RateLimitingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.previous_env = {key: os.environ.get(key) for key in RATE_LIMIT_ENV_KEYS}
        os.environ.update(
            {
                "RATE_LIMIT_ENABLED": "true",
                "RATE_LIMIT_TRUST_PROXY_HEADERS": "true",
                "RATE_LIMIT_WINDOW_SECONDS": "60",
                "RATE_LIMIT_LOGIN_PER_MINUTE": "2",
                "RATE_LIMIT_REFRESH_TOKEN_PER_MINUTE": "3",
                "RATE_LIMIT_API_PER_MINUTE": "2",
                "RATE_LIMIT_HEAVY_PER_MINUTE": "1",
                "RATE_LIMIT_EXPORT_PER_MINUTE": "1",
            }
        )
        reset_rate_limit_state()

    def tearDown(self) -> None:
        reset_rate_limit_state()
        for key, value in self.previous_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_login_rate_limit_returns_429_with_retry_after(self) -> None:
        headers = {"X-Forwarded-For": "203.0.113.10"}

        self.assertEqual(run_request("/api/login", method="POST", headers=headers).status_code, 200)
        self.assertEqual(run_request("/api/login", method="POST", headers=headers).status_code, 200)

        response = run_request("/api/login", method="POST", headers=headers)

        self.assertEqual(response.status_code, 429)
        self.assertIn(b"Rate limit exceeded", response.body)
        self.assertIn("Retry-After", response.headers)

    def test_reverse_proxy_client_ip_keeps_limits_per_origin_ip(self) -> None:
        first_ip = {"X-Forwarded-For": "203.0.113.11"}
        second_ip = {"X-Forwarded-For": "203.0.113.12"}

        self.assertEqual(run_request("/api/customers", headers=first_ip).status_code, 200)
        self.assertEqual(run_request("/api/customers", headers=first_ip).status_code, 200)
        self.assertEqual(run_request("/api/customers", headers=first_ip).status_code, 429)
        self.assertEqual(run_request("/api/customers", headers=second_ip).status_code, 200)

    def test_swagger_documentation_is_not_rate_limited(self) -> None:
        for _ in range(5):
            response = run_request("/docs", headers={"X-Forwarded-For": "203.0.113.13"})
            self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
