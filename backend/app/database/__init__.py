from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any

from ..core.config import admin_credentials_configured, admin_email, admin_password, admin_username, database_url
from ..core.security import hash_password, is_password_hash

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover - SQLite-only local installs can still run.
    psycopg = None
    dict_row = None

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "maintenance.db"
DATABASE_URL = database_url()
DB_BACKEND = "postgres" if DATABASE_URL else "sqlite"


SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS engineers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_code TEXT DEFAULT '',
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    specialty TEXT DEFAULT '',
    job_title TEXT DEFAULT '',
    department TEXT DEFAULT '',
    work_location TEXT DEFAULT '',
    supervisor TEXT DEFAULT '',
    username TEXT DEFAULT '',
    password TEXT DEFAULT '',
    role TEXT DEFAULT 'viewer',
    permissions TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    serial_number TEXT DEFAULT '',
    model TEXT DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    manufacturer TEXT DEFAULT '',
    location TEXT DEFAULT '',
    parent_id INTEGER,
    asset_type TEXT DEFAULT 'Equipment',
    asset_level TEXT DEFAULT 'Equipment',
    asset_code TEXT DEFAULT '',
    qr_code TEXT DEFAULT '',
    barcode TEXT DEFAULT '',
    criticality TEXT DEFAULT 'Medium',
    site TEXT DEFAULT '',
    department TEXT DEFAULT '',
    commission_date TEXT DEFAULT '',
    installation_date TEXT DEFAULT '',
    warranty_start TEXT DEFAULT '',
    warranty_end TEXT DEFAULT '',
    expected_life_years INTEGER DEFAULT 0,
    replacement_cost REAL DEFAULT 0,
    current_condition TEXT DEFAULT '',
    maintenance_interval_hours INTEGER DEFAULT 1000,
    maintenance_interval_days INTEGER DEFAULT 90,
    current_hours INTEGER DEFAULT 0,
    last_reading REAL DEFAULT 0,
    current_reading REAL DEFAULT 0,
    last_pm_date TEXT DEFAULT '',
    next_pm_date TEXT DEFAULT '',
    last_breakdown_date TEXT DEFAULT '',
    last_repair_date TEXT DEFAULT '',
    purchase_cost REAL DEFAULT 0,
    total_maintenance_cost REAL DEFAULT 0,
    spare_parts_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    contractor_cost REAL DEFAULT 0,
    last_maintenance_date TEXT DEFAULT '',
    status TEXT DEFAULT 'operational',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    source_module TEXT DEFAULT '',
    source_record_id TEXT DEFAULT '',
    actor_id INTEGER,
    metadata TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    status TEXT DEFAULT 'open',
    due_date TEXT DEFAULT '',
    description TEXT DEFAULT '',
    source_module TEXT DEFAULT '',
    source_record_id TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT DEFAULT '',
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    measurement_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT DEFAULT '',
    reading_date TEXT DEFAULT CURRENT_TIMESTAMP,
    source_module TEXT DEFAULT '',
    source_record_id TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    document_type TEXT DEFAULT 'Manual',
    title TEXT NOT NULL,
    file_name TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    uploaded_by_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(uploaded_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    photo_type TEXT DEFAULT 'Current Photo',
    title TEXT NOT NULL,
    file_name TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    uploaded_by_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(uploaded_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL UNIQUE,
    health_score INTEGER DEFAULT 100,
    health_status TEXT DEFAULT 'Excellent',
    availability REAL DEFAULT 100,
    mtbf REAL DEFAULT 0,
    mttr REAL DEFAULT 0,
    total_downtime_hours REAL DEFAULT 0,
    maintenance_cost REAL DEFAULT 0,
    pm_compliance REAL DEFAULT 100,
    failure_frequency INTEGER DEFAULT 0,
    open_work_orders INTEGER DEFAULT 0,
    completed_pm INTEGER DEFAULT 0,
    upcoming_pm INTEGER DEFAULT 0,
    calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '',
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS problem_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failure_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cause_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS remedy_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failure_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    failure_id TEXT NOT NULL UNIQUE,
    failure_datetime TEXT NOT NULL,
    failure_start TEXT NOT NULL,
    failure_end TEXT DEFAULT '',
    detection_method TEXT DEFAULT '',
    failure_type TEXT DEFAULT '',
    failure_category TEXT DEFAULT '',
    severity TEXT DEFAULT 'medium',
    operational_impact TEXT DEFAULT '',
    breakdown_indicator INTEGER DEFAULT 0,
    emergency_indicator INTEGER DEFAULT 0,
    failure_description TEXT DEFAULT '',
    problem_code_id INTEGER,
    failure_code_id INTEGER,
    cause_code_id INTEGER,
    remedy_code_id INTEGER,
    reported_by_id INTEGER,
    assigned_technician_id INTEGER,
    linked_work_order_id INTEGER,
    linked_pm_id INTEGER,
    status TEXT DEFAULT 'open',
    rca_status TEXT DEFAULT 'not_required',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(problem_code_id) REFERENCES problem_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(failure_code_id) REFERENCES failure_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(cause_code_id) REFERENCES cause_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(remedy_code_id) REFERENCES remedy_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(reported_by_id) REFERENCES engineers(id) ON DELETE SET NULL,
    FOREIGN KEY(assigned_technician_id) REFERENCES engineers(id) ON DELETE SET NULL,
    FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
    FOREIGN KEY(linked_pm_id) REFERENCES preventive_maintenance(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS downtime_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT DEFAULT '',
    total_downtime_minutes INTEGER DEFAULT 0,
    planned INTEGER DEFAULT 0,
    production_lost REAL DEFAULT 0,
    downtime_category TEXT DEFAULT '',
    downtime_reason TEXT DEFAULT '',
    linked_failure_id INTEGER,
    linked_work_order_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(linked_failure_id) REFERENCES failure_events(id) ON DELETE SET NULL,
    FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS root_cause_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    failure_event_id INTEGER NOT NULL UNIQUE,
    problem TEXT DEFAULT '',
    cause TEXT DEFAULT '',
    root_cause TEXT DEFAULT '',
    corrective_action TEXT DEFAULT '',
    preventive_action TEXT DEFAULT '',
    lessons_learned TEXT DEFAULT '',
    verification_status TEXT DEFAULT 'pending',
    approval_status TEXT DEFAULT 'pending',
    approved_by_id INTEGER,
    approved_at TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(failure_event_id) REFERENCES failure_events(id) ON DELETE CASCADE,
    FOREIGN KEY(approved_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS corrective_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    failure_event_id INTEGER NOT NULL,
    work_order_id INTEGER,
    repair_type TEXT DEFAULT 'Corrective',
    temporary_repair INTEGER DEFAULT 0,
    permanent_repair INTEGER DEFAULT 0,
    parts_used TEXT DEFAULT '',
    labor_hours REAL DEFAULT 0,
    contractor TEXT DEFAULT '',
    repair_notes TEXT DEFAULT '',
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(failure_event_id) REFERENCES failure_events(id) ON DELETE CASCADE,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS failure_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL UNIQUE,
    mtbf_hours REAL DEFAULT 0,
    mttr_hours REAL DEFAULT 0,
    availability_percent REAL DEFAULT 100,
    reliability_percent REAL DEFAULT 100,
    failure_frequency INTEGER DEFAULT 0,
    total_downtime_hours REAL DEFAULT 0,
    downtime_percent REAL DEFAULT 0,
    average_repair_time_hours REAL DEFAULT 0,
    repair_cost REAL DEFAULT 0,
    downtime_cost REAL DEFAULT 0,
    calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '',
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    customer_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    engineer_id INTEGER NOT NULL,
    scheduled_date TEXT NOT NULL,
    due_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    service_hours INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    assigned_by_id INTEGER,
    assigned_at TEXT DEFAULT '',
    accepted_at TEXT DEFAULT '',
    started_at TEXT DEFAULT '',
    paused_at TEXT DEFAULT '',
    resumed_at TEXT DEFAULT '',
    completed_at TEXT DEFAULT '',
    approved_by_id INTEGER,
    approved_at TEXT DEFAULT '',
    closed_at TEXT DEFAULT '',
    cancelled_at TEXT DEFAULT '',
    rejected_at TEXT DEFAULT '',
    hold_reason TEXT DEFAULT '',
    waiting_parts_reason TEXT DEFAULT '',
    runtime_reading_start INTEGER DEFAULT 0,
    runtime_reading_end INTEGER DEFAULT 0,
    technician_notes TEXT DEFAULT '',
    completion_notes TEXT DEFAULT '',
    supervisor_notes TEXT DEFAULT '',
    checklist_completed INTEGER DEFAULT 0,
    work_duration_minutes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
    FOREIGN KEY(engineer_id) REFERENCES engineers(id) ON DELETE RESTRICT,
    FOREIGN KEY(assigned_by_id) REFERENCES engineers(id) ON DELETE SET NULL,
    FOREIGN KEY(approved_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT DEFAULT '',
    to_status TEXT DEFAULT '',
    actor_id INTEGER,
    actor_name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    metadata TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    from_status TEXT DEFAULT '',
    to_status TEXT NOT NULL,
    changed_by_id INTEGER,
    reason TEXT DEFAULT '',
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(changed_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_assignment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    engineer_id INTEGER NOT NULL,
    assigned_by_id INTEGER,
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT DEFAULT '',
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(engineer_id) REFERENCES engineers(id) ON DELETE RESTRICT,
    FOREIGN KEY(assigned_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    supervisor_id INTEGER,
    action TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(supervisor_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT DEFAULT '',
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    stock_quantity INTEGER DEFAULT 0,
    minimum_quantity INTEGER DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    location TEXT DEFAULT '',
    linked_work_order_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS preventive_maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    interval_hours INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 30,
    last_service_hours INTEGER DEFAULT 0,
    last_service_date TEXT DEFAULT '',
    next_due_date TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preventive_maintenance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pm_task_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    service_hours INTEGER DEFAULT 0,
    service_date TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(pm_task_id) REFERENCES preventive_maintenance(id) ON DELETE CASCADE,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pm_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    recurrence_type TEXT DEFAULT 'Runtime Hours',
    interval_value INTEGER DEFAULT 1,
    start_date TEXT NOT NULL,
    next_due_date TEXT DEFAULT '',
    next_due_runtime INTEGER DEFAULT 0,
    last_service_date TEXT DEFAULT '',
    last_runtime INTEGER DEFAULT 0,
    estimated_duration_minutes INTEGER DEFAULT 0,
    required_skills TEXT DEFAULT '',
    checklist_template TEXT DEFAULT '',
    planned_spare_parts TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pm_plan_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pm_plan_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    task_description TEXT DEFAULT '',
    sequence INTEGER DEFAULT 1,
    is_required INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(pm_plan_id) REFERENCES pm_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pm_plan_work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pm_plan_id INTEGER NOT NULL,
    work_order_id INTEGER NOT NULL UNIQUE,
    cycle_key TEXT NOT NULL,
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'generated',
    FOREIGN KEY(pm_plan_id) REFERENCES pm_plans(id) ON DELETE CASCADE,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    UNIQUE(pm_plan_id, cycle_key)
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jti TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    token_type TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT DEFAULT '',
    user_name TEXT DEFAULT '',
    role TEXT DEFAULT '',
    action TEXT DEFAULT '',
    module TEXT DEFAULT '',
    record_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    old_values TEXT DEFAULT '',
    new_values TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    device_info TEXT DEFAULT '',
    status TEXT DEFAULT 'SUCCESS'
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_asset_history_asset_id ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_created_at ON asset_history(created_at);
CREATE INDEX IF NOT EXISTS idx_asset_events_asset_id ON asset_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_status ON asset_events(status);
CREATE INDEX IF NOT EXISTS idx_asset_measurements_asset_id ON asset_measurements(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_asset_id ON asset_photos(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_health_asset_id ON asset_health(asset_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_asset_id ON failure_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_failure_datetime ON failure_events(failure_datetime);
CREATE INDEX IF NOT EXISTS idx_failure_events_status ON failure_events(status);
CREATE INDEX IF NOT EXISTS idx_failure_events_linked_work_order_id ON failure_events(linked_work_order_id);
CREATE INDEX IF NOT EXISTS idx_downtime_events_asset_id ON downtime_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_downtime_events_start_time ON downtime_events(start_time);
CREATE INDEX IF NOT EXISTS idx_downtime_events_linked_failure_id ON downtime_events(linked_failure_id);
CREATE INDEX IF NOT EXISTS idx_root_cause_failure_event_id ON root_cause_analysis(failure_event_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_failure_event_id ON corrective_actions(failure_event_id);
CREATE INDEX IF NOT EXISTS idx_failure_statistics_asset_id ON failure_statistics(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_order_timeline_work_order_id ON work_order_timeline(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_status_history_work_order_id ON work_order_status_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_assignment_history_work_order_id ON work_order_assignment_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_approvals_work_order_id ON work_order_approvals(work_order_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_equipment_id ON pm_plans(equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_status ON pm_plans(status);
CREATE INDEX IF NOT EXISTS idx_pm_plans_next_due_date ON pm_plans(next_due_date);
CREATE INDEX IF NOT EXISTS idx_pm_plans_next_due_runtime ON pm_plans(next_due_runtime);
CREATE INDEX IF NOT EXISTS idx_pm_plan_tasks_plan_id ON pm_plan_tasks(pm_plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_plan_work_orders_plan_id ON pm_plan_work_orders(pm_plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_plan_work_orders_work_order_id ON pm_plan_work_orders(work_order_id);
"""


POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS engineers (
    id SERIAL PRIMARY KEY,
    employee_code TEXT DEFAULT '',
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    specialty TEXT DEFAULT '',
    job_title TEXT DEFAULT '',
    department TEXT DEFAULT '',
    work_location TEXT DEFAULT '',
    supervisor TEXT DEFAULT '',
    username TEXT DEFAULT '',
    password TEXT DEFAULT '',
    role TEXT DEFAULT 'viewer',
    permissions TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS job_titles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    serial_number TEXT DEFAULT '',
    model TEXT DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    manufacturer TEXT DEFAULT '',
    location TEXT DEFAULT '',
    parent_id INTEGER,
    asset_type TEXT DEFAULT 'Equipment',
    asset_level TEXT DEFAULT 'Equipment',
    asset_code TEXT DEFAULT '',
    qr_code TEXT DEFAULT '',
    barcode TEXT DEFAULT '',
    criticality TEXT DEFAULT 'Medium',
    site TEXT DEFAULT '',
    department TEXT DEFAULT '',
    commission_date TEXT DEFAULT '',
    installation_date TEXT DEFAULT '',
    warranty_start TEXT DEFAULT '',
    warranty_end TEXT DEFAULT '',
    expected_life_years INTEGER DEFAULT 0,
    replacement_cost REAL DEFAULT 0,
    current_condition TEXT DEFAULT '',
    maintenance_interval_hours INTEGER DEFAULT 1000,
    maintenance_interval_days INTEGER DEFAULT 90,
    current_hours INTEGER DEFAULT 0,
    last_reading REAL DEFAULT 0,
    current_reading REAL DEFAULT 0,
    last_pm_date TEXT DEFAULT '',
    next_pm_date TEXT DEFAULT '',
    last_breakdown_date TEXT DEFAULT '',
    last_repair_date TEXT DEFAULT '',
    purchase_cost REAL DEFAULT 0,
    total_maintenance_cost REAL DEFAULT 0,
    spare_parts_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    contractor_cost REAL DEFAULT 0,
    last_maintenance_date TEXT DEFAULT '',
    status TEXT DEFAULT 'operational',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    source_module TEXT DEFAULT '',
    source_record_id TEXT DEFAULT '',
    actor_id INTEGER,
    metadata TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_events (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    status TEXT DEFAULT 'open',
    due_date TEXT DEFAULT '',
    description TEXT DEFAULT '',
    source_module TEXT DEFAULT '',
    source_record_id TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    resolved_at TEXT DEFAULT '',
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_measurements (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    measurement_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT DEFAULT '',
    reading_date TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    source_module TEXT DEFAULT '',
    source_record_id TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_documents (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    document_type TEXT DEFAULT 'Manual',
    title TEXT NOT NULL,
    file_name TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    uploaded_by_id INTEGER,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(uploaded_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_photos (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    photo_type TEXT DEFAULT 'Current Photo',
    title TEXT NOT NULL,
    file_name TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    uploaded_by_id INTEGER,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(uploaded_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_health (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL UNIQUE,
    health_score INTEGER DEFAULT 100,
    health_status TEXT DEFAULT 'Excellent',
    availability REAL DEFAULT 100,
    mtbf REAL DEFAULT 0,
    mttr REAL DEFAULT 0,
    total_downtime_hours REAL DEFAULT 0,
    maintenance_cost REAL DEFAULT 0,
    pm_compliance REAL DEFAULT 100,
    failure_frequency INTEGER DEFAULT 0,
    open_work_orders INTEGER DEFAULT 0,
    completed_pm INTEGER DEFAULT 0,
    upcoming_pm INTEGER DEFAULT 0,
    calculated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    metadata TEXT DEFAULT '',
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS problem_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS failure_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS cause_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS remedy_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    customer_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    engineer_id INTEGER NOT NULL,
    scheduled_date TEXT NOT NULL,
    due_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    service_hours INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    assigned_by_id INTEGER,
    assigned_at TEXT DEFAULT '',
    accepted_at TEXT DEFAULT '',
    started_at TEXT DEFAULT '',
    paused_at TEXT DEFAULT '',
    resumed_at TEXT DEFAULT '',
    completed_at TEXT DEFAULT '',
    approved_by_id INTEGER,
    approved_at TEXT DEFAULT '',
    closed_at TEXT DEFAULT '',
    cancelled_at TEXT DEFAULT '',
    rejected_at TEXT DEFAULT '',
    hold_reason TEXT DEFAULT '',
    waiting_parts_reason TEXT DEFAULT '',
    runtime_reading_start INTEGER DEFAULT 0,
    runtime_reading_end INTEGER DEFAULT 0,
    technician_notes TEXT DEFAULT '',
    completion_notes TEXT DEFAULT '',
    supervisor_notes TEXT DEFAULT '',
    checklist_completed INTEGER DEFAULT 0,
    work_duration_minutes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
    FOREIGN KEY(engineer_id) REFERENCES engineers(id) ON DELETE RESTRICT,
    FOREIGN KEY(assigned_by_id) REFERENCES engineers(id) ON DELETE SET NULL,
    FOREIGN KEY(approved_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_timeline (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT DEFAULT '',
    to_status TEXT DEFAULT '',
    actor_id INTEGER,
    actor_name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    metadata TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_status_history (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL,
    from_status TEXT DEFAULT '',
    to_status TEXT NOT NULL,
    changed_by_id INTEGER,
    reason TEXT DEFAULT '',
    changed_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(changed_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_assignment_history (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL,
    engineer_id INTEGER NOT NULL,
    assigned_by_id INTEGER,
    assigned_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    notes TEXT DEFAULT '',
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(engineer_id) REFERENCES engineers(id) ON DELETE RESTRICT,
    FOREIGN KEY(assigned_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_order_approvals (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL,
    supervisor_id INTEGER,
    action TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(supervisor_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    part_number TEXT DEFAULT '',
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    stock_quantity INTEGER DEFAULT 0,
    minimum_quantity INTEGER DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    location TEXT DEFAULT '',
    linked_work_order_id INTEGER,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS preventive_maintenance (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    interval_hours INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 30,
    last_service_hours INTEGER DEFAULT 0,
    last_service_date TEXT DEFAULT '',
    next_due_date TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS failure_events (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    failure_id TEXT NOT NULL UNIQUE,
    failure_datetime TEXT NOT NULL,
    failure_start TEXT NOT NULL,
    failure_end TEXT DEFAULT '',
    detection_method TEXT DEFAULT '',
    failure_type TEXT DEFAULT '',
    failure_category TEXT DEFAULT '',
    severity TEXT DEFAULT 'medium',
    operational_impact TEXT DEFAULT '',
    breakdown_indicator INTEGER DEFAULT 0,
    emergency_indicator INTEGER DEFAULT 0,
    failure_description TEXT DEFAULT '',
    problem_code_id INTEGER,
    failure_code_id INTEGER,
    cause_code_id INTEGER,
    remedy_code_id INTEGER,
    reported_by_id INTEGER,
    assigned_technician_id INTEGER,
    linked_work_order_id INTEGER,
    linked_pm_id INTEGER,
    status TEXT DEFAULT 'open',
    rca_status TEXT DEFAULT 'not_required',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(problem_code_id) REFERENCES problem_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(failure_code_id) REFERENCES failure_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(cause_code_id) REFERENCES cause_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(remedy_code_id) REFERENCES remedy_codes(id) ON DELETE SET NULL,
    FOREIGN KEY(reported_by_id) REFERENCES engineers(id) ON DELETE SET NULL,
    FOREIGN KEY(assigned_technician_id) REFERENCES engineers(id) ON DELETE SET NULL,
    FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
    FOREIGN KEY(linked_pm_id) REFERENCES preventive_maintenance(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS downtime_events (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT DEFAULT '',
    total_downtime_minutes INTEGER DEFAULT 0,
    planned INTEGER DEFAULT 0,
    production_lost REAL DEFAULT 0,
    downtime_category TEXT DEFAULT '',
    downtime_reason TEXT DEFAULT '',
    linked_failure_id INTEGER,
    linked_work_order_id INTEGER,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY(linked_failure_id) REFERENCES failure_events(id) ON DELETE SET NULL,
    FOREIGN KEY(linked_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS root_cause_analysis (
    id SERIAL PRIMARY KEY,
    failure_event_id INTEGER NOT NULL UNIQUE,
    problem TEXT DEFAULT '',
    cause TEXT DEFAULT '',
    root_cause TEXT DEFAULT '',
    corrective_action TEXT DEFAULT '',
    preventive_action TEXT DEFAULT '',
    lessons_learned TEXT DEFAULT '',
    verification_status TEXT DEFAULT 'pending',
    approval_status TEXT DEFAULT 'pending',
    approved_by_id INTEGER,
    approved_at TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(failure_event_id) REFERENCES failure_events(id) ON DELETE CASCADE,
    FOREIGN KEY(approved_by_id) REFERENCES engineers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS corrective_actions (
    id SERIAL PRIMARY KEY,
    failure_event_id INTEGER NOT NULL,
    work_order_id INTEGER,
    repair_type TEXT DEFAULT 'Corrective',
    temporary_repair INTEGER DEFAULT 0,
    permanent_repair INTEGER DEFAULT 0,
    parts_used TEXT DEFAULT '',
    labor_hours REAL DEFAULT 0,
    contractor TEXT DEFAULT '',
    repair_notes TEXT DEFAULT '',
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(failure_event_id) REFERENCES failure_events(id) ON DELETE CASCADE,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS failure_statistics (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL UNIQUE,
    mtbf_hours REAL DEFAULT 0,
    mttr_hours REAL DEFAULT 0,
    availability_percent REAL DEFAULT 100,
    reliability_percent REAL DEFAULT 100,
    failure_frequency INTEGER DEFAULT 0,
    total_downtime_hours REAL DEFAULT 0,
    downtime_percent REAL DEFAULT 0,
    average_repair_time_hours REAL DEFAULT 0,
    repair_cost REAL DEFAULT 0,
    downtime_cost REAL DEFAULT 0,
    calculated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    metadata TEXT DEFAULT '',
    FOREIGN KEY(asset_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preventive_maintenance_history (
    id SERIAL PRIMARY KEY,
    pm_task_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    service_hours INTEGER DEFAULT 0,
    service_date TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(pm_task_id) REFERENCES preventive_maintenance(id) ON DELETE CASCADE,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pm_plans (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    recurrence_type TEXT DEFAULT 'Runtime Hours',
    interval_value INTEGER DEFAULT 1,
    start_date TEXT NOT NULL,
    next_due_date TEXT DEFAULT '',
    next_due_runtime INTEGER DEFAULT 0,
    last_service_date TEXT DEFAULT '',
    last_runtime INTEGER DEFAULT 0,
    estimated_duration_minutes INTEGER DEFAULT 0,
    required_skills TEXT DEFAULT '',
    checklist_template TEXT DEFAULT '',
    planned_spare_parts TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pm_plan_tasks (
    id SERIAL PRIMARY KEY,
    pm_plan_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    task_description TEXT DEFAULT '',
    sequence INTEGER DEFAULT 1,
    is_required INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    FOREIGN KEY(pm_plan_id) REFERENCES pm_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pm_plan_work_orders (
    id SERIAL PRIMARY KEY,
    pm_plan_id INTEGER NOT NULL,
    work_order_id INTEGER NOT NULL UNIQUE,
    cycle_key TEXT NOT NULL,
    generated_at TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    status TEXT DEFAULT 'generated',
    FOREIGN KEY(pm_plan_id) REFERENCES pm_plans(id) ON DELETE CASCADE,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    UNIQUE(pm_plan_id, cycle_key)
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    jti TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    token_type TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT DEFAULT '',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP::text)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TEXT DEFAULT (CURRENT_TIMESTAMP::text),
    user_id TEXT DEFAULT '',
    user_name TEXT DEFAULT '',
    role TEXT DEFAULT '',
    action TEXT DEFAULT '',
    module TEXT DEFAULT '',
    record_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    old_values TEXT DEFAULT '',
    new_values TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    device_info TEXT DEFAULT '',
    status TEXT DEFAULT 'SUCCESS'
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_asset_history_asset_id ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_created_at ON asset_history(created_at);
CREATE INDEX IF NOT EXISTS idx_asset_events_asset_id ON asset_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_status ON asset_events(status);
CREATE INDEX IF NOT EXISTS idx_asset_measurements_asset_id ON asset_measurements(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_asset_id ON asset_photos(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_health_asset_id ON asset_health(asset_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_asset_id ON failure_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_failure_datetime ON failure_events(failure_datetime);
CREATE INDEX IF NOT EXISTS idx_failure_events_status ON failure_events(status);
CREATE INDEX IF NOT EXISTS idx_failure_events_linked_work_order_id ON failure_events(linked_work_order_id);
CREATE INDEX IF NOT EXISTS idx_downtime_events_asset_id ON downtime_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_downtime_events_start_time ON downtime_events(start_time);
CREATE INDEX IF NOT EXISTS idx_downtime_events_linked_failure_id ON downtime_events(linked_failure_id);
CREATE INDEX IF NOT EXISTS idx_root_cause_failure_event_id ON root_cause_analysis(failure_event_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_failure_event_id ON corrective_actions(failure_event_id);
CREATE INDEX IF NOT EXISTS idx_failure_statistics_asset_id ON failure_statistics(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_order_timeline_work_order_id ON work_order_timeline(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_status_history_work_order_id ON work_order_status_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_assignment_history_work_order_id ON work_order_assignment_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_approvals_work_order_id ON work_order_approvals(work_order_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_equipment_id ON pm_plans(equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_status ON pm_plans(status);
CREATE INDEX IF NOT EXISTS idx_pm_plans_next_due_date ON pm_plans(next_due_date);
CREATE INDEX IF NOT EXISTS idx_pm_plans_next_due_runtime ON pm_plans(next_due_runtime);
CREATE INDEX IF NOT EXISTS idx_pm_plan_tasks_plan_id ON pm_plan_tasks(pm_plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_plan_work_orders_plan_id ON pm_plan_work_orders(pm_plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_plan_work_orders_work_order_id ON pm_plan_work_orders(work_order_id);
"""


class DatabaseConnection:
    def __init__(self, raw: Any, backend: str):
        self.raw = raw
        self.backend = backend

    def __enter__(self) -> "DatabaseConnection":
        self.raw.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.raw.__exit__(exc_type, exc, tb)

    def execute(self, query: str, params: tuple[Any, ...] | list[Any] | None = None):
        return self.raw.execute(adapt_query(query, self.backend), params or ())

    def executescript(self, script: str) -> None:
        if self.backend == "sqlite":
            self.raw.executescript(script)
            return
        for statement in split_sql_script(script):
            self.execute(statement)

    def commit(self) -> None:
        self.raw.commit()


def get_connection() -> DatabaseConnection:
    if DB_BACKEND == "postgres":
        if psycopg is None:
            raise RuntimeError("DATABASE_URL is set, but psycopg is not installed.")
        connection = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        return DatabaseConnection(connection, "postgres")

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return DatabaseConnection(connection, "sqlite")


def adapt_query(query: str, backend: str) -> str:
    if backend != "postgres":
        return query
    adapted = query.replace("?", "%s")
    adapted = adapted.replace("COLLATE NOCASE", "")
    adapted = re.sub(r"\bINSERT OR IGNORE INTO\b", "INSERT INTO", adapted, flags=re.IGNORECASE)
    return adapted


def split_sql_script(script: str) -> list[str]:
    return [statement.strip() for statement in script.split(";") if statement.strip()]


def insert_row(db: DatabaseConnection, table: str, data: dict[str, Any]) -> int:
    columns = ", ".join(data)
    placeholders = ", ".join(["?"] * len(data))
    query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    if db.backend == "postgres":
        cursor = db.execute(f"{query} RETURNING id", tuple(data.values()))
        row = cursor.fetchone()
        return int(row["id"])
    cursor = db.execute(query, tuple(data.values()))
    return int(cursor.lastrowid)


def init_db() -> None:
    with get_connection() as db:
        db.executescript(POSTGRES_SCHEMA if db.backend == "postgres" else SQLITE_SCHEMA)
        ensure_columns(
            db,
            "engineers",
            {
                "employee_code": "TEXT DEFAULT ''",
                "username": "TEXT DEFAULT ''",
                "password": "TEXT DEFAULT ''",
                "role": "TEXT DEFAULT 'viewer'",
                "permissions": "TEXT DEFAULT ''",
                "job_title": "TEXT DEFAULT ''",
                "department": "TEXT DEFAULT ''",
                "work_location": "TEXT DEFAULT ''",
                "supervisor": "TEXT DEFAULT ''",
            },
        )
        ensure_columns(
            db,
            "equipment",
            {
                "parent_id": "INTEGER",
                "asset_type": "TEXT DEFAULT 'Equipment'",
                "asset_level": "TEXT DEFAULT 'Equipment'",
                "asset_code": "TEXT DEFAULT ''",
                "criticality": "TEXT DEFAULT 'Medium'",
                "description": "TEXT DEFAULT ''",
                "category": "TEXT DEFAULT ''",
                "manufacturer": "TEXT DEFAULT ''",
                "qr_code": "TEXT DEFAULT ''",
                "barcode": "TEXT DEFAULT ''",
                "site": "TEXT DEFAULT ''",
                "department": "TEXT DEFAULT ''",
                "commission_date": "TEXT DEFAULT ''",
                "installation_date": "TEXT DEFAULT ''",
                "warranty_start": "TEXT DEFAULT ''",
                "warranty_end": "TEXT DEFAULT ''",
                "expected_life_years": "INTEGER DEFAULT 0",
                "replacement_cost": "REAL DEFAULT 0",
                "current_condition": "TEXT DEFAULT ''",
                "last_reading": "REAL DEFAULT 0",
                "current_reading": "REAL DEFAULT 0",
                "last_pm_date": "TEXT DEFAULT ''",
                "next_pm_date": "TEXT DEFAULT ''",
                "last_breakdown_date": "TEXT DEFAULT ''",
                "last_repair_date": "TEXT DEFAULT ''",
                "purchase_cost": "REAL DEFAULT 0",
                "total_maintenance_cost": "REAL DEFAULT 0",
                "spare_parts_cost": "REAL DEFAULT 0",
                "labor_cost": "REAL DEFAULT 0",
                "contractor_cost": "REAL DEFAULT 0",
            },
        )
        for statement in [
            "CREATE INDEX IF NOT EXISTS idx_equipment_asset_code ON equipment(asset_code)",
            "CREATE INDEX IF NOT EXISTS idx_equipment_site ON equipment(site)",
            "CREATE INDEX IF NOT EXISTS idx_equipment_department ON equipment(department)",
        ]:
            db.execute(statement)
        ensure_columns(
            db,
            "work_orders",
            {
                "assigned_by_id": "INTEGER",
                "assigned_at": "TEXT DEFAULT ''",
                "accepted_at": "TEXT DEFAULT ''",
                "started_at": "TEXT DEFAULT ''",
                "paused_at": "TEXT DEFAULT ''",
                "resumed_at": "TEXT DEFAULT ''",
                "completed_at": "TEXT DEFAULT ''",
                "approved_by_id": "INTEGER",
                "approved_at": "TEXT DEFAULT ''",
                "closed_at": "TEXT DEFAULT ''",
                "cancelled_at": "TEXT DEFAULT ''",
                "rejected_at": "TEXT DEFAULT ''",
                "hold_reason": "TEXT DEFAULT ''",
                "waiting_parts_reason": "TEXT DEFAULT ''",
                "runtime_reading_start": "INTEGER DEFAULT 0",
                "runtime_reading_end": "INTEGER DEFAULT 0",
                "technician_notes": "TEXT DEFAULT ''",
                "completion_notes": "TEXT DEFAULT ''",
                "supervisor_notes": "TEXT DEFAULT ''",
                "checklist_completed": "INTEGER DEFAULT 0",
                "work_duration_minutes": "INTEGER DEFAULT 0",
            },
        )
        ensure_columns(
            db,
            "auth_tokens",
            {
                "jti": "TEXT DEFAULT ''",
                "username": "TEXT DEFAULT ''",
                "token_type": "TEXT DEFAULT ''",
                "expires_at": "TEXT DEFAULT ''",
                "revoked_at": "TEXT DEFAULT ''",
            },
        )
        ensure_columns(
            db,
            "audit_logs",
            {
                "timestamp": "TEXT DEFAULT ''",
                "user_id": "TEXT DEFAULT ''",
                "user_name": "TEXT DEFAULT ''",
                "role": "TEXT DEFAULT ''",
                "action": "TEXT DEFAULT ''",
                "module": "TEXT DEFAULT ''",
                "record_id": "TEXT DEFAULT ''",
                "description": "TEXT DEFAULT ''",
                "old_values": "TEXT DEFAULT ''",
                "new_values": "TEXT DEFAULT ''",
                "ip_address": "TEXT DEFAULT ''",
                "device_info": "TEXT DEFAULT ''",
                "status": "TEXT DEFAULT 'SUCCESS'",
            },
        )
        seed_data(db)
        ensure_super_admin(db)
        migrate_plaintext_passwords(db)


def ensure_columns(db: DatabaseConnection, table: str, columns: dict[str, str]) -> None:
    if db.backend == "postgres":
        existing_rows = db.execute(
            """
            SELECT column_name AS name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table,),
        ).fetchall()
        existing = {row["name"] for row in existing_rows}
    else:
        existing = {row["name"] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}

    for name, definition in columns.items():
        if name not in existing:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def seed_data(db: DatabaseConnection) -> None:
    seed_job_titles(db)
    seed_failure_code_lists(db)
    customer_count = db.execute("SELECT COUNT(*) AS total FROM customers").fetchone()["total"]
    if customer_count:
        return

    db.execute(
        "INSERT INTO customers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)",
        ("Gabal Elasfar Power Plant", "Operations Manager", "ops@gabal-plant.local", "+20 000 0000", "Cairo, Egypt"),
    )
    db.execute(
        """
        INSERT INTO engineers (
            employee_code, name, email, phone, specialty, job_title, department,
            work_location, supervisor, username, password, role, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "EMP-0001",
            "Ebrahim Mohamed",
            "ebrahim@ecs.local",
            "+20 111 0000",
            "Power Plant Maintenance",
            "Shift Engineer",
            "Maintenance",
            "Gabal Elasfar Power Plant",
            "Maintenance Manager",
            "",
            "",
            "engineer",
            "active",
        ),
    )
    db.execute(
        """
        INSERT INTO equipment (
            customer_id, name, serial_number, model, location,
            maintenance_interval_hours, maintenance_interval_days, current_hours,
            last_maintenance_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (1, "M01 Generator", "1655893-BF80", "Gas Engine Unit", "Gabal Elasfar M01", 1000, 90, 4427, "2026-04-01", "operational"),
    )
    db.execute(
        """
        INSERT INTO work_orders (
            title, description, customer_id, equipment_id, engineer_id,
            scheduled_date, due_date, status, priority, service_hours, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "Oil service inspection",
            "Inspect oil level, filters, and operating readings.",
            1,
            1,
            1,
            "2026-05-06",
            "2026-05-07",
            "pending",
            "high",
            4427,
            "Initial seeded work order.",
        ),
    )


def ensure_super_admin(db: DatabaseConnection) -> None:
    if not admin_credentials_configured():
        return
    username = admin_username()
    password = admin_password()
    email = admin_email()
    existing = db.execute("SELECT * FROM engineers WHERE username = ? COLLATE NOCASE", (username,)).fetchone()
    if existing:
        row = dict(existing)
        stored_password = row.get("password") or password
        next_password = hash_password(password) if password else (stored_password if is_password_hash(stored_password) else hash_password(stored_password))
        db.execute(
            """
            UPDATE engineers
            SET name = ?, email = ?, job_title = ?, department = ?, role = ?, status = ?, password = ?
            WHERE id = ?
            """,
            ("System Administrator", email, "Super Admin", "Administration", "admin", "active", next_password, row["id"]),
        )
        return

    db.execute(
        """
        INSERT INTO engineers (
            employee_code, name, email, phone, specialty, job_title, department,
            work_location, supervisor, username, password, role, permissions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "ADMIN-0001",
            "System Administrator",
            email,
            "",
            "Administration",
            "Super Admin",
            "Administration",
            "Available for All Sites",
            "",
            username,
            hash_password(password),
            "admin",
            "",
            "active",
        ),
    )


def migrate_plaintext_passwords(db: DatabaseConnection) -> None:
    rows = db.execute("SELECT id, password FROM engineers WHERE password IS NOT NULL AND password != ''").fetchall()
    for row in rows:
        item = dict(row)
        password = item.get("password", "")
        if password and not is_password_hash(password):
            db.execute("UPDATE engineers SET password = ? WHERE id = ?", (hash_password(password), item["id"]))


def seed_job_titles(db: DatabaseConnection) -> None:
    titles = [
        "Shift Engineer",
        "Maintenance Engineer",
        "Electrical Engineer",
        "Mechanical Engineer",
        "Senior Electrical Technician",
        "Electrical Technician",
        "Mechanical Technician",
        "Maintenance Supervisor",
        "Technician",
        "Viewer",
    ]
    for title in titles:
        if db.backend == "postgres":
            db.execute("INSERT INTO job_titles (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (title,))
        else:
            db.execute("INSERT OR IGNORE INTO job_titles (name) VALUES (?)", (title,))


def seed_failure_code_lists(db: DatabaseConnection) -> None:
    lists = {
        "problem_codes": [
            ("ELEC", "Electrical"),
            ("MECH", "Mechanical"),
            ("HYD", "Hydraulic"),
            ("PNEU", "Pneumatic"),
            ("INST", "Instrumentation"),
            ("SOFT", "Software"),
        ],
        "failure_codes": [
            ("BEARING_FAILURE", "Bearing Failure"),
            ("SEAL_LEAKAGE", "Seal Leakage"),
            ("MOTOR_BURN", "Motor Burn"),
            ("SENSOR_FAULT", "Sensor Fault"),
            ("BELT_BROKEN", "Belt Broken"),
            ("VALVE_JAMMED", "Valve Jammed"),
        ],
        "cause_codes": [
            ("POOR_LUBRICATION", "Poor Lubrication"),
            ("MISALIGNMENT", "Misalignment"),
            ("OVERLOAD", "Overload"),
            ("WEAR", "Wear"),
            ("HUMAN_ERROR", "Human Error"),
            ("POOR_INSTALLATION", "Poor Installation"),
        ],
        "remedy_codes": [
            ("REPLACE_BEARING", "Replace Bearing"),
            ("LUBRICATE", "Lubricate"),
            ("ADJUST_ALIGNMENT", "Adjust Alignment"),
            ("REPLACE_MOTOR", "Replace Motor"),
            ("TIGHTEN_BOLTS", "Tighten Bolts"),
            ("CALIBRATION", "Calibration"),
        ],
    }
    for table, rows in lists.items():
        for code, name in rows:
            if db.backend == "postgres":
                db.execute(f"INSERT INTO {table} (code, name) VALUES (?, ?) ON CONFLICT (code) DO NOTHING", (code, name))
            else:
                db.execute(f"INSERT OR IGNORE INTO {table} (code, name) VALUES (?, ?)", (code, name))
