from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from typing import Any

from ..core.audit import AuditService
from ..core.auth import CurrentUser, has_permission, public_role
from ..core.config import smtp_from_email, smtp_host, smtp_password, smtp_port, smtp_use_tls, smtp_username
from ..database import get_connection

LOW_STOCK_STATUSES = {"LOW STOCK", "OUT OF STOCK"}
INVENTORY_EMAIL_PERMISSION = "inventory:email_alerts"

logger = logging.getLogger(__name__)


class InventoryEmailAlertService:
    def notify_if_threshold_crossed(
        self,
        current_item: dict[str, Any],
        previous_item: dict[str, Any] | None = None,
        *,
        source: str = "Inventory",
    ) -> None:
        current_status = stock_alert_status(current_item)
        previous_status = stock_alert_status(previous_item or {})
        if current_status not in LOW_STOCK_STATUSES or current_status == previous_status:
            return

        recipients = self.recipients()
        if not recipients:
            self._audit(current_item, current_status, [], "SKIPPED", "No authorized email recipients configured")
            return

        if not smtp_host():
            self._audit(current_item, current_status, recipients, "SKIPPED", "SMTP_HOST is not configured")
            return

        subject = f"CMMS Inventory Alert: {current_item.get('name', 'Spare Part')} is {current_status}"
        body = self._message_body(current_item, current_status, source)
        try:
            self._send(recipients, subject, body)
        except Exception as exc:  # pragma: no cover - depends on external SMTP.
            logger.exception("Failed to send inventory low-stock email alert")
            self._audit(current_item, current_status, recipients, "FAILED", str(exc))
            return

        self._audit(current_item, current_status, recipients, "SUCCESS", "Inventory low-stock email alert sent")

    def recipients(self) -> list[str]:
        rows = []
        with get_connection() as db:
            rows = db.execute(
                """
                SELECT id, username, name, email, role, permissions, work_location
                FROM engineers
                WHERE status = ? AND email IS NOT NULL AND trim(email) != ''
                """,
                ("active",),
            ).fetchall()

        emails: list[str] = []
        seen: set[str] = set()
        for row in rows:
            item = dict(row)
            user = CurrentUser(
                id=int(item["id"]),
                username=item.get("username") or item.get("email") or "",
                name=item.get("name") or "",
                role=public_role(item.get("role")),
                permissions=item.get("permissions") or "",
                token_jti="inventory-email-alert",
                work_location=item.get("work_location") or "",
            )
            email = str(item.get("email") or "").strip()
            key = email.lower()
            if email and key not in seen and has_permission(user, INVENTORY_EMAIL_PERMISSION):
                emails.append(email)
                seen.add(key)
        return emails

    def _send(self, recipients: list[str], subject: str, body: str) -> None:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = smtp_from_email()
        message["To"] = ", ".join(recipients)
        message.set_content(body)

        with smtplib.SMTP(smtp_host(), smtp_port(), timeout=15) as smtp:
            if smtp_use_tls():
                smtp.starttls()
            username = smtp_username()
            password = smtp_password()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)

    def _message_body(self, item: dict[str, Any], status: str, source: str) -> str:
        quantity = int(item.get("stock_quantity") or 0)
        minimum = int(item.get("minimum_quantity") or 0)
        return "\n".join(
            [
                "CMMS inventory threshold alert",
                "",
                f"Part: {item.get('name') or '-'}",
                f"Part Number: {item.get('part_number') or '-'}",
                f"Status: {status}",
                f"Current Quantity: {quantity} {item.get('unit') or ''}".strip(),
                f"Minimum Quantity: {minimum}",
                f"Location: {item.get('location') or '-'}",
                f"Source: {source}",
                "",
                "Please review stock availability and purchase requirements.",
            ]
        )

    def _audit(self, item: dict[str, Any], status: str, recipients: list[str], result: str, description: str) -> None:
        AuditService.log_event(
            action="NOTIFY",
            module="Inventory",
            record_id=item.get("id", ""),
            description=f"{description}: {item.get('name') or 'Inventory item'}",
            new_values={
                "stock_alert": status,
                "stock_quantity": item.get("stock_quantity"),
                "minimum_quantity": item.get("minimum_quantity"),
                "recipient_count": len(recipients),
            },
            status=result,
        )


def stock_alert_status(item: dict[str, Any]) -> str:
    quantity = int(item.get("stock_quantity") or 0)
    minimum = int(item.get("minimum_quantity") or 0)
    if quantity <= 0:
        return "OUT OF STOCK"
    if quantity <= minimum:
        return "LOW STOCK"
    return "OK"
