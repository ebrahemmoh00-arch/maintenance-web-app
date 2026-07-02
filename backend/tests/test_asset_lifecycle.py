from __future__ import annotations

import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.pop("DATABASE_URL", None)

from app import database  # noqa: E402
from app.schemas import AssetMeasurementCreate, EquipmentCreate, WorkOrderCreate, WorkOrderLifecycleAction  # noqa: E402
from app.services import AssetLifecycleService, EquipmentService, WorkOrderService  # noqa: E402


class AssetLifecycleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp(prefix="cmms-asset-lifecycle-test-"))
        database.DB_BACKEND = "sqlite"
        database.DATABASE_URL = ""
        database.DB_PATH = self.temp_dir / "maintenance.db"
        database.init_db()
        self.assets = EquipmentService()
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


if __name__ == "__main__":
    unittest.main()
