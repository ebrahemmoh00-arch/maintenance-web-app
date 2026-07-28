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

from app.middleware.security_headers import secure_http_responses  # noqa: E402


SECURITY_ENV_KEYS = {
    "APP_ENV",
    "SECURITY_HEADERS_ENABLED",
    "SECURITY_CSP_MODE",
    "SECURITY_CSP_REPORT_ONLY",
    "SECURITY_FRAME_OPTIONS",
    "SECURITY_REFERRER_POLICY",
    "SECURITY_PERMISSIONS_POLICY",
    "SECURITY_HSTS_ENABLED",
    "SECURITY_HSTS_MAX_AGE",
    "SECURITY_HSTS_INCLUDE_SUBDOMAINS",
    "SECURITY_HSTS_PRELOAD",
    "SECURITY_CSP_DEVELOPMENT",
    "SECURITY_CSP_PRODUCTION",
    "SECURITY_CSP_SWAGGER",
}


def build_request(path: str) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": path,
        "root_path": "",
        "scheme": "https",
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 443),
    }
    return Request(scope)


async def successful_response(_request: Request):
    return JSONResponse({"ok": True})


def run_request(path: str):
    return asyncio.run(secure_http_responses(build_request(path), successful_response))


class SecurityHeadersTest(unittest.TestCase):
    def setUp(self) -> None:
        self.previous_env = {key: os.environ.get(key) for key in SECURITY_ENV_KEYS}
        for key in SECURITY_ENV_KEYS:
            os.environ.pop(key, None)
        os.environ["SECURITY_HEADERS_ENABLED"] = "true"

    def tearDown(self) -> None:
        for key, value in self.previous_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_development_headers_include_relaxed_csp_without_hsts(self) -> None:
        os.environ["APP_ENV"] = "development"

        response = run_request("/api/customers")

        self.assertIn("Content-Security-Policy", response.headers)
        self.assertIn("'unsafe-inline'", response.headers["Content-Security-Policy"])
        self.assertEqual(response.headers["X-Frame-Options"], "SAMEORIGIN")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["Referrer-Policy"], "strict-origin-when-cross-origin")
        self.assertIn("Permissions-Policy", response.headers)
        self.assertNotIn("Strict-Transport-Security", response.headers)

    def test_production_headers_include_hsts_and_strict_backend_csp(self) -> None:
        os.environ["APP_ENV"] = "production"

        response = run_request("/api/customers")

        self.assertIn("default-src 'none'", response.headers["Content-Security-Policy"])
        self.assertIn("Strict-Transport-Security", response.headers)
        self.assertIn("max-age=31536000", response.headers["Strict-Transport-Security"])

    def test_swagger_uses_documentation_safe_csp(self) -> None:
        os.environ["APP_ENV"] = "production"

        response = run_request("/docs")

        csp = response.headers["Content-Security-Policy"]
        self.assertIn("https://cdn.jsdelivr.net", csp)
        self.assertIn("'unsafe-inline'", csp)
        self.assertIn("frame-ancestors 'self'", csp)

    def test_headers_can_be_disabled(self) -> None:
        os.environ["APP_ENV"] = "production"
        os.environ["SECURITY_HEADERS_ENABLED"] = "false"

        response = run_request("/api/customers")

        self.assertNotIn("Content-Security-Policy", response.headers)
        self.assertNotIn("Strict-Transport-Security", response.headers)


if __name__ == "__main__":
    unittest.main()
