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
from app.schemas import WorkOrderCreate, WorkOrderLifecycleAction  # noqa: E402
from app.services import WorkOrderService  # noqa: E402


class WorkOrderLifecycleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp(prefix="cmms-work-order-test-"))
        database.DB_BACKEND = "sqlite"
        database.DATABASE_URL = ""
        database.DB_PATH = self.temp_dir / "maintenance.db"
        database.init_db()
        self.work_orders = WorkOrderService()

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def create_order(self):
        return self.work_orders.create(
            WorkOrderCreate(
                title="Lifecycle WO",
                description="Lifecycle validation",
                customer_id=1,
                equipment_id=1,
                engineer_id=1,
                scheduled_date="2026-07-02",
                status="new",
                priority="medium",
                service_hours=4427,
            )
        )

    def test_full_lifecycle_reaches_closed_with_timeline(self) -> None:
        order = self.create_order()

        order = self.work_orders.assign(order["id"], WorkOrderLifecycleAction(engineer_id=1, actor_id=1))
        self.assertEqual(order["status"], "assigned")

        order = self.work_orders.accept(order["id"], WorkOrderLifecycleAction(actor_id=1))
        self.assertEqual(order["status"], "accepted")

        order = self.work_orders.start(order["id"], WorkOrderLifecycleAction(actor_id=1, runtime_reading=4427))
        self.assertEqual(order["status"], "in_progress")

        order = self.work_orders.complete(
            order["id"],
            WorkOrderLifecycleAction(
                actor_id=1,
                runtime_reading=4500,
                completion_notes="Work completed",
                checklist_completed=True,
            ),
        )
        self.assertEqual(order["status"], "pending_supervisor_review")

        order = self.work_orders.approve(order["id"], WorkOrderLifecycleAction(actor_id=1, supervisor_notes="Approved"))
        self.assertEqual(order["status"], "approved")

        order = self.work_orders.close(order["id"], WorkOrderLifecycleAction(actor_id=1))
        self.assertEqual(order["status"], "closed")
        self.assertGreaterEqual(len(order["timeline"]), 8)

    def test_illegal_transition_is_rejected(self) -> None:
        order = self.create_order()
        with self.assertRaises(HTTPException) as context:
            self.work_orders.start(order["id"], WorkOrderLifecycleAction(actor_id=1))
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Illegal work order transition", context.exception.detail)

    def test_completion_requires_checklist_and_notes(self) -> None:
        order = self.create_order()
        order = self.work_orders.assign(order["id"], WorkOrderLifecycleAction(engineer_id=1, actor_id=1))
        order = self.work_orders.accept(order["id"], WorkOrderLifecycleAction(actor_id=1))
        order = self.work_orders.start(order["id"], WorkOrderLifecycleAction(actor_id=1, runtime_reading=4427))

        with self.assertRaises(HTTPException) as context:
            self.work_orders.complete(order["id"], WorkOrderLifecycleAction(actor_id=1, runtime_reading=4500))
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Checklist", context.exception.detail)


if __name__ == "__main__":
    unittest.main()
