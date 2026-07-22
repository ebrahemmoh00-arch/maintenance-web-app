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
    description: str = ""
    category: str = ""
    manufacturer: str = ""
    location: str = ""
    parent_id: int | None = None
    asset_type: str = "Equipment"
    asset_level: str = "Equipment"
    asset_code: str = ""
    qr_code: str = ""
    barcode: str = ""
    criticality: str = "Medium"
    site: str = ""
    department: str = ""
    commission_date: str = ""
    installation_date: str = ""
    warranty_start: str = ""
    warranty_end: str = ""
    expected_life_years: int = Field(default=0, ge=0)
    replacement_cost: float = Field(default=0, ge=0)
    current_condition: str = ""
    maintenance_interval_hours: int = Field(default=1000, ge=0)
    maintenance_interval_days: int = Field(default=90, ge=0)
    current_hours: int = Field(default=0, ge=0)
    last_reading: float = Field(default=0, ge=0)
    current_reading: float = Field(default=0, ge=0)
    last_pm_date: str = ""
    next_pm_date: str = ""
    last_breakdown_date: str = ""
    last_repair_date: str = ""
    purchase_cost: float = Field(default=0, ge=0)
    total_maintenance_cost: float = Field(default=0, ge=0)
    spare_parts_cost: float = Field(default=0, ge=0)
    labor_cost: float = Field(default=0, ge=0)
    contractor_cost: float = Field(default=0, ge=0)
    last_maintenance_date: str = ""
    status: str = "Active"


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    customer_id: int | None = None
    name: str | None = None
    serial_number: str | None = None
    model: str | None = None
    description: str | None = None
    category: str | None = None
    manufacturer: str | None = None
    location: str | None = None
    parent_id: int | None = None
    asset_type: str | None = None
    asset_level: str | None = None
    asset_code: str | None = None
    qr_code: str | None = None
    barcode: str | None = None
    criticality: str | None = None
    site: str | None = None
    department: str | None = None
    commission_date: str | None = None
    installation_date: str | None = None
    warranty_start: str | None = None
    warranty_end: str | None = None
    expected_life_years: int | None = None
    replacement_cost: float | None = None
    current_condition: str | None = None
    maintenance_interval_hours: int | None = None
    maintenance_interval_days: int | None = None
    current_hours: int | None = None
    last_reading: float | None = None
    current_reading: float | None = None
    last_pm_date: str | None = None
    next_pm_date: str | None = None
    last_breakdown_date: str | None = None
    last_repair_date: str | None = None
    purchase_cost: float | None = None
    total_maintenance_cost: float | None = None
    spare_parts_cost: float | None = None
    labor_cost: float | None = None
    contractor_cost: float | None = None
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


