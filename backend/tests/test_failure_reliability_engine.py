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
from app.schemas import FailureEventCreate, WorkOrderCreate, WorkOrderLifecycleAction  # noqa: E402
from app.services import DowntimeService, FailureManagementService, ReliabilityService, WorkOrderService  # noqa: E402


class FailureReliabilityEngineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp(prefix="cmms-failure-test-"))
        database.DB_BACKEND = "sqlite"
        database.DATABASE_URL = ""
        database.DB_PATH = self.temp_dir / "maintenance.db"
        database.init_db()
        self.failures = FailureManagementService()
        self.downtime = DowntimeService()
        self.reliability = ReliabilityService()
        self.work_orders = WorkOrderService()

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_failure_creation_calculates_downtime_and_reliability(self) -> None:
        failure = self.failures.create(
            FailureEventCreate(
                asset_id=1,
                failure_start="2026-07-02T08:00:00",
                failure_end="2026-07-02T10:30:00",
                detection_method="Operator Report",
                failure_type="Breakdown",
                failure_category="Mechanical",
                severity="critical",
                operational_impact="Unit stopped",
                breakdown_indicator=True,
                emergency_indicator=True,
                failure_description="Unexpected generator shutdown",
            )
        )

        downtime_rows = self.downtime.list_asset_downtime(1)
        stats = self.reliability.asset_statistics(1)
        dashboard = self.reliability.dashboard()

        self.assertEqual(failure["asset_id"], 1)
        self.assertEqual(downtime_rows[0]["total_downtime_minutes"], 150)
        self.assertEqual(stats["failure_frequency"], 1)
        self.assertGreater(stats["total_downtime_hours"], 0)
        self.assertEqual(dashboard["failureCount"], 1)

    def test_failure_end_before_start_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self.failures.create(
                FailureEventCreate(
                    asset_id=1,
                    failure_start="2026-07-02T10:00:00",
                    failure_end="2026-07-02T09:00:00",
                    failure_description="Invalid downtime",
                )
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Failure end", context.exception.detail)

    def test_closing_critical_work_order_generates_failure_and_downtime(self) -> None:
        order = self.work_orders.create(
            WorkOrderCreate(
                title="Critical breakdown repair",
                description="Unexpected stop and repair",
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
                runtime_reading=4500,
                completion_notes="Breakdown repaired",
                checklist_completed=True,
            ),
        )
        order = self.work_orders.approve(order["id"], WorkOrderLifecycleAction(actor_id=1, supervisor_notes="Approved"))
        self.work_orders.close(order["id"], WorkOrderLifecycleAction(actor_id=1))

        failures = self.failures.list_asset_failures(1)
        downtime_rows = self.downtime.list_asset_downtime(1)

        self.assertTrue(any(item["linked_work_order_id"] == order["id"] for item in failures))
        self.assertTrue(any(item["linked_work_order_id"] == order["id"] for item in downtime_rows))


if __name__ == "__main__":
    unittest.main()
