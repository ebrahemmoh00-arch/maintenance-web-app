from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["pending", "in_progress", "completed", "cancelled"]
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


class WorkOrder(WorkOrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: str
    updated_at: str
    customer_name: str | None = None
    equipment_name: str | None = None
    engineer_name: str | None = None


class DashboardStats(BaseModel):
    total_orders: int
    pending_orders: int
    completed_orders: int


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