class AssetHistory(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    event_type: str
    title: str
    description: str = ""
    source_module: str = ""
    source_record_id: str = ""
    actor_id: int | None = None
    metadata: str = ""
    created_at: str


class AssetEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    event_type: str
    severity: str = "info"
    status: str = "open"
    due_date: str = ""
    description: str = ""
    source_module: str = ""
    source_record_id: str = ""
    created_at: str
    resolved_at: str = ""


class AssetMeasurementBase(BaseModel):
    template_id: int | None = None
    measurement_type: str = Field(min_length=1)
    value: float = Field(default=0, ge=0)
    unit: str = ""
    reading_date: str = ""
    source_module: str = ""
    source_record_id: str = ""
    notes: str = ""
    measurement_table: str = ""
    table_snapshot: str = ""


class AssetMeasurementCreate(AssetMeasurementBase):
    pass


class AssetMeasurement(AssetMeasurementBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    created_at: str


class MeasurementTemplateBase(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    category: str = ""
    unit: str = ""
    table_schema: str = ""
    guidance_title: str = ""
    guidance_file_name: str = ""
    guidance_file_url: str = ""
    guidance_notes: str = ""
    ideal_values: str = ""
    created_by_id: int | None = None
    status: str = "active"


class MeasurementTemplateCreate(MeasurementTemplateBase):
    pass


class MeasurementTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    unit: str | None = None
    table_schema: str | None = None
    guidance_title: str | None = None
    guidance_file_name: str | None = None
    guidance_file_url: str | None = None
    guidance_notes: str | None = None
    ideal_values: str | None = None
    created_by_id: int | None = None
    status: str | None = None


class MeasurementTemplate(MeasurementTemplateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    updated_at: str


class AssetDocumentBase(BaseModel):
    document_type: str = "Manual"
    title: str = Field(min_length=1)
    file_name: str = ""
    file_url: str = ""
    description: str = ""
    uploaded_by_id: int | None = None


class AssetDocumentCreate(AssetDocumentBase):
    pass


class AssetDocument(AssetDocumentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    created_at: str


class AssetPhotoBase(BaseModel):
    photo_type: str = "Current Photo"
    title: str = Field(min_length=1)
    file_name: str = ""
    file_url: str = ""
    description: str = ""
    uploaded_by_id: int | None = None


class AssetPhotoCreate(AssetPhotoBase):
    pass


class AssetPhoto(AssetPhotoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    created_at: str


class AssetHealth(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    health_score: int = 100
    health_status: str = "Excellent"
    availability: float = 100
    mtbf: float = 0
    mttr: float = 0
    total_downtime_hours: float = 0
    maintenance_cost: float = 0
    pm_compliance: float = 100
    failure_frequency: int = 0
    open_work_orders: int = 0
    completed_pm: int = 0
    upcoming_pm: int = 0
    calculated_at: str
    metadata: str = ""


class ReliabilityCodeBase(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str = ""
    status: str = "active"


class ReliabilityCodeCreate(ReliabilityCodeBase):
    pass


class ReliabilityCodeUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    status: str | None = None


class ReliabilityCode(ReliabilityCodeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str


class FailureEventBase(BaseModel):
    asset_id: int
    failure_id: str = ""
    failure_datetime: str = ""
    failure_start: str = ""
    failure_end: str = ""
    detection_method: str = ""
    failure_type: str = ""
    failure_category: str = ""
    severity: str = "medium"
    operational_impact: str = ""
    breakdown_indicator: bool = False
    emergency_indicator: bool = False
    failure_description: str = ""
    problem_code_id: int | None = None
    failure_code_id: int | None = None
    cause_code_id: int | None = None
    remedy_code_id: int | None = None
    reported_by_id: int | None = None
    assigned_technician_id: int | None = None
    linked_work_order_id: int | None = None
    linked_pm_id: int | None = None
    status: str = "open"
    rca_status: str = "not_required"


class FailureEventCreate(FailureEventBase):
    pass


class FailureEventUpdate(BaseModel):
    asset_id: int | None = None
    failure_id: str | None = None
    failure_datetime: str | None = None
    failure_start: str | None = None
    failure_end: str | None = None
    detection_method: str | None = None
    failure_type: str | None = None
    failure_category: str | None = None
    severity: str | None = None
    operational_impact: str | None = None
    breakdown_indicator: bool | None = None
    emergency_indicator: bool | None = None
    failure_description: str | None = None
    problem_code_id: int | None = None
    failure_code_id: int | None = None
    cause_code_id: int | None = None
    remedy_code_id: int | None = None
    reported_by_id: int | None = None
    assigned_technician_id: int | None = None
    linked_work_order_id: int | None = None
    linked_pm_id: int | None = None
    status: str | None = None
    rca_status: str | None = None


class FailureEvent(FailureEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    updated_at: str = ""
    asset_name: str = ""
    work_order_title: str = ""


class DowntimeEventBase(BaseModel):
    asset_id: int
    start_time: str
    end_time: str = ""
    total_downtime_minutes: int = Field(default=0, ge=0)
    planned: bool = False
    production_lost: float = Field(default=0, ge=0)
    downtime_category: str = ""
    downtime_reason: str = ""
    linked_failure_id: int | None = None
    linked_work_order_id: int | None = None


class DowntimeEventCreate(DowntimeEventBase):
    pass


class DowntimeEventUpdate(BaseModel):
    asset_id: int | None = None
    start_time: str | None = None
    end_time: str | None = None
    total_downtime_minutes: int | None = None
    planned: bool | None = None
    production_lost: float | None = None
    downtime_category: str | None = None
    downtime_reason: str | None = None
    linked_failure_id: int | None = None
    linked_work_order_id: int | None = None


class DowntimeEvent(DowntimeEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    updated_at: str = ""
    asset_name: str = ""


class RootCauseAnalysisBase(BaseModel):
    failure_event_id: int
    problem: str = ""
    cause: str = ""
    root_cause: str = ""
    corrective_action: str = ""
    preventive_action: str = ""
    lessons_learned: str = ""
    verification_status: str = "pending"
    approval_status: str = "pending"
    approved_by_id: int | None = None
    approved_at: str = ""


class RootCauseAnalysisCreate(RootCauseAnalysisBase):
    pass


class RootCauseAnalysisUpdate(BaseModel):
    problem: str | None = None
    cause: str | None = None
    root_cause: str | None = None
    corrective_action: str | None = None
    preventive_action: str | None = None
    lessons_learned: str | None = None
    verification_status: str | None = None
    approval_status: str | None = None
    approved_by_id: int | None = None
    approved_at: str | None = None


class RootCauseAnalysis(RootCauseAnalysisBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    updated_at: str = ""


class FailureStatistics(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    mtbf_hours: float = 0
    mttr_hours: float = 0
    availability_percent: float = 100
    reliability_percent: float = 100
    failure_frequency: int = 0
    total_downtime_hours: float = 0
    downtime_percent: float = 0
    average_repair_time_hours: float = 0
    repair_cost: float = 0
    downtime_cost: float = 0
    calculated_at: str
    metadata: str = ""


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
