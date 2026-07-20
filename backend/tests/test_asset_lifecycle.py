from __future__ import annotations

import os
import shutil
import sys
import tempfile
import unittest
import json
from pathlib import Path

from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.pop("DATABASE_URL", None)

from app import database  # noqa: E402
from app.core.auth import CurrentUser, has_permission  # noqa: E402
from app.schemas import AssetMeasurementCreate, EquipmentCreate, WorkOrderCreate, WorkOrderLifecycleAction  # noqa: E402
from app.services import AssetHistoryService, AssetLifecycleService, EquipmentService, WorkOrderService  # noqa: E402
from app.services.inventory_email_alerts import InventoryEmailAlertService, stock_alert_status  # noqa: E402


class AssetLifecycleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp(prefix="cmms-asset-lifecycle-test-"))
        database.DB_BACKEND = "sqlite"
        database.DATABASE_URL = ""
        database.DB_PATH = self.temp_dir / "maintenance.db"
        database.init_db()
        self.assets = EquipmentService()
        self.asset_history = AssetHistoryService()
        self.lifecycle = AssetLifecycleService()
        self.work_orders = WorkOrderService()

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_asset_creation_records_history_and_prevents_duplicate_code(self) -> None:
        created = self.assets.create(
            EquipmentCreate(
                customer_id=1,
                name="Test Site",
                asset_type="Site",
                asset_level="Site",
                asset_code="PLT-TEST-001",
                criticality="High",
            )
        )

        history = self.lifecycle.history(created["id"])
        self.assertTrue(any(entry["event_type"] == "Asset Created" for entry in history))

        with self.assertRaises(HTTPException) as context:
            self.assets.create(
                EquipmentCreate(
                    customer_id=1,
                    name="Duplicate Test Site",
                    asset_type="Site",
                    asset_level="Site",
                    asset_code="PLT-TEST-001",
                )
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Asset code already exists", context.exception.detail)

    def test_measurement_updates_runtime_and_health(self) -> None:
        measurement = self.lifecycle.add_measurement(
            1,
            AssetMeasurementCreate(
                measurement_type="Runtime Hours",
                value=5100,
                unit="hrs",
                reading_date="2026-07-02",
                notes="Manual runtime update",
            ),
        )

        updated_asset = self.assets.get(1)
        health = self.lifecycle.health(1)
        history = self.lifecycle.history(1)

        self.assertEqual(measurement["value"], 5100)
        self.assertEqual(updated_asset["current_hours"], 5100)
        self.assertGreaterEqual(health["health_score"], 0)
        self.assertTrue(any(entry["event_type"] == "Measurement" for entry in history))

    def test_closed_work_order_updates_asset_history_and_breakdown_event(self) -> None:
        order = self.work_orders.create(
            WorkOrderCreate(
                title="Generator breakdown repair",
                description="Critical failure repair",
                customer_id=1,
                equipment_id=1,
                engineer_id=1,
                scheduled_date="2026-07-02",
                status="new",
                priority="critical",
                service_hours=4427,
            )
        )

        order = self.work_orders.assign(order["id"], WorkOrderLifecycleAction(engineer_id=1, actor_id=1))
        order = self.work_orders.accept(order["id"], WorkOrderLifecycleAction(actor_id=1))
        order = self.work_orders.start(order["id"], WorkOrderLifecycleAction(actor_id=1, runtime_reading=4427))
        order = self.work_orders.complete(
            order["id"],
            WorkOrderLifecycleAction(
                actor_id=1,
                runtime_reading=4600,
                completion_notes="Breakdown repaired and tested",
                checklist_completed=True,
            ),
        )
        order = self.work_orders.approve(order["id"], WorkOrderLifecycleAction(actor_id=1, supervisor_notes="Approved"))
        closed = self.work_orders.close(order["id"], WorkOrderLifecycleAction(actor_id=1))

        history = self.lifecycle.history(1)
        events = self.lifecycle.events(1)
        measurements = self.lifecycle.measurements(1)

        self.assertEqual(closed["status"], "closed")
        self.assertTrue(any(entry["source_module"] == "Work Orders" and str(entry["source_record_id"]) == str(order["id"]) for entry in history))
        self.assertTrue(any(event["event_type"] == "Breakdown" for event in events))
        self.assertTrue(any(item["measurement_type"] == "Runtime Hours" and item["value"] == 4600 for item in measurements))

    def test_enterprise_asset_history_supports_pagination_and_filtering(self) -> None:
        order = self.work_orders.create(
            WorkOrderCreate(
                title="Enterprise history inspection",
                description="Inspection work order for asset history",
                customer_id=1,
                equipment_id=1,
                engineer_id=1,
                scheduled_date="2026-07-04",
                status="new",
                priority="medium",
                service_hours=4427,
            )
        )

        result = self.asset_history.history(1, page=1, page_size=5, event_type="Work Order Created")
        self.assertEqual(result["page"], 1)
        self.assertLessEqual(len(result["items"]), 5)
        self.assertTrue(any(item["work_order_id"] == order["id"] for item in result["items"]))

        searched = self.asset_history.history(1, page=1, page_size=25, search="inspection")
        self.assertGreaterEqual(searched["total"], 1)
        self.assertTrue(all("items" in searched and isinstance(searched["items"], list) for _ in [searched]))

    def test_asset_history_permission_alias_and_legacy_full_access(self) -> None:
        limited = CurrentUser(
            id=10,
            username="limited",
            name="Limited",
            role="store_keeper",
            permissions="{}",
            token_jti="test",
        )
        explicit = CurrentUser(
            id=11,
            username="explicit",
            name="Explicit",
            role="store_keeper",
            permissions="asset_history:view",
            token_jti="test",
        )
        full_permissions = {
            "customers": {"view": True, "add": True, "edit": True, "delete": True},
            "equipment": {"view": True, "add": True, "edit": True, "delete": True},
            "engineers": {"view": True, "add": True, "edit": True, "delete": True},
            "work-orders": {"view": True, "add": True, "edit": True, "delete": True},
            "preventive-maintenance": {"view": True, "add": True, "edit": True, "delete": True},
            "inventory": {"view": True, "add": True, "edit": True, "delete": True},
            "reports": {"view": True, "add": True, "edit": True, "delete": True},
            "settings": {"view": True, "add": True, "edit": True, "delete": True},
        }
        legacy_full_admin = CurrentUser(
            id=12,
            username="legacy-full",
            name="Legacy Full",
            role="store_keeper",
            permissions=json.dumps(full_permissions),
            token_jti="test",
        )

        self.assertFalse(has_permission(limited, "asset_history:view"))
        self.assertTrue(has_permission(explicit, "asset_history:read"))
        self.assertTrue(has_permission(legacy_full_admin, "asset_history:view"))

    def test_inventory_email_alert_permission_controls_recipients(self) -> None:
        with database.get_connection() as db:
            db.execute(
                """
                INSERT INTO engineers (name, email, username, role, permissions, status)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    "Inventory Receiver",
                    "stock-alert@example.com",
                    "stock-alert",
                    "store_keeper",
                    json.dumps({"inventory": {"view": True, "email_alerts": True}}),
                    "active",
                ),
            )
            db.execute(
                """
                INSERT INTO engineers (name, email, username, role, permissions, status)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    "Inventory Viewer",
                    "viewer@example.com",
                    "viewer",
                    "viewer",
                    json.dumps({"inventory": {"view": True}}),
                    "active",
                ),
            )
            db.commit()

        recipients = InventoryEmailAlertService().recipients()
        explicit_user = CurrentUser(
            id=20,
            username="stock-alert",
            name="Inventory Receiver",
            role="store_keeper",
            permissions=json.dumps({"inventory": {"view": True, "email_alerts": True}}),
            token_jti="test",
        )

        self.assertEqual(stock_alert_status({"stock_quantity": 1, "minimum_quantity": 5}), "LOW STOCK")
        self.assertTrue(has_permission(explicit_user, "inventory:email_alerts"))
        self.assertIn("stock-alert@example.com", recipients)
        self.assertNotIn("viewer@example.com", recipients)


if __name__ == "__main__":
    unittest.main()
