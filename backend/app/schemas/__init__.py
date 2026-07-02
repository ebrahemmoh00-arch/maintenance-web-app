from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal[
    "draft",
    "new",
    "pending",
    "assigned",
    "accepted",
    "in_progress",
    "waiting_for_parts",
    "completed",
    "pending_supervisor_review",
    "approved",
    "closed",
    "rejected",
    "cancelled",
    "on_hold",
    "overdue",
]
Priority = Literal["low", "medium", "high", "critical"]


class CustomerBase(BaseModel):
    name: str = Field(min_length=1)
    contact_person: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class Customer(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str


class EngineerBase(BaseModel):
    employee_code: str = ""
    name: str = Field(min_length=1)
    email: str = ""
    phone: str = ""
    specialty: str = ""
    job_title: str = ""
    department: str = ""
    work_location: str = ""
    supervisor: str = ""
    username: str = ""
    role: str = "viewer"
    permissions: str = ""
    status: Literal["active", "on_shift", "off_duty", "inactive"] = "active"


class EngineerCreate(EngineerBase):
    password: str = ""


class EngineerUpdate(BaseModel):
    employee_code: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    specialty: str | None = None
    job_title: str | None = None
    department: str | None = None
    work_location: str | None = None
    supervisor: str | None = None
    username: str | None = None
    password: str | None = None
    role: str | None = None
    permissions: str | None = None
    status: str | None = None


class Engineer(EngineerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str


class AuthUser(Engineer):
    pass


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser


class AuditLog(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: str
    user_id: str = ""
    user_name: str = ""
    role: str = ""
    action: str = ""
    module: str = ""
    record_id: str = ""
    description: str = ""
    old_values: str = ""
    new_values: str = ""
    ip_address: str = ""
    device_info: str = ""
    status: str = "SUCCESS"


class AuditExportRequest(BaseModel):
    format: str = "CSV"


class AuditDeleteRequest(BaseModel):
    ids: list[int] = Field(default_factory=list)


class JobTitleBase(BaseModel):
    name: str = Field(min_length=1)


class JobTitleCreate(JobTitleBase):
    pass


class JobTitleUpdate(BaseModel):
    name: str | None = None


class JobTitle(JobTitleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str


class EquipmentBase(BaseModel):
    customer_id: int
    name: str = Field(min_length=1)
    serial_number: str = ""
    model: str = ""
    location: str = ""
    parent_id: int | None = None
    asset_type: str = "Equipment"
    asset_level: str = "Equipment"
    asset_code: str = ""
    criticality: str = "Medium"
    maintenance_interval_hours: int = Field(default=1000, ge=0)
    maintenance_interval_days: int = Field(default=90, ge=0)
    current_hours: int = Field(default=0, ge=0)
    last_maintenance_date: str = ""
    status: str = "Active"


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    customer_id: int | None = None
    name: str | None = None
    serial_number: str | None = None
    model: str | None = None
    location: str | None = None
    parent_id: int | None = None
    asset_type: str | None = None
    asset_level: str | None = None
    asset_code: str | None = None
    criticality: str | None = None
    maintenance_interval_hours: int | None = None
    maintenance_interval_days: int | None = None
    current_hours: int | None = None
    last_maintenance_date: str | None = None
    status: str | None = None


class Equipment(EquipmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    next_maintenance_date: str | None = None
    days_until_maintenance: int | None = None
    hours_until_maintenance: int | None = None
    maintenance_due: bool = False
    maintenance_alert: Literal["OK", "UPCOMING", "DUE NOW"] = "OK"


class WorkOrderBase(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    customer_id: int
    equipment_id: int
    engineer_id: int
    scheduled_date: str
    due_date: str = ""
    status: Status = "pending"
    priority: Priority = "medium"
    service_hours: int = Field(default=0, ge=0)
    notes: str = ""
    assigned_by_id: int | None = None
    assigned_at: str = ""
    accepted_at: str = ""
    started_at: str = ""
    paused_at: str = ""
    resumed_at: str = ""
    completed_at: str = ""
    approved_by_id: int | None = None
    approved_at: str = ""
    closed_at: str = ""
    cancelled_at: str = ""
    rejected_at: str = ""
    hold_reason: str = ""
    waiting_parts_reason: str = ""
    runtime_reading_start: int = Field(default=0, ge=0)
    runtime_reading_end: int = Field(default=0, ge=0)
    technician_notes: str = ""
    completion_notes: str = ""
    supervisor_notes: str = ""
    checklist_completed: bool = False
    work_duration_minutes: int = Field(default=0, ge=0)


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    customer_id: int | None = None
    equipment_id: int | None = None
    engineer_id: int | None = None
    scheduled_date: str | None = None
    due_date: str | None = None
    status: Status | None = None
    priority: Priority | None = None
    service_hours: int | None = None
    notes: str | None = None
    assigned_by_id: int | None = None
    assigned_at: str | None = None
    accepted_at: str | None = None
    started_at: str | None = None
    paused_at: str | None = None
    resumed_at: str | None = None
    completed_at: str | None = None
    approved_by_id: int | None = None
    approved_at: str | None = None
    closed_at: str | None = None
    cancelled_at: str | None = None
    rejected_at: str | None = None
    hold_reason: str | None = None
    waiting_parts_reason: str | None = None
    runtime_reading_start: int | None = None
    runtime_reading_end: int | None = None
    technician_notes: str | None = None
    completion_notes: str | None = None
    supervisor_notes: str | None = None
    checklist_completed: bool | None = None
    work_duration_minutes: int | None = None


class WorkOrderLifecycleAction(BaseModel):
    actor_id: int | None = None
    engineer_id: int | None = None
    notes: str = ""
    reason: str = ""
    runtime_reading: int | None = Field(default=None, ge=0)
    technician_notes: str = ""
    completion_notes: str = ""
    supervisor_notes: str = ""
    checklist_completed: bool | None = None


class WorkOrderTimelineEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    work_order_id: int
    event_type: str
    from_status: str = ""
    to_status: str = ""
    actor_id: int | None = None
    actor_name: str = ""
    description: str = ""
    metadata: str = ""
    created_at: str


class WorkOrderApproval(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    work_order_id: int
    supervisor_id: int | None = None
    action: str
    notes: str = ""
    created_at: str


class WorkOrder(WorkOrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    updated_at: str
    customer_name: str | None = None
    equipment_name: str | None = None
    engineer_name: str | None = None
    assigned_by_name: str | None = None
    approved_by_name: str | None = None
    timeline: list[WorkOrderTimelineEntry] = Field(default_factory=list)
    approvals: list[WorkOrderApproval] = Field(default_factory=list)


class DashboardStats(BaseModel):
    total_orders: int
    pending_orders: int
    completed_orders: int
    new_orders: int = 0
    assigned_orders: int = 0
    in_progress_orders: int = 0
    waiting_parts_orders: int = 0
    pending_review_orders: int = 0
    closed_today: int = 0
    overdue_orders: int = 0
    average_completion_time_minutes: int = 0


class MaintenanceAlert(BaseModel):
    equipment_id: int
    equipment_name: str
    serial_number: str = ""
    location: str = ""
    alert_level: Literal["UPCOMING", "DUE NOW"]
    reason: str
    next_maintenance_date: str | None = None
    days_until_maintenance: int | None = None
    hours_until_maintenance: int | None = None


class InventoryItemBase(BaseModel):
    part_number: str = ""
    name: str = Field(min_length=1)
    category: str = ""
    stock_quantity: int = Field(default=0, ge=0)
    minimum_quantity: int = Field(default=1, ge=0)
    unit: str = "pcs"
    location: str = ""
    linked_work_order_id: int | None = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    part_number: str | None = None
    name: str | None = None
    category: str | None = None
    stock_quantity: int | None = None
    minimum_quantity: int | None = None
    unit: str | None = None
    location: str | None = None
    linked_work_order_id: int | None = None


class InventoryItem(InventoryItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    stock_alert: Literal["OK", "LOW STOCK", "OUT OF STOCK"] = "OK"
    linked_work_order_title: str | None = None


class PreventiveMaintenanceBase(BaseModel):
    equipment_id: int
    task_name: str = Field(min_length=1)
    interval_hours: int = Field(default=0, ge=0)
    interval_days: int = Field(default=30, ge=0)
    last_service_hours: int = Field(default=0, ge=0)
    last_service_date: str = ""
    next_due_date: str = ""
    status: Literal["active", "paused", "completed"] = "active"


class PreventiveMaintenanceCreate(PreventiveMaintenanceBase):
    pass


class PreventiveMaintenanceUpdate(BaseModel):
    equipment_id: int | None = None
    task_name: str | None = None
    interval_hours: int | None = None
    interval_days: int | None = None
    last_service_hours: int | None = None
    last_service_date: str | None = None
    next_due_date: str | None = None
    status: str | None = None


class PreventiveMaintenanceHistory(BaseModel):
    id: int
    pm_task_id: int
    equipment_id: int
    task_name: str
    service_hours: int = 0
    service_date: str = ""
    created_at: str


class PreventiveMaintenanceHistoryUpdate(BaseModel):
    service_hours: int | None = Field(default=None, ge=0)
    service_date: str | None = None


class PreventiveMaintenance(PreventiveMaintenanceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    equipment_name: str | None = None
    current_hours: int | None = None
    hours_until_due: int | None = None
    days_until_due: int | None = None
    pm_alert: Literal["OK", "UPCOMING", "DUE NOW"] = "OK"
    previous_records: list[PreventiveMaintenanceHistory] = []


PMRecurrenceType = Literal["Daily", "Weekly", "Monthly", "Runtime Hours"]
PMPlanStatus = Literal["active", "paused"]


class PMPlanTaskBase(BaseModel):
    task_name: str = Field(min_length=1)
    task_description: str = ""
    sequence: int = Field(default=1, ge=1)
    is_required: bool = True


class PMPlanTaskCreate(PMPlanTaskBase):
    pass


class PMPlanTaskUpdate(BaseModel):
    task_name: str | None = None
    task_description: str | None = None
    sequence: int | None = Field(default=None, ge=1)
    is_required: bool | None = None


class PMPlanTask(PMPlanTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    pm_plan_id: int
    created_at: str


class PMPlanBase(BaseModel):
    equipment_id: int
    name: str = Field(min_length=1)
    description: str = ""
    priority: Priority = "medium"
    recurrence_type: PMRecurrenceType = "Runtime Hours"
    interval_value: int = Field(default=1, ge=1)
    start_date: str
    next_due_date: str = ""
    next_due_runtime: int = Field(default=0, ge=0)
    last_service_date: str = ""
    last_runtime: int = Field(default=0, ge=0)
    estimated_duration_minutes: int = Field(default=0, ge=0)
    required_skills: str = ""
    checklist_template: str = ""
    planned_spare_parts: str = ""
    status: PMPlanStatus = "active"


class PMPlanCreate(PMPlanBase):
    tasks: list[PMPlanTaskCreate] = Field(default_factory=list)


class PMPlanUpdate(BaseModel):
    equipment_id: int | None = None
    name: str | None = None
    description: str | None = None
    priority: Priority | None = None
    recurrence_type: PMRecurrenceType | None = None
    interval_value: int | None = Field(default=None, ge=1)
    start_date: str | None = None
    next_due_date: str | None = None
    next_due_runtime: int | None = Field(default=None, ge=0)
    last_service_date: str | None = None
    last_runtime: int | None = Field(default=None, ge=0)
    estimated_duration_minutes: int | None = Field(default=None, ge=0)
    required_skills: str | None = None
    checklist_template: str | None = None
    planned_spare_parts: str | None = None
    status: PMPlanStatus | None = None
    tasks: list[PMPlanTaskCreate] | None = None


class PMPlan(PMPlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    updated_at: str
    equipment_name: str | None = None
    customer_id: int | None = None
    customer_name: str | None = None
    current_hours: int | None = None
    tasks: list[PMPlanTask] = Field(default_factory=list)


class PMSchedulerRunResult(BaseModel):
    generated: int = 0
    skipped: int = 0
    work_order_ids: list[int] = []
    messages: list[str] = []
