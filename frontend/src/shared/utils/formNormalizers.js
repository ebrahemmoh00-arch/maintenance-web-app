import { calculateIntervalDays, classifyAssetLevel } from "../../features/assets/utils/assetHierarchy.js";
import { todayIso } from "../../features/work-orders/utils/workOrderForms.js";
import { createRolePermissions, normalizeEmployeeRole, stringifyPermissions } from "../config/appConfig.jsx";

export function normalizeAssetForm(value) {
  const parentId = value.parent_id === "" || value.parent_id === 0 ? null : value.parent_id ?? null;
  const selectedType = value.asset_type || "Equipment";
  return {
    ...value,
    parent_id: parentId,
    asset_type: selectedType,
    asset_level: parentId ? classifyAssetLevel(selectedType, value.name) : "Site",
    status: value.status || "Active",
    criticality: value.criticality || "Medium"
  };
}

export function normalizePreventiveMaintenanceForm(value) {
  const intervalHours = Number(value.interval_hours || 0);
  return {
    ...value,
    interval_hours: intervalHours,
    interval_days: calculateIntervalDays(intervalHours),
    next_due_date: "",
    last_service_date: value.last_service_date || ""
  };
}

export function normalizePMPlanForm(value) {
  const recurrenceType = value.recurrence_type || "Runtime Hours";
  return {
    ...value,
    equipment_id: Number(value.equipment_id || 0),
    interval_value: Math.max(Number(value.interval_value || 1), 1),
    recurrence_type: recurrenceType,
    start_date: value.start_date || todayIso(),
    next_due_date: recurrenceType === "Runtime Hours" ? "" : value.next_due_date || value.start_date || todayIso(),
    next_due_runtime: recurrenceType === "Runtime Hours" ? Number(value.next_due_runtime || 0) : Number(value.next_due_runtime || 0),
    last_runtime: Number(value.last_runtime || 0),
    estimated_duration_minutes: Number(value.estimated_duration_minutes || 0),
    status: value.status || "active",
    priority: value.priority || "medium"
  };
}

export function normalizeEngineerForm(value) {
  const role = normalizeEmployeeRole(value.role);
  const jobTitle = value.job_title || value.specialty || "";
  return {
    ...value,
    employee_code: value.employee_code || "",
    job_title: jobTitle,
    specialty: jobTitle,
    department: value.department || "",
    work_location: value.work_location || "",
    supervisor: value.supervisor || "",
    role,
    status: value.status || "active",
    permissions: value.permissions || stringifyPermissions(createRolePermissions(role))
  };
}
