from __future__ import annotations

import asyncio
import json
import logging
import sys
import unittest
from pathlib import Path

from fastapi.responses import JSONResponse
from starlette.requests import Request


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.structured_logging import (  # noqa: E402
    CORRELATION_ID_HEADER,
    JsonLogFormatter,
    bind_request_context,
    current_log_context,
    reset_request_context,
    sanitize_log_payload,
    update_log_context,
)
from app.middleware.request_logging import log_http_requests  # noqa: E402


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


def run_request(path: str, *, headers: dict[str, str] | None = None):
    return asyncio.run(log_http_requests(build_request(path, headers=headers), successful_response))


class StructuredLoggingTest(unittest.TestCase):
    def test_sensitive_values_are_masked_recursively(self) -> None:
        sanitized = sanitize_log_payload(
            {
                "username": "admin",
                "password": "plain-password",
                "nested": {
                    "access_token": "jwt-value",
                    "details": [{"refresh_token": "refresh-value"}],
                },
            }
        )

        self.assertEqual(sanitized["username"], "admin")
        self.assertEqual(sanitized["password"], "***")
        self.assertEqual(sanitized["nested"]["access_token"], "***")
        self.assertEqual(sanitized["nested"]["details"][0]["refresh_token"], "***")

    def test_json_formatter_includes_required_request_context(self) -> None:
        token = bind_request_context(correlation_id="test-correlation", request_path="/api/assets", http_method="GET")
        try:
            update_log_context(user_id=17, company_id="", status_code=200, execution_time_ms=12.4)
            record = logging.LogRecord("cmms.test", logging.INFO, __file__, 1, "request_completed", (), None)
            record.event = "request_completed"
            record.authorization = "Bearer secret-token"

            payload = json.loads(JsonLogFormatter().format(record))

            self.assertEqual(payload["correlation_id"], "test-correlation")
            self.assertEqual(payload["user_id"], 17)
            self.assertEqual(payload["company_id"], "")
            self.assertEqual(payload["request_path"], "/api/assets")
            self.assertEqual(payload["http_method"], "GET")
            self.assertEqual(payload["status_code"], 200)
            self.assertEqual(payload["execution_time_ms"], 12.4)
            self.assertEqual(payload["authorization"], "***")
        finally:
            reset_request_context(token)

    def test_request_logging_sets_response_correlation_id_and_resets_context(self) -> None:
        response = run_request("/api/work-orders", headers={CORRELATION_ID_HEADER: "client-correlation"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers[CORRELATION_ID_HEADER], "client-correlation")
        self.assertEqual(current_log_context()["correlation_id"], "")


if __name__ == "__main__":
    unittest.main()
