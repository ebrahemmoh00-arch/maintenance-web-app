from __future__ import annotations

import os
import shutil
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.pop("DATABASE_URL", None)

from app import database  # noqa: E402
from app.schemas import PMPlanCreate, WorkOrderLifecycleAction  # noqa: E402
from app.services import PMPlanService, WorkOrderService  # noqa: E402


class PMPlanEngineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp(prefix="cmms-pm-plan-test-"))
        database.DB_BACKEND = "sqlite"
        database.DATABASE_URL = ""
        database.DB_PATH = self.temp_dir / "maintenance.db"
        database.init_db()
        self.pm_plans = PMPlanService()
        self.work_orders = WorkOrderService()

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_scheduler_generates_one_runtime_work_order_and_prevents_duplicate_cycle(self) -> None:
        plan = self.pm_plans.create(
            PMPlanCreate(
                equipment_id=1,
                name="M01 1000h Service",
                priority="high",
                recurrence_type="Runtime Hours",
                interval_value=1000,
                start_date="2026-07-02",
                next_due_runtime=4400,
                estimated_duration_minutes=120,
                required_skills="Mechanical, Electrical",
                checklist_template="Inspect filters\nCheck oil level",
                planned_spare_parts="Oil filter",
                status="active",
            )
        )

        first_run = self.pm_plans.run_scheduler()
        second_run = self.pm_plans.run_scheduler()

        self.assertEqual(first_run["generated"], 1)
        self.assertEqual(second_run["generated"], 0)
        self.assertEqual(second_run["skipped"], 1)
        self.assertEqual(len(first_run["work_order_ids"]), 1)

        generated_order = self.work_orders.get(first_run["work_order_ids"][0])
        self.assertIn("PM:", generated_order["title"])
        self.assertEqual(generated_order["equipment_id"], plan["equipment_id"])

    def test_completed_generated_work_order_updates_next_runtime_due(self) -> None:
        self.pm_plans.create(
            PMPlanCreate(
                equipment_id=1,
                name="M01 Runtime PM",
                recurrence_type="Runtime Hours",
                interval_value=1000,
                start_date="2026-07-02",
                next_due_runtime=4400,
            )
        )
        run_result = self.pm_plans.run_scheduler()
        work_order_id = run_result["work_order_ids"][0]

        self.work_orders.assign(work_order_id, WorkOrderLifecycleAction(engineer_id=1, actor_id=1))
        self.work_orders.accept(work_order_id, WorkOrderLifecycleAction(actor_id=1))
        self.work_orders.start(work_order_id, WorkOrderLifecycleAction(actor_id=1, runtime_reading=4427))
        self.work_orders.complete(
            work_order_id,
            WorkOrderLifecycleAction(
                actor_id=1,
                runtime_reading=4500,
                completion_notes="Runtime PM completed",
                checklist_completed=True,
            ),
        )

        plan = self.pm_plans.list()[0]
        self.assertEqual(plan["last_runtime"], 4500)
        self.assertEqual(plan["next_due_runtime"], 5500)
        self.assertEqual(plan["last_service_date"], date.today().isoformat())


if __name__ == "__main__":
    unittest.main()
