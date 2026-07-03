import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Box,
  Building2,
  Camera,
  CheckCircle2,
  Factory,
  GitBranch,
  Layers3,
  Clock3,
  Cpu,
  Eye,
  EyeOff,
  Filter,
  Globe2,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sun,
  TimerReset,
  Trash2,
  UploadCloud,
  UsersRound,
  Wrench
} from "lucide-react";

import { api } from "../api";
import Sidebar from "../shared/components/Sidebar";
import Panel from "../shared/components/Panel";
import DataTable from "../shared/components/DataTable";
import FormModal from "../shared/components/FormModal";
import MetricCard from "../shared/components/MetricCard";
import { BarChart, DonutChart, LineChart } from "../shared/components/Charts";
import EmptyState from "../shared/components/EmptyState";

const EMPLOYEE_ROLE_OPTIONS = ["admin", "engineer", "store_keeper", "viewer"];
const MANAGEMENT_JOB_TITLES = [
  "Branch Manager",
  "Operation & Maintenance Manager",
  "Site Manager"
];
const MANAGEMENT_JOB_TITLE_ALIASES = [
  ...MANAGEMENT_JOB_TITLES,
  "مدير فرع",
  "مدير تشغيل وصيانة",
  "مدير موقع"
];
const AUTH_STORAGE_KEYS = [
  "maintenance-authenticated",
  "maintenance-role",
  "maintenance-auth-user",
  "maintenance-auth-name",
  "maintenance-permissions",
  "maintenance-access-token",
  "maintenance-refresh-token"
];

function clearPersistentAuthStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function getAuthSession() {
  clearPersistentAuthStorage();
  return {
    authenticated: sessionStorage.getItem("maintenance-authenticated") === "true" && Boolean(sessionStorage.getItem("maintenance-access-token")),
    role: sessionStorage.getItem("maintenance-role") || "",
    username: sessionStorage.getItem("maintenance-auth-user") || "",
    name: sessionStorage.getItem("maintenance-auth-name") || "",
    permissions: sessionStorage.getItem("maintenance-permissions") || ""
  };
}

function saveAuthSession({ role, username, name, permissions, accessToken, refreshToken }) {
  clearPersistentAuthStorage();
  if (accessToken || refreshToken) {
    api.saveAuthTokens({ access_token: accessToken, refresh_token: refreshToken });
  }
  sessionStorage.setItem("maintenance-authenticated", "true");
  sessionStorage.setItem("maintenance-role", role);
  sessionStorage.setItem("maintenance-auth-user", username);
  sessionStorage.setItem("maintenance-auth-name", name);
  sessionStorage.setItem("maintenance-permissions", permissions || "");
}

function clearAuthSession() {
  api.clearAuthTokens();
  AUTH_STORAGE_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}

const resources = {
  customers: {
    title: "Customers / Locations",
    endpoint: "customers",
    blank: { name: "", contact_person: "", email: "", phone: "", address: "" },
    fields: [
      { key: "name", label: "Customer / Location Name" },
      { key: "contact_person", label: "Responsible Person" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address", type: "textarea" }
    ],
    columns: [
      { key: "name", label: "Customer / Location" },
      { key: "contact_person", label: "Responsible" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" }
    ]
  },
  engineers: {
    title: "Employees Management",
    endpoint: "engineers",
    blank: {
      employee_code: "",
      name: "",
      job_title: "",
      specialty: "",
      department: "",
      role: "viewer",
      phone: "",
      email: "",
      work_location: "",
      supervisor: "",
      username: "",
      password: "",
      permissions: "",
      status: "active"
    },
    fields: [
      { key: "employee_code", label: "Employee ID" },
      { key: "name", label: "Full Name" },
      { key: "job_title", label: "Job Title", type: "select", options: "jobTitles", allowAddOption: true, addPlaceholder: "Add Job Title", addLabel: "Add" },
      { key: "department", label: "Department" },
      { key: "role", label: "Role", type: "select", options: EMPLOYEE_ROLE_OPTIONS },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "work_location", label: "Work Location", type: "select", options: "customerLocations" },
      { key: "supervisor", label: "Supervisor" },
      { key: "username", label: "Username" },
      { key: "password", label: "Password" },
      { key: "status", label: "Status", type: "select", options: ["active", "off_duty", "inactive"] }
    ],
    columns: [
      { key: "employee_code", label: "Employee ID" },
      { key: "name", label: "Full Name" },
      { key: "job_title", label: "Job Title" },
      { key: "department", label: "Department" },
      { key: "role", label: "Role" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "work_location", label: "Work Location" },
      { key: "status", label: "Availability", render: (row) => <StatusBadge value={row.status} /> }
    ]
  },
  equipment: {
    title: "Assets",
    endpoint: "equipment",
    blank: {
      customer_id: "",
      name: "",
      serial_number: "",
      model: "",
      description: "",
      category: "",
      manufacturer: "",
      location: "",
      parent_id: null,
      asset_type: "Equipment",
      asset_level: "Equipment",
      asset_code: "",
      qr_code: "",
      barcode: "",
      criticality: "Medium",
      site: "",
      department: "",
      commission_date: "",
      installation_date: "",
      warranty_start: "",
      warranty_end: "",
      expected_life_years: 0,
      replacement_cost: 0,
      current_condition: "",
      maintenance_interval_hours: 1000,
      maintenance_interval_days: 90,
      current_hours: 0,
      last_reading: 0,
      current_reading: 0,
      last_pm_date: "",
      next_pm_date: "",
      last_breakdown_date: "",
      last_repair_date: "",
      purchase_cost: 0,
      total_maintenance_cost: 0,
      spare_parts_cost: 0,
      labor_cost: 0,
      contractor_cost: 0,
      last_maintenance_date: "",
      status: "Active"
    },
    fields: [
      { key: "customer_id", label: "Customer / Location", type: "select", options: "customers", number: true },
      { key: "parent_id", label: "Parent Asset", type: "select", options: "assetParents", number: true },
      { key: "name", label: "Asset Name" },
      { key: "asset_type", label: "Asset Type", type: "select", options: ["Site", "Area / Department", "Cooling System", "Pump / Motor", "Generator", "Bearing / Seal", "Component"] },
      { key: "asset_level", label: "Hierarchy Level", type: "select", options: ["Site", "Area / Department", "System", "Equipment", "Component"] },
      { key: "asset_code", label: "Asset Code" },
      { key: "serial_number", label: "Serial Number" },
      { key: "model", label: "Model" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "location", label: "Asset Location" },
      { key: "site", label: "Site" },
      { key: "department", label: "Department" },
      { key: "qr_code", label: "QR Code" },
      { key: "barcode", label: "Barcode" },
      { key: "current_hours", label: "Current Hours / Running Hours", type: "number" },
      { key: "current_reading", label: "Current Reading", type: "number" },
      { key: "last_reading", label: "Last Reading", type: "number" },
      { key: "criticality", label: "Criticality", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { key: "current_condition", label: "Current Condition", type: "select", options: ["Excellent", "Good", "Warning", "Critical", "Needs Inspection"] },
      { key: "commission_date", label: "Commission Date", type: "date" },
      { key: "installation_date", label: "Installation Date", type: "date" },
      { key: "warranty_start", label: "Warranty Start", type: "date" },
      { key: "warranty_end", label: "Warranty End", type: "date" },
      { key: "expected_life_years", label: "Expected Life (Years)", type: "number" },
      { key: "purchase_cost", label: "Purchase Cost", type: "number" },
      { key: "replacement_cost", label: "Replacement Cost", type: "number" },
      { key: "total_maintenance_cost", label: "Total Maintenance Cost", type: "number" },
      { key: "spare_parts_cost", label: "Spare Parts Cost", type: "number" },
      { key: "labor_cost", label: "Labor Cost", type: "number" },
      { key: "contractor_cost", label: "Contractor Cost", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Down", "Maintenance", "operational", "warning", "down"] }
    ],
    columns: [
      { key: "asset_code", label: "Asset Code" },
      { key: "name", label: "Asset" },
      { key: "asset_level", label: "Level" },
      { key: "asset_type", label: "Type" },
      { key: "serial_number", label: "Serial" },
      { key: "location", label: "Location" },
      { key: "criticality", label: "Criticality" },
      { key: "current_hours", label: "Run Hours" },
      { key: "next_maintenance_date", label: "Next Maintenance" },
      { key: "maintenance_alert", label: "Alert", render: (row) => <MaintenanceBadge value={row.maintenance_alert} /> },
      { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
    ]
  },
  "work-orders": {
    title: "Work Orders",
    endpoint: "work-orders",
    blank: {
      title: "",
      description: "",
      customer_id: "",
      equipment_id: "",
      engineer_id: "",
      scheduled_date: "",
      due_date: "",
      status: "pending",
      priority: "medium",
      service_hours: 0,
      notes: ""
    },
    fields: [
      { key: "title", label: "Title" },
      { key: "customer_id", label: "Department", type: "select", options: "customers", number: true },
      { key: "equipment_id", label: "Asset", type: "select", options: "equipment", number: true },
      { key: "engineer_id", label: "Resource", type: "select", options: "engineers", number: true },
      { key: "scheduled_date", label: "Scheduled Date", type: "date" },
      { key: "due_date", label: "Due Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["draft", "new", "pending", "assigned", "accepted", "in_progress", "waiting_for_parts", "completed", "pending_supervisor_review", "approved", "closed", "rejected", "cancelled", "on_hold", "overdue"] },
      { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"] },
      { key: "service_hours", label: "Service Hours", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" }
    ],
    columns: [
      { key: "title", label: "Work Order" },
      { key: "customer_name", label: "Department" },
      { key: "equipment_name", label: "Asset" },
      { key: "engineer_name", label: "Resource" },
      { key: "scheduled_date", label: "Schedule" },
      { key: "status", label: "Status", render: (row) => <WorkOrderStatus value={row.status} priority={row.priority} /> },
      { key: "priority", label: "Priority", render: (row) => <PriorityBadge value={row.priority} /> }
    ]
  },
  inventory: {
    title: "Inventory",
    endpoint: "inventory",
    blank: { part_number: "", name: "", category: "", stock_quantity: 0, minimum_quantity: 1, unit: "pcs", location: "", linked_work_order_id: null },
    fields: [
      { key: "part_number", label: "Part Number" },
      { key: "name", label: "Part Name" },
      { key: "category", label: "Category" },
      { key: "stock_quantity", label: "Stock Quantity", type: "number" },
      { key: "minimum_quantity", label: "Minimum Quantity", type: "number" },
      { key: "unit", label: "Unit" },
      { key: "location", label: "Store Location" },
      { key: "linked_work_order_id", label: "Linked Work Order", type: "select", options: "work-orders", number: true }
    ],
    columns: [
      { key: "part_number", label: "Part No." },
      { key: "name", label: "Spare Part" },
      { key: "stock_quantity", label: "Stock" },
      { key: "minimum_quantity", label: "Min" },
      { key: "unit", label: "Unit" },
      { key: "stock_alert", label: "Alert", render: (row) => <StockBadge value={row.stock_alert} /> },
      { key: "linked_work_order_title", label: "Linked Work Order" }
    ]
  },
  "preventive-maintenance": {
    title: "Preventive Maintenance",
    endpoint: "preventive-maintenance",
    blank: { equipment_id: "", task_name: "", interval_hours: 1000, interval_days: 42, last_service_hours: 0, last_service_date: "", next_due_date: "", status: "active" },
    fields: [
      { key: "equipment_id", label: "Asset", type: "select", options: "equipment", number: true },
      { key: "task_name", label: "PM Task" },
      { key: "interval_hours", label: "Interval Hours", type: "number" },
      { key: "last_service_hours", label: "Last Service Hours", type: "number" },
      { key: "last_service_date", label: "Maintenance Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["active", "paused", "completed"] }
    ],
    columns: [
      { key: "task_name", label: "PM Task" },
      { key: "equipment_name", label: "Asset" },
      { key: "hours_until_due", label: "Hours Remaining" },
      { key: "days_until_due", label: "Days Remaining" },
      { key: "next_due_date", label: "Next Due" },
      { key: "pm_alert", label: "Alert", render: (row) => <MaintenanceBadge value={row.pm_alert} /> },
      { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
    ]
  },
  "pm-plans": {
    title: "PM Plans",
    endpoint: "pm-plans",
    blank: {
      equipment_id: "",
      name: "",
      description: "",
      priority: "medium",
      recurrence_type: "Runtime Hours",
      interval_value: 1000,
      start_date: todayIso(),
      next_due_date: "",
      next_due_runtime: 0,
      last_service_date: "",
      last_runtime: 0,
      estimated_duration_minutes: 60,
      required_skills: "",
      checklist_template: "",
      planned_spare_parts: "",
      status: "active"
    },
    fields: [
      { key: "equipment_id", label: "Asset", type: "select", options: "equipment", number: true },
      { key: "name", label: "Plan Name" },
      { key: "recurrence_type", label: "Recurrence Type", type: "select", options: ["Daily", "Weekly", "Monthly", "Runtime Hours"] },
      { key: "interval_value", label: "Interval", type: "number" },
      { key: "start_date", label: "Start Date", type: "date" },
      { key: "next_due_date", label: "Next Due Date", type: "date" },
      { key: "next_due_runtime", label: "Next Due Runtime", type: "number" },
      { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"] },
      { key: "status", label: "Status", type: "select", options: ["active", "paused"] },
      { key: "estimated_duration_minutes", label: "Estimated Duration (Minutes)", type: "number" },
      { key: "required_skills", label: "Required Skills" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "checklist_template", label: "Checklist Template", type: "textarea" },
      { key: "planned_spare_parts", label: "Planned Spare Parts", type: "textarea" }
    ],
    columns: [
      { key: "name", label: "PM Plan" },
      { key: "equipment_name", label: "Asset" },
      { key: "recurrence_type", label: "Recurrence" },
      { key: "interval_value", label: "Interval" },
      { key: "next_due_date", label: "Next Due Date" },
      { key: "next_due_runtime", label: "Next Due Runtime" },
      { key: "priority", label: "Priority", render: (row) => <PriorityBadge value={row.priority} /> },
      { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
    ]
  }
};

const PERMISSION_ACTIONS = [
  { key: "view", label: "View" },
  { key: "add", label: "Add" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" }
];

const PERMISSION_MODULES = [
  { key: "customers", label: "Locations / Customers", resourceKey: "customers" },
  { key: "equipment", label: "Assets / Equipment", resourceKey: "equipment" },
  { key: "engineers", label: "Resources / Users", resourceKey: "engineers" },
  { key: "work-orders", label: "Work Orders", resourceKey: "work-orders" },
  { key: "preventive-maintenance", label: "Preventive Maintenance", resourceKey: "preventive-maintenance" },
  { key: "pm-plans", label: "PM Plans", resourceKey: "pm-plans" },
  { key: "inventory", label: "Inventory / Spare Parts", resourceKey: "inventory" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "audit-logs", label: "Audit Logs" },
  { key: "settings", label: "Settings" }
];

function createDefaultPermissions() {
  return PERMISSION_MODULES.reduce((acc, module) => {
    acc[module.key] = { view: module.key !== "audit-logs", add: false, edit: false, delete: false };
    return acc;
  }, {});
}

function createFullPermissions() {
  return PERMISSION_MODULES.reduce((acc, module) => {
    acc[module.key] = { view: true, add: true, edit: true, delete: true };
    return acc;
  }, {});
}

function normalizeEmployeeRole(role = "viewer") {
  const normalized = String(role || "viewer").toLowerCase().trim().replaceAll(" ", "_").replaceAll("-", "_");
  if (normalized === "super_admin") return "admin";
  if (normalized === "user") return "viewer";
  if (["technician", "supervisor", "maintenance_manager", "branch_manager"].includes(normalized)) return "engineer";
  if (normalized === "storekeeper") return "store_keeper";
  return EMPLOYEE_ROLE_OPTIONS.includes(normalized) ? normalized : "viewer";
}

function createRolePermissions(role = "viewer") {
  const normalized = normalizeEmployeeRole(role);
  if (normalized === "admin") return createFullPermissions();
  const permissions = createDefaultPermissions();
  if (normalized === "engineer") {
    permissions.equipment = { view: true, add: false, edit: true, delete: false };
    permissions["work-orders"] = { view: true, add: true, edit: true, delete: false };
    permissions["preventive-maintenance"] = { view: true, add: false, edit: true, delete: false };
    permissions["pm-plans"] = { view: true, add: false, edit: false, delete: false };
    permissions.inventory = { view: true, add: false, edit: false, delete: false };
  }
  if (normalized === "store_keeper") {
    permissions.inventory = { view: true, add: true, edit: true, delete: true };
    permissions["work-orders"] = { view: true, add: false, edit: false, delete: false };
  }
  return permissions;
}

function parsePermissions(value, role = "user") {
  const normalizedRole = normalizeEmployeeRole(role);
  if (normalizedRole === "admin") return createFullPermissions();
  let parsed = {};
  if (value) {
    try {
      parsed = typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      parsed = {};
    }
  }
  const fallback = createRolePermissions(normalizedRole);
  return PERMISSION_MODULES.reduce((acc, module) => {
    acc[module.key] = { ...fallback[module.key], ...(parsed?.[module.key] || {}) };
    return acc;
  }, {});
}

function stringifyPermissions(permissions) {
  return JSON.stringify(parsePermissions(permissions));
}

function hasPermission(user, moduleKey, action = "view") {
  if (normalizeEmployeeRole(user?.role) === "admin") return true;
  const permissions = parsePermissions(user?.permissions, user?.role);
  return Boolean(permissions?.[moduleKey]?.[action]);
}

function isVisiblePageForUser(user, page) {
  if (["dashboard", "schedule"].includes(page)) return true;
  if (page === "access-control") return normalizeEmployeeRole(user?.role) === "admin";
  if (page === "customers") return hasPermission(user, "customers", "view");
  if (page === "equipment") return hasPermission(user, "equipment", "view");
  if (page === "engineers") return hasPermission(user, "engineers", "view");
  if (page === "work-orders") return hasPermission(user, "work-orders", "view");
  if (page === "pm-plans") return hasPermission(user, "pm-plans", "view");
  if (page === "inventory") return hasPermission(user, "inventory", "view");
  if (page === "reports") return hasPermission(user, "reports", "view");
  if (page === "settings") return hasPermission(user, "settings", "view");
  return true;
}

const AR = {
  "Professional Industrial Maintenance Dashboard": "لوحة صيانة صناعية احترافية",
  "Executive Dashboard": "لوحة التحكم التنفيذية",
  Customers: "العملاء",
  "Equipment Management": "إدارة المعدات",
  Technicians: "الفنيون",
  "Work Orders": "أوامر العمل",
  "Maintenance Schedule": "جدول الصيانة",
  "Reports & Analytics": "التقارير والتحليلات",
  Settings: "الإعدادات",
  Notifications: "الإشعارات",
  Refresh: "تحديث",
  "Add Work Order": "إضافة أمر عمل",
  "Total Active Work Orders": "إجمالي أوامر العمل النشطة",
  "Equipment Breakdowns": "أعطال المعدات",
  "Completed This Week": "المكتمل هذا الأسبوع",
  "Available Technicians": "الفنيون المتاحون",
  "Average Downtime": "متوسط التوقف",
  "Open operational workload": "الأعمال التشغيلية المفتوحة",
  "Down or due-now assets": "معدات متوقفة أو مستحقة الآن",
  "Closed maintenance orders": "أوامر صيانة مغلقة",
  "Ready for assignment": "جاهزون للتكليف",
  "Estimated operational impact": "تأثير تشغيلي تقديري",
  "Smart Maintenance Alerts": "تنبيهات الصيانة الذكية",
  "Automatic notifications based on service hours and next maintenance date.": "تنبيهات تلقائية حسب ساعات التشغيل وتاريخ الصيانة القادم.",
  "Next maintenance": "الصيانة القادمة",
  "Not set": "غير محدد",
  "No maintenance alerts": "لا توجد تنبيهات صيانة",
  "All monitored equipment is within maintenance limits.": "كل المعدات المراقبة داخل حدود الصيانة.",
  "Maintenance Trends": "اتجاهات الصيانة",
  "Work order volume over scheduled dates.": "حجم أوامر العمل حسب التواريخ المجدولة.",
  "Breakdown vs Planned": "الأعطال مقابل الصيانة المخططة",
  "Ratio based on priority and asset condition.": "النسبة حسب الأولوية وحالة المعدة.",
  "Downtime Distribution": "توزيع التوقف",
  "Asset load grouped by maintenance exposure.": "تحميل المعدات حسب مستوى التعرض للصيانة.",
  "Engineer Workload": "أعمال المهندسين",
  "Engineer name vs number of work orders.": "العلاقة بين اسم المهندس وعدد أوامر العمل.",
  "Technician Workload": "أعمال الفنيين",
  "Technician name vs number of work orders.": "العلاقة بين اسم الفني وعدد أوامر العمل.",
  "Equipment Maintenance Time": "وقت صيانة المعدات",
  "Equipment name vs total maintenance duration.": "العلاقة بين اسم المعدة وإجمالي مدة الصيانة.",
  Unit: "الوحدة",
  Orders: "أوامر",
  Minutes: "دقائق",
  Unassigned: "غير محدد",
  "Priority Work Orders": "أوامر العمل ذات الأولوية",
  "Structured maintenance workload with visible status, priority, and technician assignment.": "عبء عمل صيانة منظم مع عرض الحالة والأولوية والفني المكلف.",
  "Create Order": "إنشاء أمر",
  "No active work orders.": "لا توجد أوامر عمل نشطة.",
  "Equipment Health": "حالة المعدات",
  "Maintenance interval load across critical assets.": "تحميل فترات الصيانة للمعدات الحرجة.",
  "Next": "التالي",
  "Not configured": "غير مهيأ",
  "No equipment": "لا توجد معدات",
  "Add equipment to monitor operating health.": "أضف معدات لمتابعة الحالة التشغيلية.",
  "Create, update, and control operational records through the existing REST API.": "إنشاء وتعديل وإدارة السجلات التشغيلية من خلال REST API الحالية.",
  "New Record": "سجل جديد",
  "records yet.": "حتى الآن.",
  "Total Orders": "إجمالي الأوامر",
  Alerts: "التنبيهات",
  "Show Alerts": "عرض التنبيهات",
  "Open alert list": "فتح قائمة التنبيهات",
  "Assets Monitored": "المعدات المراقبة",
  "Presentation-ready system overview. Operational settings can be extended without changing current API contracts.": "نظرة عامة جاهزة للعرض. يمكن توسيع الإعدادات دون تغيير عقود الـ API الحالية.",
  "Access Control": "التحكم في الصلاحيات",
  "Ready for role-based permissions when authentication is added.": "جاهز لصلاحيات حسب الدور عند إضافة تسجيل الدخول.",
  "API Health": "حالة الـ API",
  "Frontend is connected to the FastAPI maintenance service.": "الواجهة متصلة بخدمة FastAPI للصيانة.",
  "Configured Assets": "المعدات المسجلة",
  "equipment records available for maintenance control.": "سجل معدات متاح لإدارة الصيانة.",
  "Calendar Schedule": "جدول التقويم",
  "Work orders grouped by scheduled date for fast maintenance planning.": "أوامر العمل مجمعة حسب التاريخ لتخطيط سريع للصيانة.",
  "No scheduled work orders": "لا توجد أوامر عمل مجدولة",
  "Scheduled maintenance will appear in this calendar view.": "ستظهر الصيانة المجدولة في عرض التقويم.",
  Unscheduled: "غير مجدول",
  "No data": "لا توجد بيانات",
  Planned: "مخطط",
  Breakdown: "عطل",
  Normal: "طبيعي",
  Warning: "تحذير",
  Critical: "حرج",
  Assets: "معدات",
  Customer: "العميل",
  Contact: "جهة الاتصال",
  Email: "البريد الإلكتروني",
  Phone: "الهاتف",
  "Customer Name": "اسم العميل",
  "Contact Person": "مسؤول التواصل",
  Address: "العنوان",
  "Technician Name": "اسم الفني",
  Technician: "الفني",
  Specialty: "التخصص",
  Status: "الحالة",
  Availability: "الإتاحة",
  Asset: "المعدة",
  Serial: "الرقم المسلسل",
  Location: "الموقع",
  "Run Hours": "ساعات التشغيل",
  "Next Maintenance": "الصيانة القادمة",
  Alert: "تنبيه",
  "Equipment Name": "اسم المعدة",
  "Serial Number": "الرقم المسلسل",
  Model: "الموديل",
  "Interval Hours": "فاصل الساعات",
  "Interval Days": "فاصل الأيام",
  "Current Hours": "الساعات الحالية",
  "Last Maintenance Date": "آخر تاريخ صيانة",
  Title: "العنوان",
  Equipment: "المعدة",
  "Scheduled Date": "تاريخ الجدولة",
  "Due Date": "تاريخ الاستحقاق",
  Priority: "الأولوية",
  "Service Hours": "ساعات الخدمة",
  Description: "الوصف",
  Notes: "ملاحظات",
  "Work Order": "أمر العمل",
  Schedule: "الجدول",
  "No records found.": "لا توجد سجلات.",
  Actions: "الإجراءات",
  Edit: "تعديل",
  Delete: "حذف",
  Close: "إغلاق",
  Cancel: "إلغاء",
  "Save Changes": "حفظ التغييرات",
  Select: "اختيار",
  "Maintenance Record": "سجل الصيانة",
  EditMode: "تعديل",
  CreateMode: "إنشاء",
  Language: "اللغة",
  English: "إنجليزي",
  Arabic: "عربي"
  ,
  "Maintenance Control Access": "الدخول لنظام إدارة الصيانة",
  "Secure sign-in for maintenance operations dashboard.": "تسجيل دخول آمن للوحة عمليات الصيانة.",
  Password: "كلمة المرور",
  "Sign In": "تسجيل الدخول",
  Logout: "تسجيل الخروج",
  "Plant Maintenance Command": "مركز قيادة صيانة المحطة",
  "Maintenance Notifications": "إشعارات الصيانة",
  "No notifications": "لا توجد إشعارات",
  "All equipment is currently within the configured limits.": "كل المعدات حاليًا داخل الحدود المحددة.",
  "View dashboard alerts": "عرض تنبيهات لوحة التحكم",
  "Back to Equipment": "رجوع للمعدات",
  "Create a work order using the current service hours from the maintenance record.": "إنشاء أمر عمل باستخدام ساعات التشغيل الحالية من سجل الصيانة.",
  "Document Code": "كود المستند",
  "Issue No": "رقم الإصدار",
  "Issue Date": "تاريخ الإصدار",
  "W.O No": "رقم أمر العمل",
  "THE WORK ORDER IS ISSUED BY SHIFT ENGINEER": "أمر العمل صادر بواسطة مهندس الوردية",
  "FOR REQUESTING AND ASSIGN THE TASK FOR": "لطلب وتكليف المهمة إلى",
  "The Names of appointed Members to perform the task are": "أسماء الأعضاء المكلفين بتنفيذ المهمة",
  "The Description & details of the required task to be done / undertaken is": "وصف وتفاصيل المهمة المطلوبة",
  "RH / Service Hours": "ساعات التشغيل",
  "The Start Of Task": "بداية المهمة",
  "The End of The Task": "نهاية المهمة",
  "Starting Time is": "وقت البداية",
  "Finished Time is": "وقت الانتهاء",
  "Day in": "التاريخ",
  "Type of maintenance": "نوع الصيانة",
  "Work Order Executor Name": "اسم منفذ أمر العمل",
  "Work Order Holder Name": "اسم حامل أمر العمل",
  "Executive Name": "اسم المنفذ",
  "Shift Engineer Name": "اسم مهندس الوردية",
  "Job Title": "المسمى الوظيفي",
  "Signature": "التوقيع",
  "Site Preparation": "تجهيز الموقع",
  "Recommendation": "التوصية",
  "Spare parts if required": "قطع الغيار إن وجدت",
  "Safety Responsible": "مسؤول السلامة",
  "Save Work Order": "حفظ أمر العمل",
  "Saved Work Orders": "أوامر العمل المحفوظة",
  "Edit Selected": "تعديل المحدد",
  "Delete Selected": "حذف المحدد",
  "Export PDF": "تصدير PDF",
  "New Work Order": "أمر عمل جديد",
  Duration: "المدة",
  Date: "التاريخ",
  "Techn.": "الفني",
  "Start Task": "بدء المهمة",
  "Finish Task": "إنهاء المهمة",
  "Server stamped": "مسجل من السيرفر",
  "Digital Signature": "التوقيع الإلكتروني",
  "Clear Signature": "مسح التوقيع",
  "Add member": "إضافة فرد",
  "Before Maintenance Photos": "صور قبل الصيانة",
  "After Maintenance Photos": "صور بعد الصيانة",
  "Upload Photos": "رفع صور",
  "Scan Equipment QR": "مسح QR للمعدة",
  "Open Camera": "فتح الكاميرا",
  "Close Camera": "إغلاق الكاميرا",
  "Inventory-linked spare parts": "قطع غيار مرتبطة بالمخزن",
  "Part name": "اسم القطعة",
  Qty: "الكمية",
  "Add part": "إضافة قطعة",
  "Manager approval notification sent": "تم إرسال إشعار اعتماد للمدير",
  "Browser notifications are not enabled.": "إشعارات المتصفح غير مفعلة."
};

Object.assign(AR, {
  Username: "اسم المستخدم",
  "Invalid username or password": "Invalid username or password",
  "Admin credentials": "بيانات دخول المدير",
  "Full Admin Access": "صلاحية إدارية كاملة",
  "View, add, edit, and delete all maintenance records.": "عرض وإضافة وتعديل وحذف كل سجلات الصيانة.",
  "Customers / Locations": "العملاء / الأماكن",
  "Customer / Location": "العميل / المكان",
  "Customer / Location Name": "اسم العميل / المكان",
  "Customer / location to asset structure for fast plant navigation.": "ربط العميل أو المكان بالمعدات لسهولة التنقل داخل المحطة.",
  "No customers / locations": "لا يوجد عملاء أو أماكن",
  "Add customers or places first, then assign assets to them.": "أضف العملاء أو الأماكن أولاً، ثم اربط المعدات بها.",
  "Permission Role": "نوع الصلاحية",
  "View Only Access": "صلاحية مشاهدة فقط",
  "You are signed in with view-only permissions. Editing, adding, deleting, and saving are available for admin only.": "تم تسجيل الدخول بصلاحية مشاهدة فقط. الإضافة والتعديل والحذف والحفظ متاحة للمدير فقط.",
  "Admin Only": "للمدير فقط",
  "Open Selected": "فتح المحدد",
  "Viewing Saved Work Order": "عرض أمر عمل محفوظ",
  "All Equipment": "كل المعدات",
  "All Dates": "كل التواريخ",
  "Select equipment first": "اختر المعدة أولاً",
  "Filter by equipment then date to reach a saved work order faster.": "اختر المعدة ثم التاريخ للوصول إلى أمر الشغل المحفوظ بسرعة."
});

function tr(language, text) {
  return language === "ar" ? AR[text] || text : text;
}

function getAlertKey(alert) {
  return alert.alert_key || `${alert.alert_type || "asset"}-${alert.equipment_id ?? alert.pm_id ?? alert.inventory_id ?? alert.equipment_name}`;
}

function buildSmartAlerts(equipmentAlerts, inventoryItems, pmTasks) {
  const assetAlerts = equipmentAlerts.map((alert) => ({
    ...alert,
    alert_key: `asset-${alert.equipment_id}`,
    alert_type: "asset"
  }));

  const pmAlerts = pmTasks
    .filter((task) => task.status === "active" && task.pm_alert && task.pm_alert !== "OK")
    .map((task) => {
      const reasons = [];
      if (task.hours_until_due !== null && task.hours_until_due !== undefined) {
        reasons.push(task.hours_until_due <= 0 ? "PM service hours reached" : `${task.hours_until_due} PM hours remaining`);
      }
      if (task.days_until_due !== null && task.days_until_due !== undefined) {
        reasons.push(task.days_until_due <= 0 ? "PM due date reached" : `${task.days_until_due} PM days remaining`);
      }
      return {
        alert_key: `pm-${task.id}`,
        alert_type: "pm",
        equipment_id: task.equipment_id,
        equipment_name: `${task.task_name} - ${task.equipment_name || "Asset"}`,
        serial_number: "Preventive Maintenance",
        location: "",
        alert_level: task.pm_alert,
        reason: reasons.join("; ") || "Preventive maintenance threshold is approaching",
        next_maintenance_date: task.next_due_date || null,
        days_until_maintenance: task.days_until_due,
        hours_until_maintenance: task.hours_until_due
      };
    });

  const stockAlerts = inventoryItems
    .filter((item) => item.stock_alert && item.stock_alert !== "OK")
    .map((item) => ({
      alert_key: `stock-${item.id}`,
      alert_type: "inventory",
      inventory_id: item.id,
      equipment_name: item.name,
      serial_number: item.part_number || "Spare Part",
      location: item.location || "",
      alert_level: item.stock_alert === "OUT OF STOCK" ? "DUE NOW" : "UPCOMING",
      reason:
        item.stock_alert === "OUT OF STOCK"
          ? "Spare part is out of stock"
          : `${item.stock_quantity} ${item.unit || "pcs"} remaining, minimum ${item.minimum_quantity}`,
      next_maintenance_date: null,
      days_until_maintenance: null,
      hours_until_maintenance: null
    }));

  return [...assetAlerts, ...pmAlerts, ...stockAlerts];
}

function localizedConfig(resourceKey, language) {
  const config = resources[resourceKey];
  return {
    ...config,
    title: tr(language, config.title),
    fields: config.fields.map((field) => ({
      ...field,
      label: tr(language, field.label),
      addPlaceholder: field.addPlaceholder ? tr(language, field.addPlaceholder) : field.addPlaceholder,
      addLabel: field.addLabel ? tr(language, field.addLabel) : field.addLabel,
      options: Array.isArray(field.options)
        ? field.options.map((option) => ({ value: option, label: valueLabel(option, language) }))
        : field.options
    })),
    columns: config.columns.map((column) => {
      const localized = { ...column, label: tr(language, column.label) };
      if (resourceKey === "work-orders" && column.key === "status") {
        localized.render = (row) => <WorkOrderStatus value={row.status} priority={row.priority} language={language} />;
      }
      if (resourceKey === "work-orders" && column.key === "priority") {
        localized.render = (row) => <PriorityBadge value={row.priority} language={language} />;
      }
      if (column.key === "status" && resourceKey !== "work-orders") {
        localized.render = (row) => <StatusBadge value={row.status} language={language} />;
      }
      if (column.key === "maintenance_alert") {
        localized.render = (row) => <MaintenanceBadge value={row.maintenance_alert} language={language} />;
      }
      if (column.key === "pm_alert") {
        localized.render = (row) => <MaintenanceBadge value={row.pm_alert} language={language} />;
      }
      if (column.key === "stock_alert") {
        localized.render = (row) => <StockBadge value={row.stock_alert} language={language} />;
      }
      return localized;
    })
  };
}

function tableLabels(language) {
  return {
    actions: tr(language, "Actions"),
    edit: tr(language, "Edit"),
    delete: tr(language, "Delete")
  };
}

export default function MaintenanceConsole({ initialPage = "" }) {
  const [active, setActive] = useState(() => {
    const page = initialPage || new URLSearchParams(window.location.search).get("page");
    return ["dashboard", "customers", "equipment", "engineers", "work-orders", "pm-plans", "schedule", "inventory", "reports", "settings", "access-control"].includes(page) ? page : "dashboard";
  });
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [dashboardAlertsOpen, setDashboardAlertsOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    return queryLanguage === "ar" || localStorage.getItem("maintenance-language") === "ar" ? "ar" : "en";
  });
  const [authenticated, setAuthenticated] = useState(() => {
    const auth = getAuthSession();
    return auth.authenticated && EMPLOYEE_ROLE_OPTIONS.includes(normalizeEmployeeRole(auth.role)) && Boolean(auth.username);
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const auth = getAuthSession();
    return {
      username: auth.username,
      name: auth.name,
      role: auth.role,
      permissions: auth.permissions
    };
  });
  const [loginValue, setLoginValue] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState({ customers: [], engineers: [], equipment: [], "work-orders": [], inventory: [], "preventive-maintenance": [], "pm-plans": [], "job-titles": [], "audit-logs": [] });
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total_orders: 0, pending_orders: 0, completed_orders: 0 });
  const [backendReliability, setBackendReliability] = useState(null);
  const [auditLogsLoaded, setAuditLogsLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [formValue, setFormValue] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const employeeRows = useMemo(() => businessEmployees(data.engineers), [data.engineers]);
  const displayData = useMemo(() => ({ ...data, engineers: employeeRows }), [data, employeeRows]);

  useEffect(() => {
    if (initialPage) {
      setActive(normalizePage(initialPage));
    }
  }, [initialPage]);

  const options = useMemo(
    () => ({
      customers: data.customers.map((item) => ({ value: item.id, label: item.name })),
      customerLocations: [{ value: "Available for All Sites", label: "Available for All Sites" }, ...data.customers.map((item) => ({ value: item.name, label: item.name }))],
      engineers: employeeRows.map((item) => ({ value: item.id, label: item.name })),
      equipment: data.equipment.map((item) => ({ value: item.id, label: item.name })),
      jobTitles: jobTitleOptions(data["job-titles"], employeeRows),
      assetParents: data.equipment
        .filter((item) => !modal?.id || Number(item.id) !== Number(modal.id))
        .map((item) => ({ value: item.id, label: `${item.asset_code || `AST-${item.id}`} - ${item.name}` })),
      "work-orders": data["work-orders"].map((item) => ({ value: item.id, label: item.title }))
    }),
    [data, employeeRows, modal?.id]
  );

  async function loadAll(options = {}) {
    const silent = Boolean(options?.silent);
    if (!silent) setLoading(true);
    setError("");
    try {
      const [customers, engineers, equipment, workOrders, inventory, preventiveMaintenance, pmPlans, jobTitles, dashboard, maintenanceAlerts, reliability] = await Promise.all([
        api.list("customers"),
        api.list("engineers"),
        api.list("equipment"),
        api.list("work-orders"),
        api.list("inventory"),
        api.list("preventive-maintenance"),
        api.list("pm-plans"),
        api.list("job-titles"),
        api.stats(),
        api.alerts(),
        api.dashboardReliability().catch(() => null)
      ]);
      setData((current) => ({ ...current, customers, engineers, equipment, "work-orders": workOrders, inventory, "preventive-maintenance": preventiveMaintenance, "pm-plans": pmPlans, "job-titles": jobTitles }));
      setAlerts(buildSmartAlerts(maintenanceAlerts, inventory, preventiveMaintenance));
      setStats(dashboard);
      setBackendReliability(reliability);
      const storedUsername = sessionStorage.getItem("maintenance-auth-user") || "";
      if (storedUsername) {
        const refreshedUser = engineers.find((user) => user.username === storedUsername);
        if (refreshedUser) {
          const role = normalizeEmployeeRole(refreshedUser.role);
          const permissions = refreshedUser.permissions || stringifyPermissions(createRolePermissions(role));
          sessionStorage.setItem("maintenance-permissions", permissions);
          setCurrentUser({
            username: refreshedUser.username,
            name: refreshedUser.name,
            role,
            permissions
          });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadAuditLogs() {
    if (!hasPermission(currentUser, "audit-logs", "view")) return;
    try {
      const auditLogs = await api.list("audit-logs");
      setData((current) => ({ ...current, "audit-logs": auditLogs }));
      setAuditLogsLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteAuditLogs(ids) {
    if (!isAdmin || !ids.length) return false;
    try {
      await api.auditDelete(ids);
      await loadAuditLogs();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  useEffect(() => {
    if (authenticated) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && active === "reports" && !auditLogsLoaded && hasPermission(currentUser, "audit-logs", "view")) {
      loadAuditLogs();
    }
  }, [authenticated, active, auditLogsLoaded, currentUser]);

  const isAdmin = normalizeEmployeeRole(currentUser.role) === "admin";
  const canAddWorkOrders = hasPermission(currentUser, "work-orders", "add");
  const canModifyWorkOrders = hasPermission(currentUser, "work-orders", "edit") || hasPermission(currentUser, "work-orders", "delete");

  async function handleLogin(event) {
    event.preventDefault();
    try {
      const auth = await api.login({
        username: loginValue.username.trim(),
        password: loginValue.password
      });
      const matchedUser = auth.user || {};
      const role = normalizeEmployeeRole(matchedUser.role);
      const permissions = matchedUser.permissions || stringifyPermissions(createRolePermissions(role));
      saveAuthSession({
        role,
        username: matchedUser.username,
        name: matchedUser.name,
        permissions,
        accessToken: auth.access_token,
        refreshToken: auth.refresh_token
      });
      setAuditLogsLoaded(false);
      setData((current) => ({ ...current, "audit-logs": [] }));
      setCurrentUser({ username: matchedUser.username, name: matchedUser.name, role, permissions });
      setAuthenticated(true);
      setLoginError("");
    } catch (err) {
      setLoginError(err.message === "Access Denied" ? tr(language, "Invalid username or password") : err.message || tr(language, "Invalid username or password"));
    }
  }

  async function handleLogout() {
    await api.logout().catch(() => null);
    clearAuthSession();
    setAuthenticated(false);
    setCurrentUser({ username: "", name: "", role: "", permissions: "" });
    setLoginValue({ username: "", password: "" });
    setAuditLogsLoaded(false);
    setData((current) => ({ ...current, "audit-logs": [] }));
    setActive("dashboard");
  }

  function openCreate(resourceKey = "work-orders") {
    if (!hasPermission(currentUser, resourceKey, "add")) return;
    setModal({ resourceKey, mode: "create" });
    setFormValue(resources[resourceKey].blank);
  }

  function openEdit(resourceKey, row) {
    if (!hasPermission(currentUser, resourceKey, "edit")) return;
    setModal({ resourceKey, mode: "edit", id: row.id });
    const nextValue = { ...resources[resourceKey].blank, ...row };
    if (resourceKey === "engineers") nextValue.job_title = row.job_title || row.specialty || "";
    setFormValue(nextValue);
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!hasPermission(currentUser, modal.resourceKey, modal.mode === "edit" ? "edit" : "add")) return;
    const config = resources[modal.resourceKey];
    const payload =
      modal.resourceKey === "equipment"
        ? normalizeAssetForm(formValue)
        : modal.resourceKey === "preventive-maintenance"
          ? normalizePreventiveMaintenanceForm(formValue)
          : modal.resourceKey === "pm-plans"
            ? normalizePMPlanForm(formValue)
          : modal.resourceKey === "engineers"
            ? normalizeEngineerForm(formValue)
            : formValue;
    try {
      if (modal.mode === "edit") {
        await api.update(config.endpoint, modal.id, payload);
      } else {
        await api.create(config.endpoint, payload);
      }
      setModal(null);
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function updatePreventiveMaintenanceHistory(recordId, payload) {
    if (!hasPermission(currentUser, "preventive-maintenance", "edit")) return;
    try {
      await api.update("preventive-maintenance/history", recordId, payload);
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveUserPermissions(user, permissions) {
    if (!isAdmin || !user?.id) return;
    try {
      await api.update("engineers", user.id, {
        ...user,
        role: normalizeEmployeeRole(user.role),
        permissions: stringifyPermissions(permissions)
      });
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function addJobTitle(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed || !hasPermission(currentUser, "engineers", "add")) return false;
    try {
      await api.create("job-titles", { name: trimmed });
      await loadAll({ silent: true });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function deleteJobTitle(id) {
    if (!hasPermission(currentUser, "engineers", "delete")) return;
    if (!window.confirm(language === "ar" ? "هل تريد حذف هذه الوظيفة؟" : "Delete this job title?")) return;
    try {
      await api.remove("job-titles", id);
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  function updateModalForm(nextValue) {
    setFormValue(
      modal?.resourceKey === "equipment"
        ? normalizeAssetForm(nextValue)
        : modal?.resourceKey === "preventive-maintenance"
          ? normalizePreventiveMaintenanceForm(nextValue)
          : modal?.resourceKey === "pm-plans"
            ? normalizePMPlanForm(nextValue)
          : nextValue
    );
  }

  async function runPMScheduler() {
    if (!hasPermission(currentUser, "pm-plans", "edit")) return;
    try {
      const result = await api.create("pm-plans/scheduler/run", {});
      await loadAll({ silent: true });
      window.alert(`PM Scheduler completed. Generated: ${result.generated || 0}. Skipped: ${result.skipped || 0}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveWorkOrderDocument(payload, id) {
    if (!id && !hasPermission(currentUser, "work-orders", "add")) {
      setError(tr(language, "Admin Only"));
      return false;
    }
    if (id && !hasPermission(currentUser, "work-orders", "edit")) {
      setError(tr(language, "Admin Only"));
      return false;
    }
    try {
      if (id) {
        await api.update("work-orders", id, payload);
      } else {
        await api.create("work-orders", payload);
      }
      await loadAll({ silent: true });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function runWorkOrderLifecycleAction(id, action, payload = {}) {
    if (!id || !hasPermission(currentUser, "work-orders", "edit")) return false;
    try {
      await api.create(`work-orders/${id}/${action}`, payload);
      await loadAll({ silent: true });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function deleteRecord(resourceKey, id) {
    if (!hasPermission(currentUser, resourceKey, "delete")) return;
    if (!window.confirm(language === "ar" ? "هل تريد حذف هذا السجل؟" : "Delete this record?")) return;
    try {
      await api.remove(resources[resourceKey].endpoint, id);
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function moveAsset(asset, parentId) {
    if (!hasPermission(currentUser, "equipment", "edit")) return;
    try {
      const parent = parentId ? data.equipment.find((item) => Number(item.id) === Number(parentId)) : null;
      await api.update("equipment", asset.id, normalizeAssetForm({
        ...asset,
        parent_id: parentId || null,
        asset_level: parent ? nextAssetLevel(parent.asset_level) : "Site"
      }));
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  const requestedPage = normalizePage(active);
  const page = isVisiblePageForUser(currentUser, requestedPage) ? requestedPage : "dashboard";
  const t = (text) => tr(language, text);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("maintenance-language", language);
  }, [language]);

  if (!authenticated) {
    return (
      <LoginScreen
        language={language}
        setLanguage={setLanguage}
        value={loginValue}
        setValue={setLoginValue}
        error={loginError}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className={`flex min-h-screen w-full flex-col overflow-x-hidden lg:flex-row ${darkMode ? "bg-slate-900" : "bg-slate-100"} text-slate-900`}>
      <Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} language={language} isAdmin={isAdmin} />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-4 backdrop-blur sm:px-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="break-words text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 sm:text-xs sm:tracking-[0.22em]">{t("Professional Industrial Maintenance Dashboard")}</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{pageTitle(active, language)}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                <Globe2 className="h-4 w-4 text-blue-700" />
                <span className="sr-only">{t("Language")}</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                  title={t("Language")}
                >
                  <option value="en">{t("English")}</option>
                  <option value="ar">{t("Arabic")}</option>
                </select>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setNotificationAnchor({
                      top: rect.top,
                      right: rect.right,
                      bottom: rect.bottom,
                      left: rect.left
                    });
                    setNotificationsOpen((open) => !open);
                  }}
                  aria-expanded={notificationsOpen}
                  className={`relative grid h-10 w-10 place-items-center rounded-lg border bg-white text-slate-600 hover:text-slate-950 ${
                    notificationsOpen ? "border-blue-300 shadow-sm ring-2 ring-blue-100" : "border-slate-200"
                  }`}
                  title={t("Notifications")}
                >
                  <Bell className="h-4 w-4" />
                  {alerts.length ? <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">{alerts.length}</span> : null}
                </button>
                {notificationsOpen ? (
                  <>
                    <button type="button" aria-label="Close notifications" className="fixed inset-0 z-[80] cursor-default bg-transparent" onClick={() => setNotificationsOpen(false)} />
                    <NotificationMenu
                      alerts={alerts}
                      language={language}
                      anchor={notificationAnchor}
                      onViewAlerts={() => {
                        setActive("dashboard");
                        setDashboardAlertsOpen(true);
                        setNotificationsOpen(false);
                        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
                      }}
                    />
                  </>
                ) : null}
              </div>
              <button type="button" onClick={() => setDarkMode(!darkMode)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-950" title="Toggle dark frame">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button onClick={loadAll} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {t("Refresh")}
              </button>
              {isAdmin ? (
                <button type="button" onClick={() => setActive("access-control")} className="grid h-10 w-10 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100" title={t("Access Control")}>
                  <ShieldCheck className="h-4 w-4" />
                </button>
              ) : null}
              {canAddWorkOrders ? (
                <button onClick={() => setActive("work-orders")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800">
                  <Plus className="h-4 w-4" />
                  {t("Add Work Order")}
                </button>
              ) : null}
              {isAdmin ? (
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                  {t("Full Admin Access")}
                </span>
              ) : null}
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-red-300 hover:text-red-700">
                <LogOut className="h-4 w-4" />
                {t("Logout")}
              </button>
            </div>
          </div>
        </header>

        {error ? <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
        <div className="min-w-0 space-y-6 p-3 sm:p-4 lg:p-6">
          {loading && <SkeletonDashboard />}
          {!loading && page === "dashboard" && (
            <Dashboard
              stats={stats}
              data={displayData}
              alerts={alerts}
              backendReliability={backendReliability}
              openCreate={openCreate}
              canManage={canAddWorkOrders}
              language={language}
              dashboardAlertsOpen={dashboardAlertsOpen}
              setDashboardAlertsOpen={setDashboardAlertsOpen}
            />
          )}
          {!loading && page === "work-orders" && (
            <WorkOrdersPage
              rows={data["work-orders"]}
              customers={data.customers}
              equipment={data.equipment}
              engineers={employeeRows}
              onSave={saveWorkOrderDocument}
              onDelete={(id) => deleteRecord("work-orders", id)}
              onLifecycleAction={runWorkOrderLifecycleAction}
              onBackToEquipment={() => setActive("equipment")}
              canManage={canModifyWorkOrders}
              canCreate={canAddWorkOrders}
              canEdit={hasPermission(currentUser, "work-orders", "edit")}
              canDelete={hasPermission(currentUser, "work-orders", "delete")}
              language={language}
            />
          )}
          {!loading && page === "equipment" && (
            <AssetsPage
              rows={data.equipment}
              departments={data.customers}
              onCreate={() => openCreate("equipment")}
              onEdit={(row) => openEdit("equipment", row)}
              onDelete={(id) => deleteRecord("equipment", id)}
              onCreateDepartment={() => openCreate("customers")}
              onEditDepartment={(row) => openEdit("customers", row)}
              onDeleteDepartment={(id) => deleteRecord("customers", id)}
              onMoveAsset={(asset, parentId) => moveAsset(asset, parentId)}
              workOrders={data["work-orders"]}
              pmTasks={data["preventive-maintenance"]}
              inventory={data.inventory}
              canManage={
                hasPermission(currentUser, "equipment", "add")
                || hasPermission(currentUser, "equipment", "edit")
                || hasPermission(currentUser, "equipment", "delete")
                || hasPermission(currentUser, "customers", "add")
                || hasPermission(currentUser, "customers", "edit")
                || hasPermission(currentUser, "customers", "delete")
              }
              canCreateAsset={hasPermission(currentUser, "equipment", "add")}
              canEditAsset={hasPermission(currentUser, "equipment", "edit")}
              canDeleteAsset={hasPermission(currentUser, "equipment", "delete")}
              canCreateDepartment={hasPermission(currentUser, "customers", "add")}
              canEditDepartment={hasPermission(currentUser, "customers", "edit")}
              canDeleteDepartment={hasPermission(currentUser, "customers", "delete")}
              language={language}
            />
          )}
          {!loading && page === "engineers" && (
            <EmployeesManagementPage
              rows={employeeRows}
              onCreate={() => openCreate("engineers")}
              onEdit={(row) => openEdit("engineers", row)}
              onDelete={(id) => deleteRecord("engineers", id)}
              jobTitles={data["job-titles"]}
              onAddJobTitle={addJobTitle}
              onDeleteJobTitle={deleteJobTitle}
              canAdd={hasPermission(currentUser, "engineers", "add")}
              canEdit={hasPermission(currentUser, "engineers", "edit")}
              canDelete={hasPermission(currentUser, "engineers", "delete")}
              language={language}
            />
          )}
          {!loading && ["customers", "inventory"].includes(page) && (
            <CrudPage
              resourceKey={page}
              rows={data[page]}
              onCreate={() => openCreate(page)}
              onEdit={(row) => openEdit(page, row)}
              onDelete={(id) => deleteRecord(page, id)}
              canAdd={hasPermission(currentUser, page, "add")}
              canEdit={hasPermission(currentUser, page, "edit")}
              canDelete={hasPermission(currentUser, page, "delete")}
              language={language}
            />
          )}
          {!loading && page === "pm-plans" && (
            <CrudPage
              resourceKey="pm-plans"
              rows={data["pm-plans"]}
              onCreate={() => openCreate("pm-plans")}
              onEdit={(row) => openEdit("pm-plans", row)}
              onDelete={(id) => deleteRecord("pm-plans", id)}
              canAdd={hasPermission(currentUser, "pm-plans", "add")}
              canEdit={hasPermission(currentUser, "pm-plans", "edit")}
              canDelete={hasPermission(currentUser, "pm-plans", "delete")}
              language={language}
              extraActions={hasPermission(currentUser, "pm-plans", "edit") ? (
                <button type="button" onClick={runPMScheduler} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100">
                  <TimerReset className="h-4 w-4" />
                  Run Scheduler
                </button>
              ) : null}
            />
          )}
          {!loading && page === "schedule" && (
            <Schedule
              customers={data.customers}
              workOrders={data["work-orders"]}
              pmTasks={data["preventive-maintenance"]}
              equipment={data.equipment}
              onCreatePm={() => openCreate("preventive-maintenance")}
              onEditPm={(row) => openEdit("preventive-maintenance", row)}
              onDeletePm={(id) => deleteRecord("preventive-maintenance", id)}
              onUpdatePmHistory={updatePreventiveMaintenanceHistory}
              canManage={
                hasPermission(currentUser, "preventive-maintenance", "add")
                || hasPermission(currentUser, "preventive-maintenance", "edit")
                || hasPermission(currentUser, "preventive-maintenance", "delete")
              }
              canAdd={hasPermission(currentUser, "preventive-maintenance", "add")}
              canEdit={hasPermission(currentUser, "preventive-maintenance", "edit")}
              canDelete={hasPermission(currentUser, "preventive-maintenance", "delete")}
              language={language}
            />
          )}
          {!loading && page === "reports" && <Reports data={data} alerts={alerts} stats={stats} language={language} canViewAuditLogs={hasPermission(currentUser, "audit-logs", "view")} canDeleteAuditLogs={isAdmin} onDeleteAuditLogs={deleteAuditLogs} />}
          {!loading && page === "settings" && <SettingsSummary data={data} language={language} onAccessControl={() => setActive("access-control")} isAdmin={isAdmin} />}
          {!loading && page === "access-control" && isAdmin && (
            <AccessControlPage
              users={employeeRows}
              currentUser={currentUser}
              onSaveUserPermissions={saveUserPermissions}
              language={language}
            />
          )}
        </div>
      </main>
      {modal && (
        <FormModal
          title={`${modal.mode === "edit" ? t("EditMode") : t("CreateMode")} ${localizedConfig(modal.resourceKey, language).title}`}
          fields={localizedConfig(modal.resourceKey, language).fields}
          value={formValue}
          setValue={updateModalForm}
          onSubmit={saveRecord}
          onClose={() => setModal(null)}
          options={options}
          onAddOption={async (field, optionName) => {
            if (field.key === "job_title") return addJobTitle(optionName);
            return false;
          }}
          labels={{ record: t("Maintenance Record"), close: t("Close"), cancel: t("Cancel"), save: t("Save Changes"), select: t("Select") }}
        />
      )}
    </div>
  );
}

function normalizePage(active) {
  return active;
}

function LoginScreen({ language, setLanguage, value, setValue, error, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const t = (text) => tr(language, text);
  const isArabic = language === "ar";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 bg-cover bg-center text-white"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(2,6,23,0.74) 0%, rgba(2,6,23,0.50) 48%, rgba(248,250,252,0.88) 100%), url('/login-background.jpg')"
      }}
    >
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/60" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/30 bg-white/15 backdrop-blur">
                <ShieldCheck className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-white">MaintOps</p>
                <p className="text-xs text-slate-400">{t("Plant Maintenance Command")}</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">{t("Professional Industrial Maintenance Dashboard")}</p>
              <h1 className="mt-4 text-5xl font-black leading-tight text-white">{t("Maintenance Control Access")}</h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">{t("Secure sign-in for maintenance operations dashboard.")}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-slate-300">{t("Equipment Management")}</p>
                <p className="mt-2 text-2xl font-black text-white">24/7</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-slate-300">{t("Smart Maintenance Alerts")}</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">Live</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-slate-300">{t("API Health")}</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">OK</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white/72 p-6 text-slate-950 backdrop-blur-md">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/80 bg-white/95 p-6 shadow-2xl shadow-slate-950/20">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">MaintOps</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{t("Sign In")}</h2>
              </div>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                <Globe2 className="h-4 w-4 text-blue-700" />
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="en">{t("English")}</option>
                  <option value="ar">{t("Arabic")}</option>
                </select>
              </label>
            </div>

            <div className="space-y-4">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t("Email / Username")}</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <UsersRound className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={value.username}
                    onChange={(event) => setValue({ ...value, username: event.target.value })}
                    className="w-full bg-transparent text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                    placeholder="Enter username"
                    autoComplete="username"
                  />
                </div>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t("Password")}</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={value.password}
                    onChange={(event) => setValue({ ...value, password: event.target.value })}
                    className="w-full bg-transparent text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-700">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

            <button type="submit" className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800">
              {t("Sign In")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function pageTitle(active, language = "en") {
  const titles = {
    dashboard: "Executive Dashboard",
    customers: "Customers / Locations",
    equipment: "Assets",
    engineers: "Resources",
    "work-orders": "Work Orders",
    "pm-plans": "PM Plans",
    schedule: "Maintenance Schedule",
    inventory: "Inventory",
    reports: "Reports & Analytics",
    "access-control": "Access Control",
    settings: "Settings"
  };
  return tr(language, titles[active] || active);
}

function Dashboard({ stats, data, alerts, backendReliability, openCreate, canManage, language, dashboardAlertsOpen, setDashboardAlertsOpen }) {
  const t = (text) => tr(language, text);
  const [filters, setFilters] = useState(createDashboardFilters);
  const filterOptions = useMemo(() => buildDashboardFilterOptions(data, alerts, language), [data, alerts, language]);
  const filteredScope = useMemo(() => applyDashboardFilters(data, alerts, filters), [data, alerts, filters]);
  const filteredData = filteredScope.data;
  const filteredAlerts = filteredScope.alerts;
  const workOrders = filteredData["work-orders"];
  const fallbackReliability = useMemo(() => buildAssetReliability(workOrders, filteredData.equipment, language), [workOrders, filteredData.equipment, language]);
  const reliability = backendReliability || fallbackReliability;
  const metrics = useMemo(() => buildMaintenanceDashboardMetrics(filteredData, filteredAlerts, reliability, language), [filteredData, filteredAlerts, reliability, language]);

  return (
    <>
      <DashboardFilterBar filters={filters} setFilters={setFilters} options={filterOptions} language={language} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Total Assets" value={filteredData.equipment.length} icon={Cpu} tone="blue" helper="Assets under maintenance control" />
        <MetricCard label="Total Work Orders" value={workOrders.length} icon={Wrench} tone="blue" helper="All work orders in scope" />
        <MetricCard label="Average Downtime" value={metrics.averageDowntimeLabel} icon={TimerReset} tone={metrics.averageDowntimeHours > 4 ? "orange" : "green"} helper="Average downtime per breakdown" />
        <MetricCard label="Overdue PM Tasks" value={metrics.overduePmTasks.length} icon={AlertTriangle} tone={metrics.overduePmTasks.length ? "red" : "green"} helper="Preventive tasks past due" />
        <MetricCard label="Breakdown Count" value={metrics.breakdownCount} icon={Activity} tone={metrics.breakdownCount ? "red" : "green"} helper="Breakdown incidents in scope" />
        <MetricCard label="Asset Health Index" value={`${metrics.assetHealthAverage}%`} icon={CheckCircle2} tone={metrics.assetHealthAverage < 60 ? "red" : metrics.assetHealthAverage < 75 ? "orange" : "green"} helper="Overall calculated asset health" />
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <MiniKpi label="New" value={stats.new_orders || 0} tone="cyan" />
        <MiniKpi label="Assigned" value={stats.assigned_orders || 0} tone="blue" />
        <MiniKpi label="In Progress" value={stats.in_progress_orders || 0} tone="blue" />
        <MiniKpi label="Waiting Parts" value={stats.waiting_parts_orders || 0} tone="orange" />
        <MiniKpi label="Pending Review" value={stats.pending_review_orders || 0} tone="purple" />
        <MiniKpi label="Closed Today" value={stats.closed_today || 0} tone="green" />
        <MiniKpi label="Overdue" value={stats.overdue_orders || 0} tone="red" />
        <MiniKpi label="Avg Completion" value={`${stats.average_completion_time_minutes || 0}m`} tone="slate" />
      </div>

      <DashboardAlertControls
        alerts={filteredAlerts}
        equipment={filteredData.equipment}
        workOrders={filteredData["work-orders"]}
        reliability={reliability}
        open={dashboardAlertsOpen}
        setOpen={setDashboardAlertsOpen}
        language={language}
      />

      <DashboardMiddleRow metrics={metrics} />
      <DashboardWorkOrderCountCharts workOrders={workOrders} language={language} />
      <DashboardBottomRow metrics={metrics} language={language} />
    </>
  );
}

function DashboardFilterBar({ filters, setFilters, options, language }) {
  const t = (text) => tr(language, text);
  const fields = [
    { key: "dateFrom", label: "From Date", type: "date" },
    { key: "dateTo", label: "To Date", type: "date" },
    { key: "location", label: "Site", options: options.locations },
    { key: "category", label: "Asset Category", options: options.categories },
    { key: "equipment", label: "Equipment", options: options.equipment }
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-2 block text-xs font-black text-slate-800">{t(field.label)}</span>
            {field.type === "date" ? (
              <input
                type="date"
                value={filters[field.key]}
                onChange={(event) => setFilters((current) => ({ ...current, [field.key]: event.target.value }))}
                className="w-full rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            ) : (
              <select
                value={filters[field.key]}
                onChange={(event) => setFilters((current) => ({ ...current, [field.key]: event.target.value }))}
                className="w-full rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">{t("All")}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function DashboardAlertControls({ alerts, equipment, workOrders, reliability, open, setOpen, language }) {
  const t = (text) => tr(language, text);
  const [reliabilityOpen, setReliabilityOpen] = useState(false);
  const criticalAlerts = alerts.filter((alert) => alert.alert_level === "DUE NOW").length;
  const reliabilityData = reliability || buildAssetReliability(workOrders, equipment, language);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("Alerts")}</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{alerts.length}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{criticalAlerts} {t("Critical")} / {Math.max(alerts.length - criticalAlerts, 0)} {t("Warning")}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`hidden h-12 w-12 place-items-center rounded-xl sm:grid ${alerts.length ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                <Bell className="h-5 w-5" />
              </span>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`grid h-11 w-11 place-items-center rounded-lg border transition ${
                  open
                    ? "border-blue-300 bg-blue-700 text-white shadow-sm"
                    : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                }`}
                title={open ? t("Hide Alerts") : t("Show Alerts")}
                aria-label={open ? t("Hide Alerts") : t("Show Alerts")}
              >
                <AlertTriangle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Asset Reliability</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{reliabilityData.score}%</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">MTTR {reliabilityData.mttrLabel} / MTBF {reliabilityData.mtbfLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`hidden h-12 w-12 place-items-center rounded-xl sm:grid ${reliabilityData.score < 70 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}`}>
                <Cpu className="h-5 w-5" />
              </span>
              <button
                type="button"
                onClick={() => setReliabilityOpen((current) => !current)}
                className={`grid h-11 w-11 place-items-center rounded-lg border transition ${
                  reliabilityOpen
                    ? "border-slate-800 bg-slate-950 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
                title="Show Asset Reliability"
                aria-label="Show Asset Reliability"
              >
                <Activity className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <AlertsAlarmsSection alerts={alerts} equipment={equipment} workOrders={workOrders} language={language} />
      ) : null}
      {reliabilityOpen ? (
        <AssetReliabilityPanel reliability={reliabilityData} language={language} />
      ) : null}
    </div>
  );
}

function MaintenancePerformanceSummary({ metrics }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <PmStat label="Average Downtime" value={metrics.averageDowntimeLabel} tone={metrics.averageDowntimeHours > 4 ? "orange" : "green"} />
      <PmStat label="Overdue PM Tasks" value={metrics.overduePmTasks.length} tone={metrics.overduePmTasks.length ? "red" : "green"} />
      <PmStat label="Maintenance Cost" value={metrics.cost.totalLabel} tone={metrics.cost.currentMonth > metrics.cost.previousMonth ? "orange" : "blue"} />
      <PmStat label="Breakdown Count" value={metrics.breakdownCount} tone={metrics.breakdownCount ? "red" : "green"} />
      <PmStat label="Asset Health Index" value={`${metrics.assetHealthAverage}%`} tone={metrics.assetHealthAverage < 60 ? "red" : metrics.assetHealthAverage < 75 ? "orange" : "green"} />
    </div>
  );
}

function DashboardMiddleRow({ metrics }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Breakdown Trend Chart" subtitle="Monthly breakdown incidents during the selected period.">
        <LineChart data={metrics.breakdownTrend} color="#dc2626" />
      </Panel>
      <Panel title="Work Order Status Pie Chart" subtitle="Open and closed work orders grouped by current status.">
        <DonutChart data={metrics.workOrderStatusPie} centerLabel="Orders" />
      </Panel>
    </div>
  );
}

function DashboardWorkOrderCountCharts({ workOrders, language }) {
  const technicianData = useMemo(() => technicianWorkloadData(workOrders, language, 100), [workOrders, language]);
  const engineerData = useMemo(() => engineerWorkloadData(workOrders, language, 100), [workOrders, language]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <WorkOrderParticipationPanel
        title="Technician Work Order Participation"
        subtitle="Technician name linked to the number of work orders he participated in."
        filterTitle="Technicians"
        data={technicianData}
        color="cyan"
      />
      <WorkOrderParticipationPanel
        title="Engineer Work Order Participation"
        subtitle="Engineer name linked to the number of work orders assigned or issued."
        filterTitle="Engineers"
        data={engineerData}
        color="blue"
      />
    </div>
  );
}

function WorkOrderParticipationPanel({ title, subtitle, filterTitle, data, color }) {
  const rows = useMemo(
    () => data.filter((item) => item.value > 0 && item.label !== "No data"),
    [data]
  );
  const [selectedNames, setSelectedNames] = useState([]);
  const visibleRows = selectedNames.length ? rows.filter((item) => selectedNames.includes(item.label)) : rows;

  useEffect(() => {
    setSelectedNames((current) => current.filter((name) => rows.some((item) => item.label === name)));
  }, [rows]);

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      actions={(
        <ParticipantFilterList
          title={filterTitle}
          rows={rows}
          selectedNames={selectedNames}
          setSelectedNames={setSelectedNames}
        />
      )}
    >
      <ParticipationBarChart rows={visibleRows} color={color} />
    </Panel>
  );
}

function ParticipantFilterList({ title, rows, selectedNames, setSelectedNames }) {
  const [open, setOpen] = useState(false);
  const allSelected = selectedNames.length === 0;
  const label = allSelected ? "All" : `${selectedNames.length} selected`;

  function toggleName(name) {
    setSelectedNames((current) => {
      if (!current.length) return [name];
      return current.includes(name)
        ? current.filter((item) => item !== name)
        : uniqueSorted([...current, name]);
    });
  }

  return (
    <div className="relative z-30 ml-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex w-44 max-w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
        title={title}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedNames([]);
                setOpen(false);
              }}
              className={`rounded-md px-2 py-1 text-xs font-black ${allSelected ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}
            >
              All
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {rows.map((row) => {
              const checked = allSelected || selectedNames.includes(row.label);
              return (
                <label key={row.label} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${checked ? "border-blue-200 bg-blue-50 text-slate-950" : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleName(row.label)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700"
                  />
                  <span className="min-w-0 flex-1 text-right font-bold leading-snug" title={row.label}>{row.label}</span>
                  <span className="rounded bg-white px-2 py-0.5 text-xs font-black text-slate-700">{row.value}</span>
                </label>
              );
            })}
            {!rows.length ? <p className="py-8 text-center text-sm font-semibold text-slate-400">No data</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ParticipationBarChart({ rows, color }) {
  const maxValue = Math.max(...rows.map((item) => Number(item.value || 0)), 1);
  const topTick = Math.max(1, Math.ceil(maxValue / 2) * 2);
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((topTick / 4) * (4 - index)));
  const barColor = color === "cyan" ? "bg-cyan-600" : "bg-blue-700";
  const rowCount = Math.max(rows.length, 1);
  const columnWidth = rowCount <= 6 ? 92 : rowCount <= 10 ? 78 : rowCount <= 16 ? 66 : 56;
  const columnMinWidth = Math.max(columnWidth - 10, 46);
  const barMaxWidth = rowCount <= 8 ? 44 : rowCount <= 16 ? 34 : 26;
  const axisWidth = 76;
  const chartWidth = Math.max(640, rowCount * columnWidth + axisWidth + 96);
  const columnTemplate = `repeat(${rowCount}, minmax(${columnMinWidth}px, 1fr))`;
  const columnGap = rowCount <= 8 ? "1rem" : rowCount <= 16 ? "0.65rem" : "0.4rem";
  const labelFontSize = rowCount > 16 ? "10px" : "11px";

  return (
    <div className="min-h-80 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">Work Orders Count</p>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Name vs Work Orders</p>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid gap-4" style={{ gridTemplateColumns: `${axisWidth}px 1fr`, minWidth: `${chartWidth}px` }}>
            <div className="relative h-72">
              {ticks.map((tick, index) => (
                <span
                  key={`${tick}-${index}`}
                  className="absolute right-1 -translate-y-1/2 text-xs font-bold text-slate-500"
                  style={{ bottom: `${(tick / topTick) * 100}%` }}
                >
                  {tick}
                </span>
              ))}
              <span className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs font-black text-slate-600">Work Orders</span>
            </div>

            <div className="min-w-0">
              <div className="relative h-72 border-b border-l border-slate-300">
                {ticks.map((tick, index) => (
                  <span
                    key={`${tick}-grid-${index}`}
                    className="absolute left-0 right-0 border-t border-slate-200"
                    style={{ bottom: `${(tick / topTick) * 100}%` }}
                  />
                ))}
                <div
                  className="absolute inset-x-3 bottom-0 top-0 grid items-end"
                  style={{ gridTemplateColumns: columnTemplate, columnGap }}
                >
                  {rows.map((row) => {
                    const height = `${Math.max((Number(row.value || 0) / topTick) * 100, row.value ? 8 : 0)}%`;
                    return (
                      <div key={row.label} className="flex h-full flex-col items-center justify-end">
                        <span className="mb-2 text-sm font-black text-slate-900">{row.value}</span>
                        <div className={`w-full rounded-t-md ${barColor} shadow-sm`} style={{ height, maxWidth: `${barMaxWidth}px` }} title={`${row.label}: ${row.value}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="mt-3 grid px-3"
                style={{ gridTemplateColumns: columnTemplate, columnGap }}
              >
                {rows.map((row) => (
                  <p
                    key={row.label}
                    className="w-full break-words text-center font-black leading-snug text-slate-800"
                    style={{ fontSize: labelFontSize, minHeight: rowCount > 14 ? "64px" : "48px", overflowWrap: "anywhere" }}
                    title={row.label}
                  >
                    {row.label}
                  </p>
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500">Name</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
          No selected names
        </div>
      )}
    </div>
  );
}

function DashboardBottomRow({ metrics, language }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <OverduePmTasksPanel rows={metrics.overduePmTasks} language={language} />
      <TopDowntimeAssetsPanel rows={metrics.topDowntimeAssets} />
      <AssetHealthRankingPanel rows={metrics.assetHealthRanking} average={metrics.assetHealthAverage} />
    </div>
  );
}

function CostRanking({ title, rows }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="space-y-2">
        {rows.slice(0, 3).map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-bold text-slate-700">{row.label}</span>
            <span className="shrink-0 font-black text-slate-950">{formatCurrency(row.value)}</span>
          </div>
        ))}
        {!rows.length ? <p className="text-sm font-semibold text-slate-400">No cost records</p> : null}
      </div>
    </div>
  );
}

function CriticalEquipmentStatusPanel({ rows, siteSummary }) {
  return (
    <Panel title="Critical Equipment Status" subtitle="Critical assets grouped by running, maintenance, breakdown, and out-of-service states.">
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {siteSummary.slice(0, 4).map((site) => (
          <div key={site.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="truncate text-sm font-black text-slate-950">{site.name}</p>
            <p className="text-xs font-semibold text-slate-500">{site.running}/{site.assets} running / {site.breakdown} breakdown</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.slice(0, 8).map((asset) => (
          <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{asset.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{asset.customer_name || asset.location || "Unassigned site"}</p>
              </div>
              <IndustrialStatusBadge status={asset.statusLabel} />
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar value={asset.health} tone={healthTone(asset.health)} />
              <span className="w-12 text-right text-sm font-black text-slate-800">{asset.health}%</span>
            </div>
          </div>
        ))}
        {!rows.length ? <EmptyState title="No critical equipment" message="Mark assets as High or Critical to monitor operational status." /> : null}
      </div>
    </Panel>
  );
}

function OverduePmTasksPanel({ rows, language }) {
  const t = (text) => tr(language, text);
  return (
    <Panel title="Overdue Preventive Maintenance Tasks" subtitle="Tasks that passed due date or exceeded scheduled service hours.">
      {rows.length ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          Critical Alert: {rows.length} preventive maintenance tasks are overdue.
        </div>
      ) : null}
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">PM Number</th>
              <th className="px-3 py-3 text-left">Asset</th>
              <th className="px-3 py-3 text-left">Required Maintenance</th>
              <th className="px-3 py-3 text-left">Site</th>
              <th className="px-3 py-3 text-left">Due Date</th>
              <th className="px-3 py-3 text-left">Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((task) => (
              <tr key={task.id} className="bg-red-50">
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">PM-{String(task.id).padStart(4, "0")}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-700">{task.equipment_name || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{task.task_name || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-700">{task.site || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-700">{task.dueLabel}</td>
                <td className="border-t border-slate-200 px-3 py-3 font-black text-red-700">{task.daysOverdue}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">{t("No data")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function TopDowntimeAssetsPanel({ rows }) {
  return (
    <Panel title="Top 10 Assets by Downtime" subtitle="Equipment with the highest downtime exposure in the selected period.">
      <BarChart data={rows.slice(0, 10).map((asset) => ({ label: asset.name, value: Math.round(asset.downtimeHours), color: "bg-red-600" }))} layout="horizontal" />
    </Panel>
  );
}

function AssetHealthRankingPanel({ rows, average }) {
  return (
    <Panel title="Asset Health Ranking" subtitle="Calculated health score based on breakdown frequency, MTTR, MTBF, availability, and PM exposure.">
      <div className="mb-5 flex flex-wrap items-center gap-5">
        <GaugeChart value={average} />
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Health Categories</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">90-100 Excellent / 75-89 Good / 60-74 Fair / Below 60 Poor</p>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Asset</th>
              <th className="px-3 py-3 text-left">Site</th>
              <th className="px-3 py-3 text-left">Health</th>
              <th className="px-3 py-3 text-left">Category</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((asset) => (
              <tr key={asset.id} className="bg-white hover:bg-slate-50">
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{asset.name}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{asset.site || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <ProgressBar value={asset.health} tone={healthTone(asset.health)} />
                    <span className="w-12 text-right font-black">{asset.health}%</span>
                  </div>
                </td>
                <td className="border-t border-slate-200 px-3 py-3 font-bold text-slate-700">{asset.category}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No asset health records.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function GaugeChart({ value }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  const dash = `${safe} ${100 - safe}`;
  const stroke = safe < 60 ? "#dc2626" : safe < 75 ? "#f97316" : safe < 90 ? "#2563eb" : "#10b981";
  return (
    <svg viewBox="0 0 42 42" className="h-32 w-32 shrink-0">
      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={stroke} strokeWidth="5" strokeDasharray={dash} strokeDashoffset="25" strokeLinecap="round" />
      <text x="21" y="20" textAnchor="middle" className="fill-slate-900 text-[0.42rem] font-black">{Math.round(safe)}%</text>
      <text x="21" y="25" textAnchor="middle" className="fill-slate-500 text-[0.18rem] uppercase">Health</text>
    </svg>
  );
}

function AssetReliabilityPanel({ reliability, language }) {
  const t = (text) => tr(language, text);
  return (
    <Panel title="Asset Reliability" subtitle="Bad actors, downtime tracking, MTTR, and MTBF indicators for production reliability.">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <PmStat label="Bad Actors" value={reliability.badActors.length} tone={reliability.badActors.length ? "orange" : "green"} />
        <PmStat label="Downtime Hours" value={reliability.downtimeLabel} tone={reliability.totalDowntimeHours > 0 ? "red" : "green"} />
        <PmStat label="MTTR" value={reliability.mttrLabel} tone={reliability.mttrHours > 4 ? "orange" : "green"} />
        <PmStat label="MTBF" value={reliability.mtbfLabel} tone={reliability.mtbfHours < 100 && reliability.mtbfHours > 0 ? "orange" : "blue"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">Bad Actors</h3>
              <p className="text-xs font-semibold text-slate-500">Top 5 assets causing production downtime.</p>
            </div>
            <Wrench className="h-5 w-5 text-orange-500" />
          </div>
          <div className="space-y-2">
            {reliability.badActors.map((asset, index) => (
              <div key={asset.id || asset.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">{index + 1}. {asset.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{asset.faults} faults / {asset.downtimeLabel} downtime</p>
                  </div>
                  <span className="rounded bg-red-50 px-2 py-1 text-xs font-black text-red-700">{asset.impactScore}</span>
                </div>
              </div>
            ))}
            {!reliability.badActors.length ? <EmptyState title={t("No data")} message="No breakdown-related work orders found." /> : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">Downtime Tracking</h3>
              <p className="text-xs font-semibold text-slate-500">Production line downtime hours by date.</p>
            </div>
            <TimerReset className="h-5 w-5 text-blue-600" />
          </div>
          <LineChart data={reliability.downtimeSeries} color="#dc2626" />
        </div>
      </div>
    </Panel>
  );
}

function EquipmentHealthMonitoring({ equipment, pmTasks, language }) {
  const rows = equipment
    .slice()
    .sort((first, second) => equipmentHealthPercent(first) - equipmentHealthPercent(second))
    .slice(0, 12);

  return (
    <Panel title="Equipment Health Monitoring" subtitle="Live asset condition, running exposure, criticality, and maintenance readiness.">
      <div className="overflow-auto">
        <table className="min-w-[1080px] w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="border border-slate-200 px-3 py-3 text-left">Asset Name</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Asset ID</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Current Status</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Health Percentage</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Running Hours</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Last Maintenance</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Next Maintenance</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Criticality Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((asset) => {
              const health = equipmentHealthPercent(asset);
              return (
                <tr key={asset.id} className="bg-white hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-3 font-black text-slate-950">{asset.name}</td>
                  <td className="border border-slate-200 px-3 py-3 font-semibold text-slate-600">{asset.asset_code || `AST-${asset.id}`}</td>
                  <td className="border border-slate-200 px-3 py-3"><IndustrialStatusBadge status={equipmentIndustrialStatus(asset)} /></td>
                  <td className="border border-slate-200 px-3 py-3">
                    <div className="flex min-w-44 items-center gap-3">
                      <ProgressBar value={health} tone={healthTone(health)} />
                      <span className={`w-12 text-right font-black ${health < 45 ? "text-red-600" : health < 70 ? "text-orange-600" : "text-emerald-700"}`}>{health}%</span>
                    </div>
                  </td>
                  <td className="border border-slate-200 px-3 py-3 font-semibold text-slate-700">{formatScheduleCell(asset.current_hours)}</td>
                  <td className="border border-slate-200 px-3 py-3 text-slate-600">{assetLastMaintenance(asset, pmTasks)}</td>
                  <td className="border border-slate-200 px-3 py-3 text-slate-600">{assetNextMaintenance(asset, pmTasks)}</td>
                  <td className="border border-slate-200 px-3 py-3"><CriticalityBadge value={asset.criticality} /></td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr><td colSpan={8} className="border border-slate-200 px-3 py-8 text-center text-slate-500">No assets available for health monitoring.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SiteStatusOverview({ customers, equipment, engineers, alerts, language }) {
  const activeTechnicians = engineers.filter((item) => item.status === "active");
  const sites = customers.filter((customer) => equipment.some((asset) => Number(asset.customer_id) === Number(customer.id)));

  return (
    <Panel title="Site Status Overview" subtitle="Company sites, asset concentration, active faults, online technicians, and operational percentage.">
      <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
        {sites.map((site) => {
          const siteAssets = equipment.filter((asset) => Number(asset.customer_id) === Number(site.id));
          const siteAlerts = alerts.filter((alert) => {
            const asset = findAssetForAlert(alert, equipment);
            return asset ? Number(asset.customer_id) === Number(site.id) : String(alert.location || "").toLowerCase().includes(String(site.name || "").toLowerCase());
          });
          const downAssets = siteAssets.filter((asset) => ["down", "breakdown", "offline"].includes(String(asset.status || "").toLowerCase())).length;
          const activeFaults = siteAlerts.filter((alert) => alert.alert_level === "DUE NOW").length + downAssets;
          const operational = siteOperationalPercent(siteAssets, activeFaults);
          const tone = operational < 60 ? "red" : operational < 85 ? "orange" : "green";
          return (
            <div key={site.id} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Site</p>
                  <h3 className="mt-2 text-lg font-black text-slate-950">{site.name}</h3>
                </div>
                <span className={`h-3 w-3 rounded-full ${tone === "red" ? "bg-red-600" : tone === "orange" ? "bg-orange-500" : "bg-emerald-500"} shadow-sm`} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <SiteMiniStat label="Assets" value={siteAssets.length} />
                <SiteMiniStat label="Faults" value={activeFaults} danger={activeFaults > 0} />
                <SiteMiniStat label="Techs" value={activeTechnicians.length} />
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <span>Operational</span>
                  <span className={tone === "red" ? "text-red-600" : tone === "orange" ? "text-orange-600" : "text-emerald-700"}>{operational}%</span>
                </div>
                <ProgressBar value={operational} tone={tone} />
              </div>
              <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Mini hierarchy</p>
                <div className="space-y-1">
                  {siteAssets.slice(0, 4).map((asset) => (
                    <div key={asset.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      <span className="truncate">{asset.asset_level || "Equipment"} / {asset.name}</span>
                    </div>
                  ))}
                  {!siteAssets.length ? <p className="text-xs text-slate-500">No linked assets.</p> : null}
                </div>
              </div>
            </div>
          );
        })}
        {!sites.length ? <EmptyState title="No sites" message="Add customers / locations and link assets to display site status." /> : null}
      </div>
    </Panel>
  );
}

function PreventiveMaintenanceDashboard({ pmTasks, workOrders, language }) {
  const overdue = pmTasks.filter((task) => isPmOverdue(task));
  const upcoming = pmTasks.filter((task) => !isPmOverdue(task) && (task.pm_alert === "UPCOMING" || Number(task.hours_until_due) <= 250));
  const completed = pmTasks.filter((task) => task.status === "completed").length;
  const completionRate = pmTasks.length ? Math.round((completed / pmTasks.length) * 100) : 0;
  const plannedCount = pmTasks.length + workOrders.filter((order) => !["critical", "high"].includes(order.priority)).length;
  const unplannedCount = overdue.length + workOrders.filter((order) => ["critical", "high"].includes(order.priority)).length;
  const calendarRows = [...pmTasks]
    .sort((first, second) => Number(first.hours_until_due ?? 999999) - Number(second.hours_until_due ?? 999999))
    .slice(0, 7);

  return (
    <Panel title="Preventive Maintenance Section" subtitle="Upcoming PM tasks, overdue work, completion rate, calendar planning, and planned vs unplanned load.">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <PmStat label="Upcoming PM Tasks" value={upcoming.length} tone="blue" />
            <PmStat label="Overdue PMs" value={overdue.length} tone={overdue.length ? "red" : "green"} />
            <PmStat label="PM Completion Rate" value={`${completionRate}%`} tone="green" />
          </div>
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">PM Task</th>
                  <th className="px-3 py-3 text-left">Asset</th>
                  <th className="px-3 py-3 text-left">Remaining Hours</th>
                  <th className="px-3 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...overdue, ...upcoming].slice(0, 8).map((task) => (
                  <tr key={task.id} className={isPmOverdue(task) ? "bg-red-50" : "bg-white"}>
                    <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{task.task_name}</td>
                    <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{task.equipment_name}</td>
                    <td className={`border-t border-slate-200 px-3 py-3 font-black ${isPmOverdue(task) ? "text-red-600" : "text-orange-600"}`}>{formatScheduleCell(task.hours_until_due)}</td>
                    <td className="border-t border-slate-200 px-3 py-3"><MaintenanceBadge value={task.pm_alert} language={language} /></td>
                  </tr>
                ))}
                {!pmTasks.length ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No PM tasks configured.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Calendar View</p>
            <div className="space-y-2">
              {calendarRows.map((task) => (
                <div key={task.id} className={`rounded-lg border px-3 py-2 ${isPmOverdue(task) ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-950">{task.task_name}</p>
                    <span className="text-xs font-bold text-slate-500">{task.next_due_date || "Hours-based"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{task.equipment_name} / {formatScheduleCell(task.hours_until_due)} hrs</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Planned vs Unplanned</p>
            <BarChart data={[
              { label: "Planned", value: plannedCount, color: "bg-blue-600" },
              { label: "Unplanned", value: unplannedCount, color: "bg-red-600" }
            ]} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AlertsAlarmsSection({ alerts, equipment, workOrders, language }) {
  const criticalAlarms = alerts.filter((alert) => alert.alert_level === "DUE NOW");
  const alarmRows = alerts.length ? alerts : workOrders.filter((order) => ["critical", "high"].includes(order.priority)).slice(0, 6);

  return (
    <Panel title="Alerts & Alarms Section" subtitle="Real-time industrial alarm panel with critical indicators, downtime exposure, and affected equipment.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <PmStat label="Critical Alarms" value={criticalAlarms.length} tone={criticalAlarms.length ? "red" : "green"} />
        <PmStat label="Total Alarms" value={alerts.length} tone={alerts.length ? "orange" : "green"} />
        <PmStat label="Priority Work Orders" value={workOrders.filter((order) => ["critical", "high"].includes(order.priority)).length} tone="blue" />
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Priority</th>
              <th className="px-3 py-3 text-left">Fault Type</th>
              <th className="px-3 py-3 text-left">Timestamp</th>
              <th className="px-3 py-3 text-left">Affected Equipment</th>
              <th className="px-3 py-3 text-left">Current Downtime</th>
            </tr>
          </thead>
          <tbody>
            {alarmRows.map((alarm, index) => {
              const isAlert = Boolean(alarm.alert_level);
              const asset = isAlert ? findAssetForAlert(alarm, equipment) : equipment.find((item) => Number(item.id) === Number(alarm.equipment_id));
              const critical = isAlert ? alarm.alert_level === "DUE NOW" : alarm.priority === "critical";
              return (
                <tr key={isAlert ? getAlertKey(alarm) : `work-order-${alarm.id || index}`} className={critical ? "bg-red-50" : "bg-white"}>
                  <td className="border-t border-slate-200 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${critical ? "animate-pulse bg-red-600" : "bg-orange-500"}`} />
                      {isAlert ? <MaintenanceBadge value={alarm.alert_level} language={language} /> : <PriorityBadge value={alarm.priority} language={language} />}
                    </div>
                  </td>
                  <td className="border-t border-slate-200 px-3 py-3 font-semibold text-slate-700">{isAlert ? alarm.reason : alarm.title}</td>
                  <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{alarm.created_at?.slice(0, 16) || alarm.next_maintenance_date || alarm.due_date || "Live"}</td>
                  <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{asset?.name || alarm.equipment_name || "Unassigned"}</td>
                  <td className="border-t border-slate-200 px-3 py-3 font-black text-red-600">{alarmDowntime(alarm)}</td>
                </tr>
              );
            })}
            {!alarmRows.length ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No active alarms.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function InventoryMonitoringSection({ inventory, language }) {
  const lowStock = inventory.filter((item) => item.stock_alert === "LOW STOCK" || item.stock_alert === "OUT OF STOCK" || Number(item.stock_quantity || 0) <= Number(item.minimum_quantity || 0));
  const criticalParts = lowStock.filter((item) => item.stock_alert === "OUT OF STOCK" || Number(item.stock_quantity || 0) === 0);
  const mostUsed = inventory.slice().sort((first, second) => Number(Boolean(second.linked_work_order_id)) - Number(Boolean(first.linked_work_order_id)) || Number(first.stock_quantity || 0) - Number(second.stock_quantity || 0)).slice(0, 5);

  return (
    <Panel title="Inventory & Spare Parts" subtitle="Stock health, critical spares, purchase pressure, and spare-part usage indicators.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <PmStat label="Low Stock Items" value={lowStock.length} tone={lowStock.length ? "orange" : "green"} />
        <PmStat label="Critical Spare Parts" value={criticalParts.length} tone={criticalParts.length ? "red" : "green"} />
        <PmStat label="Purchase Requests" value={lowStock.length} tone="blue" />
      </div>
      <div className="space-y-4">
        {mostUsed.map((part) => {
          const stock = Number(part.stock_quantity || 0);
          const min = Math.max(Number(part.minimum_quantity || 1), 1);
          const percent = Math.min(Math.round((stock / (min * 2)) * 100), 100);
          const tone = stock <= min ? (stock === 0 ? "red" : "orange") : "green";
          return (
            <div key={part.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{part.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{part.part_number || "No part no."} / {part.category || "General"}</p>
                </div>
                <StockBadge value={part.stock_alert} language={language} />
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar value={percent} tone={tone} />
                <span className="w-20 text-right text-sm font-black text-slate-700">{stock} {part.unit || "pcs"}</span>
              </div>
            </div>
          );
        })}
        {!inventory.length ? <EmptyState title="No inventory" message="Add spare parts to monitor stock and purchase requests." /> : null}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Inventory Chart</p>
        <BarChart data={[
          { label: "OK", value: Math.max(inventory.length - lowStock.length, 0), color: "bg-emerald-500" },
          { label: "Low", value: lowStock.length - criticalParts.length, color: "bg-orange-500" },
          { label: "Critical", value: criticalParts.length, color: "bg-red-600" }
        ]} />
      </div>
    </Panel>
  );
}

function TechnicianPerformanceSection({ engineers, workOrders, language }) {
  const activeTechnicians = engineers.filter((engineer) => engineer.status === "active");
  const rankings = engineers.map((engineer) => {
    const assigned = workOrders.filter((order) => Number(order.engineer_id) === Number(engineer.id));
    const completed = assigned.filter((order) => order.status === "completed").length;
    const efficiency = assigned.length ? Math.round((completed / assigned.length) * 100) : (engineer.status === "active" ? 82 : 0);
    return {
      ...engineer,
      assigned: assigned.length,
      completed,
      response: `${Math.max(12, 55 - completed * 4)} min`,
      repair: `${Math.max(1.1, 4.5 - completed * 0.2).toFixed(1)}h`,
      efficiency
    };
  }).sort((first, second) => second.efficiency - first.efficiency).slice(0, 6);

  return (
    <Panel title="Technician Performance" subtitle="Active resources, completion throughput, response speed, repair duration, and efficiency ranking.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <PmStat label="Active Technicians" value={activeTechnicians.length} tone="green" />
        <PmStat label="Tasks Completed" value={workOrders.filter((order) => order.status === "completed").length} tone="blue" />
        <PmStat label="Avg Response Time" value={`${Math.max(15, 48 - activeTechnicians.length * 3)} min`} tone="orange" />
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Rank</th>
              <th className="px-3 py-3 text-left">Technician</th>
              <th className="px-3 py-3 text-left">Tasks Completed</th>
              <th className="px-3 py-3 text-left">Response Time</th>
              <th className="px-3 py-3 text-left">Avg Repair Duration</th>
              <th className="px-3 py-3 text-left">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((engineer, index) => (
              <tr key={engineer.id} className="bg-white hover:bg-slate-50">
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-500">#{index + 1}</td>
                <td className="border-t border-slate-200 px-3 py-3">
                  <p className="font-black text-slate-950">{engineer.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{engineer.specialty || "Maintenance"}</p>
                </td>
                <td className="border-t border-slate-200 px-3 py-3 font-semibold text-slate-700">{engineer.completed}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{engineer.response}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{engineer.repair}</td>
                <td className="border-t border-slate-200 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <ProgressBar value={engineer.efficiency} tone={engineer.efficiency < 60 ? "red" : engineer.efficiency < 80 ? "orange" : "green"} />
                    <span className="w-12 text-right font-black text-slate-800">{engineer.efficiency}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {!rankings.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No technicians available.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Performance Chart</p>
        <BarChart data={rankings.slice(0, 4).map((engineer) => ({ label: engineer.name.split(" ")[0] || "Tech", value: engineer.efficiency, color: "bg-blue-600" }))} />
      </div>
    </Panel>
  );
}

function AnalyticsSection({ data, alerts, language }) {
  const t = (text) => tr(language, text);
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel title={t("Maintenance Trends")} subtitle={t("Work order volume over scheduled dates.")}>
        <LineChart data={trendData(data["work-orders"])} />
      </Panel>
      <Panel title={t("Breakdown vs Planned")} subtitle={t("Ratio based on priority and asset condition.")}>
        <BarChart data={plannedBreakdownData(data, alerts, language)} />
      </Panel>
      <Panel title={t("Downtime Distribution")} subtitle={t("Asset load grouped by maintenance exposure.")}>
        <DonutChart data={downtimeDistribution(data.equipment, language)} centerLabel={t("Assets")} />
      </Panel>
    </div>
  );
}

function WorkloadAnalyticsCharts({ workOrders, language }) {
  const t = (text) => tr(language, text);
  const engineerData = useMemo(() => engineerWorkloadData(workOrders, language), [workOrders, language]);
  const technicianData = useMemo(() => technicianWorkloadData(workOrders, language), [workOrders, language]);
  const equipmentTimeData = useMemo(() => equipmentMaintenanceTimeData(workOrders, language), [workOrders, language]);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel title={t("Engineer Workload")} subtitle={t("Engineer name vs number of work orders.")}>
        <BarChart data={engineerData} layout="horizontal" />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t("Unit")}: {t("Orders")}</p>
      </Panel>
      <Panel title={t("Technician Workload")} subtitle={t("Technician name vs number of work orders.")}>
        <BarChart data={technicianData} layout="horizontal" />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t("Unit")}: {t("Orders")}</p>
      </Panel>
      <Panel title={t("Equipment Maintenance Time")} subtitle={t("Equipment name vs total maintenance duration.")}>
        <BarChart data={equipmentTimeData} />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t("Unit")}: {t("Minutes")}</p>
      </Panel>
    </div>
  );
}

function MaintenanceAlerts({ alerts, language }) {
  const t = (text) => tr(language, text);
  return (
    <Panel title={t("Smart Maintenance Alerts")} subtitle={t("Automatic notifications based on service hours and next maintenance date.")}>
      <AlertList alerts={alerts} language={language} />
    </Panel>
  );
}

function AlertList({ alerts, language }) {
  const t = (text) => tr(language, text);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {alerts.map((alert) => (
        <div key={getAlertKey(alert)} className={`rounded-xl border px-4 py-3 ${alert.alert_level === "DUE NOW" ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${alert.alert_level === "DUE NOW" ? "text-red-600" : "text-orange-600"}`} />
                <h3 className="text-sm font-black text-slate-950">{alert.equipment_name}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">{alert.reason}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t("Next maintenance")}: <span className="font-bold text-slate-900">{alert.next_maintenance_date || t("Not set")}</span>
                {alert.location ? <span> - {alert.location}</span> : null}
              </p>
            </div>
            <MaintenanceBadge value={alert.alert_level} language={language} />
          </div>
        </div>
      ))}
      {!alerts.length ? <EmptyState title={t("No maintenance alerts")} message={t("All monitored equipment is within maintenance limits.")} /> : null}
    </div>
  );
}

function NotificationMenu({ alerts, language, anchor, onViewAlerts }) {
  const t = (text) => tr(language, text);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const menuWidth = Math.min(viewportWidth * 0.92, 440);
  const padding = 16;
  const anchorCenter = anchor ? (anchor.left + anchor.right) / 2 : viewportWidth - padding - 20;
  const anchoredLeft = anchorCenter - menuWidth / 2;
  const left = Math.max(padding, Math.min(anchoredLeft, viewportWidth - menuWidth - padding));
  const top = (anchor?.bottom ?? 72) + 10;

  return (
    <div
      className="fixed z-[90] max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/25"
      style={{ top, left, width: menuWidth }}
    >
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-white">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-950">{t("Maintenance Notifications")}</h3>
              <p className="text-xs font-semibold text-slate-500">{alerts.length} {t("Alerts")}</p>
            </div>
          </div>
          {alerts.length ? <MaintenanceBadge value={alerts.some((alert) => alert.alert_level === "DUE NOW") ? "DUE NOW" : "UPCOMING"} language={language} /> : null}
        </div>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
        {alerts.map((alert) => (
          <div key={getAlertKey(alert)} className="rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${alert.alert_level === "DUE NOW" ? "text-red-600" : "text-orange-500"}`} />
                  <p className="truncate text-sm font-black text-slate-950">{alert.equipment_name}</p>
                </div>
                <p className="mt-1 text-sm leading-5 text-slate-600">{alert.reason}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                  <span>{t("Next maintenance")}: <strong className="text-slate-900">{alert.next_maintenance_date || t("Not set")}</strong></span>
                  {alert.hours_until_maintenance !== null && alert.hours_until_maintenance !== undefined ? <span>RH: <strong className="text-slate-900">{alert.hours_until_maintenance}</strong></span> : null}
                  {alert.location ? <span>{alert.location}</span> : null}
                </div>
              </div>
              <MaintenanceBadge value={alert.alert_level} language={language} />
            </div>
          </div>
        ))}

        {!alerts.length ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-black text-slate-950">{t("No notifications")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("All equipment is currently within the configured limits.")}</p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        <button type="button" onClick={onViewAlerts} className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
          {t("View dashboard alerts")}
        </button>
      </div>
    </div>
  );
}

function AssetsPage({ rows, departments, onCreate, onEdit, onDelete, onCreateDepartment, onEditDepartment, onDeleteDepartment, onMoveAsset, workOrders = [], pmTasks = [], inventory = [], canManage, canCreateAsset = canManage, canEditAsset = canManage, canDeleteAsset = canManage, canCreateDepartment = canManage, canEditDepartment = canManage, canDeleteDepartment = canManage, language }) {
  const t = (text) => tr(language, text);
  const [activeAssetSection, setActiveAssetSection] = useState("hierarchy");
  const [selectedAssetId, setSelectedAssetId] = useState(rows[0]?.id || "");
  const [expanded, setExpanded] = useState({});
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilters, setAssetFilters] = useState({ status: "", level: "", criticality: "" });
  const [assetLifecycle, setAssetLifecycle] = useState({ history: [], timeline: [], health: null, measurements: [], events: [], documents: [], photos: [], failures: [], downtime: [] });
  const [assetLifecycleLoading, setAssetLifecycleLoading] = useState(false);
  const [assetLifecycleError, setAssetLifecycleError] = useState("");
  const customerConfig = localizedConfig("customers", language);
  const assetConfig = localizedConfig("equipment", language);
  const assetTree = useMemo(() => buildAssetTree(rows, assetSearch, assetFilters), [rows, assetSearch, assetFilters]);
  const companyTrees = useMemo(() => departments.map((department) => ({
    ...department,
    children: assetTree.filter((asset) => Number(asset.customer_id) === Number(department.id))
  })), [departments, assetTree]);
  const selectedAsset = rows.find((asset) => Number(asset.id) === Number(selectedAssetId)) || rows[0];
  const sections = [
    { key: "customers", title: t("Customers / Locations"), count: departments.length },
    { key: "hierarchy", title: t("Asset Hierarchy"), count: rows.length },
    { key: "assets", title: t("Assets"), count: rows.length }
  ];

  useEffect(() => {
    if (rows.length && !rows.some((asset) => Number(asset.id) === Number(selectedAssetId))) {
      setSelectedAssetId(rows[0].id);
    }
  }, [rows, selectedAssetId]);

  useEffect(() => {
    if (!selectedAsset?.id) {
      setAssetLifecycle({ history: [], timeline: [], health: null, measurements: [], events: [], documents: [], photos: [], failures: [], downtime: [] });
      return;
    }
    let cancelled = false;
    async function loadLifecycle() {
      setAssetLifecycleLoading(true);
      setAssetLifecycleError("");
      try {
        const [history, timeline, health, measurements, events, documents, photos, failures, downtime] = await Promise.all([
          api.list(`assets/${selectedAsset.id}/history`),
          api.list(`assets/${selectedAsset.id}/timeline`),
          api.list(`assets/${selectedAsset.id}/health`),
          api.list(`assets/${selectedAsset.id}/measurements`),
          api.list(`assets/${selectedAsset.id}/events`),
          api.list(`assets/${selectedAsset.id}/documents`),
          api.list(`assets/${selectedAsset.id}/photos`),
          api.list(`assets/${selectedAsset.id}/failures`).catch(() => []),
          api.list(`assets/${selectedAsset.id}/downtime`).catch(() => [])
        ]);
        if (!cancelled) setAssetLifecycle({ history, timeline, health, measurements, events, documents, photos, failures, downtime });
      } catch (error) {
        if (!cancelled) {
          setAssetLifecycle({ history: [], timeline: [], health: null, measurements: [], events: [], documents: [], photos: [], failures: [], downtime: [] });
          setAssetLifecycleError(error.message || "Failed to load asset lifecycle");
        }
      } finally {
        if (!cancelled) setAssetLifecycleLoading(false);
      }
    }
    loadLifecycle();
    return () => { cancelled = true; };
  }, [selectedAsset?.id]);

  async function reloadAssetLifecycle(assetId = selectedAsset?.id) {
    if (!assetId) return;
    setAssetLifecycleLoading(true);
    setAssetLifecycleError("");
    try {
      const [history, timeline, health, measurements, events, documents, photos, failures, downtime] = await Promise.all([
        api.list(`assets/${assetId}/history`),
        api.list(`assets/${assetId}/timeline`),
        api.list(`assets/${assetId}/health`),
        api.list(`assets/${assetId}/measurements`),
        api.list(`assets/${assetId}/events`),
        api.list(`assets/${assetId}/documents`),
        api.list(`assets/${assetId}/photos`),
        api.list(`assets/${assetId}/failures`).catch(() => []),
        api.list(`assets/${assetId}/downtime`).catch(() => [])
      ]);
      setAssetLifecycle({ history, timeline, health, measurements, events, documents, photos, failures, downtime });
    } catch (error) {
      setAssetLifecycleError(error.message || "Failed to load asset lifecycle");
    } finally {
      setAssetLifecycleLoading(false);
    }
  }

  async function handleAssetLifecycleCreate(kind, payload) {
    if (!selectedAsset?.id) return;
    const resource = kind === "document" ? "documents" : kind === "photo" ? "photos" : "measurements";
    try {
      await api.create(`assets/${selectedAsset.id}/${resource}`, payload);
      await reloadAssetLifecycle(selectedAsset.id);
    } catch (error) {
      window.alert(error.message || "Failed to save asset lifecycle item");
    }
  }

  function toggleExpanded(id) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  function handleDrop(asset, parentId) {
    if (!canEditAsset || !onMoveAsset) return;
    const parent = parentId ? rows.find((item) => Number(item.id) === Number(parentId)) : null;
    if (parent && !canPlaceAssetUnder(asset, parent, rows)) return;
    onMoveAsset(asset, parentId);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const active = activeAssetSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveAssetSection(section.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <span>{section.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15 text-white" : "bg-white text-blue-700"}`}>{section.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeAssetSection === "customers" ? (
        <Panel
          title={t("Customers / Locations")}
          subtitle={t("Create, update, and control operational records through the existing REST API.")}
          actions={canCreateDepartment ? (
            <button onClick={onCreateDepartment} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              {t("New Record")}
            </button>
          ) : null}
        >
          <DataTable columns={customerConfig.columns} rows={departments} onEdit={canEditDepartment ? onEditDepartment : null} onDelete={canDeleteDepartment ? onDeleteDepartment : null} emptyMessage={t("No customers / locations")} labels={tableLabels(language)} />
        </Panel>
      ) : null}

      {activeAssetSection === "hierarchy" ? (
        <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <Panel
            title={t("Asset Hierarchy")}
            subtitle={t("Customer / location to asset structure for fast plant navigation.")}
            actions={canCreateAsset ? (
              <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
                <Plus className="h-4 w-4" />
                Add Asset
              </button>
            ) : null}
          >
            <div className="mb-4 space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="Search by name or code" value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} />
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <AssetMiniSelect value={assetFilters.status} onChange={(value) => setAssetFilters((current) => ({ ...current, status: value }))} options={["", "Active", "Down", "Maintenance", "operational", "warning", "down"]} label="Status" />
                <AssetMiniSelect value={assetFilters.level} onChange={(value) => setAssetFilters((current) => ({ ...current, level: value }))} options={["", "Site", "Area / Department", "System", "Equipment", "Component"]} label="Type" />
                <AssetMiniSelect value={assetFilters.criticality} onChange={(value) => setAssetFilters((current) => ({ ...current, criticality: value }))} options={["", "Low", "Medium", "High", "Critical"]} label="Criticality" />
              </div>
            </div>

            <div
              className="max-h-[68vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2"
              onDragOver={(event) => { if (canEditAsset) event.preventDefault(); }}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = event.dataTransfer.getData("text/plain");
                const dragged = rows.find((asset) => Number(asset.id) === Number(draggedId));
                if (dragged) handleDrop(dragged, null);
              }}
            >
              {companyTrees.map((company) => (
                <AssetCompanyNode
                  key={company.id}
                  company={company}
                  rows={rows}
                  selectedId={selectedAsset?.id}
                  expanded={expanded}
                  onToggle={toggleExpanded}
                  onSelect={setSelectedAssetId}
                  onDropAsset={handleDrop}
                  canManage={canEditAsset}
                  language={language}
                />
              ))}
              {!companyTrees.some((company) => company.children.length) ? <EmptyState title={t("No equipment")} message="Add Site assets first, then attach areas, systems, equipment, and components." /> : null}
            </div>
          </Panel>

          <AssetDetailsPanel
            asset={selectedAsset}
            rows={rows}
            departments={departments}
            workOrders={workOrders}
            pmTasks={pmTasks}
            inventory={inventory}
            onEdit={onEdit}
            onDelete={onDelete}
            canManage={canEditAsset || canDeleteAsset}
            canEdit={canEditAsset}
            canDelete={canDeleteAsset}
            lifecycle={assetLifecycle}
            lifecycleLoading={assetLifecycleLoading}
            lifecycleError={assetLifecycleError}
            onAddLifecycleItem={handleAssetLifecycleCreate}
            language={language}
          />
        </div>
      ) : null}

      {activeAssetSection === "assets" ? (
        <Panel
          title={t("Assets")}
          subtitle={t("Create, update, and control operational records through the existing REST API.")}
          actions={canCreateAsset ? (
            <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              {t("New Record")}
            </button>
          ) : null}
        >
          <DataTable columns={assetConfig.columns} rows={rows} onEdit={canEditAsset ? onEdit : null} onDelete={canDeleteAsset ? onDelete : null} emptyMessage={t("No equipment")} labels={tableLabels(language)} />
        </Panel>
      ) : null}
    </div>
  );
}

function AssetCompanyNode({ company, rows, selectedId, expanded, onToggle, onSelect, onDropAsset, canManage, language }) {
  const isOpen = expanded[`company-${company.id}`] ?? true;
  return (
    <div className="mb-2">
      <div
        className="mb-1 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-2"
        onDragOver={(event) => { if (canManage) event.preventDefault(); }}
        onDrop={(event) => {
          event.preventDefault();
          const draggedId = event.dataTransfer.getData("text/plain");
          const dragged = rows.find((asset) => Number(asset.id) === Number(draggedId));
          if (dragged) onDropAsset(dragged, null);
        }}
      >
        <button type="button" onClick={() => onToggle(`company-${company.id}`)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-blue-700 hover:bg-white/70">
          {company.children.length ? <span className={`text-xs font-black transition ${isOpen ? "rotate-90" : ""}`}>{">"}</span> : <span>-</span>}
        </button>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-blue-700">
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{company.name}</p>
          <p className="truncate text-xs font-semibold text-blue-700">Company / Location Root</p>
        </div>
      </div>
      {isOpen ? company.children.map((node) => (
        <AssetTreeNode
          key={node.id}
          node={node}
          rows={rows}
          selectedId={selectedId}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          onDropAsset={onDropAsset}
          canManage={canManage}
          depth={1}
          language={language}
        />
      )) : null}
    </div>
  );
}

function AssetTreeNode({ node, rows, selectedId, expanded, onToggle, onSelect, onDropAsset, canManage, depth, language }) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded[node.id] ?? depth < 2;
  const selected = Number(selectedId) === Number(node.id);
  const meta = assetLevelMeta(node.asset_level);
  const Icon = meta.icon;
  return (
    <div>
      <div
        className={`group mb-1 flex items-center gap-2 rounded-lg border px-2 py-2 transition ${
          selected ? "border-blue-300 bg-blue-50" : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
        }`}
        style={{ marginInlineStart: depth * 16 }}
        draggable={canManage}
        onDragStart={(event) => event.dataTransfer.setData("text/plain", String(node.id))}
        onDragOver={(event) => { if (canManage) event.preventDefault(); }}
        onDrop={(event) => {
          event.preventDefault();
          const draggedId = event.dataTransfer.getData("text/plain");
          const dragged = rows.find((asset) => Number(asset.id) === Number(draggedId));
          if (dragged && Number(dragged.id) !== Number(node.id)) onDropAsset(dragged, node.id);
        }}
      >
        <button type="button" onClick={() => onToggle(node.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-500 hover:bg-slate-100">
          {hasChildren ? <span className={`text-xs font-black transition ${isOpen ? "rotate-90" : ""}`}>{">"}</span> : <span className="text-slate-300">-</span>}
        </button>
        <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${meta.bg} ${meta.fg}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{node.name}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{node.asset_code || `AST-${node.id}`} - {node.asset_level || "Equipment"}</p>
            </div>
          </div>
        </button>
        <AssetHealthDot value={node.status} />
      </div>
      {hasChildren && isOpen ? node.children.map((child) => (
        <AssetTreeNode key={child.id} node={child} rows={rows} selectedId={selectedId} expanded={expanded} onToggle={onToggle} onSelect={onSelect} onDropAsset={onDropAsset} canManage={canManage} depth={depth + 1} language={language} />
      )) : null}
    </div>
  );
}

function AssetDetailsPanel({ asset, rows, departments, workOrders, pmTasks, inventory, onEdit, onDelete, canManage, canEdit = canManage, canDelete = canManage, lifecycle = {}, lifecycleLoading = false, lifecycleError = "", onAddLifecycleItem, language }) {
  const t = (text) => tr(language, text);
  if (!asset) {
    return <Panel title="Asset Details"><EmptyState title={t("No equipment")} message="Select an asset from the tree." /></Panel>;
  }
  const parent = rows.find((item) => Number(item.id) === Number(asset.parent_id));
  const children = rows.filter((item) => Number(item.parent_id) === Number(asset.id));
  const customer = departments.find((item) => Number(item.id) === Number(asset.customer_id));
  const linkedOrders = workOrders.filter((item) => Number(item.equipment_id) === Number(asset.id));
  const linkedPm = pmTasks.filter((item) => Number(item.equipment_id) === Number(asset.id));
  const linkedParts = inventory.filter((item) => String(item.location || "").toLowerCase().includes(String(asset.name || "").toLowerCase()) || Number(item.linked_work_order_id) && linkedOrders.some((order) => Number(order.id) === Number(item.linked_work_order_id)));
  const breadcrumb = buildAssetBreadcrumb(asset, rows);
  const health = lifecycle.health || {};
  const healthScore = Number(health.health_score ?? 100);
  const costTotal = Number(health.maintenance_cost ?? (Number(asset.total_maintenance_cost || 0) + Number(asset.spare_parts_cost || 0) + Number(asset.labor_cost || 0) + Number(asset.contractor_cost || 0)));
  const timelineRows = lifecycle.timeline?.length ? lifecycle.timeline : lifecycle.history || [];
  const statusText = health.health_status || asset.current_condition || "Excellent";
  return (
    <Panel
      title="Asset Details"
      subtitle={breadcrumb.map((item) => item.name).join(" / ")}
      actions={canManage ? (
        <div className="flex gap-2">
          {canEdit ? <button type="button" onClick={() => onEdit(asset)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">Edit Asset</button> : null}
          {canDelete ? <button type="button" onClick={() => onDelete(asset.id)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">Delete</button> : null}
        </div>
      ) : null}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <AssetInfoTile label="Asset Code" value={asset.asset_code || `AST-${asset.id}`} />
        <AssetInfoTile label="Level" value={asset.asset_level || "Equipment"} />
        <AssetInfoTile label="Status" value={asset.status || "Active"} badge={<AssetHealthDot value={asset.status} />} />
        <AssetInfoTile label="Parent" value={parent?.name || (asset.asset_level === "Site" ? "Root Site" : "Not assigned")} />
        <AssetInfoTile label="Location" value={asset.location || customer?.name || t("Not configured")} />
        <AssetInfoTile label="Criticality" value={asset.criticality || "Medium"} />
      </div>

      {lifecycleError ? (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
          {lifecycleError}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Asset Health Score</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-black text-slate-950">{healthScore}</span>
                <span className="pb-2 text-sm font-black uppercase text-slate-500">/ 100</span>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${healthScore >= 80 ? "bg-emerald-50 text-emerald-700" : healthScore >= 60 ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"}`}>
              {statusText}
            </span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${healthScore >= 80 ? "bg-emerald-500" : healthScore >= 60 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${Math.max(Math.min(healthScore, 100), 0)}%` }} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AssetMiniMetric label="Availability" value={`${Number(health.availability ?? 100).toFixed(1)}%`} />
            <AssetMiniMetric label="MTBF" value={`${Number(health.mtbf ?? 0).toLocaleString()}h`} />
            <AssetMiniMetric label="MTTR" value={`${Number(health.mttr ?? 0).toLocaleString()}h`} />
            <AssetMiniMetric label="Downtime" value={`${Number(health.total_downtime_hours ?? 0).toLocaleString()}h`} />
            <AssetMiniMetric label="PM Compliance" value={`${Number(health.pm_compliance ?? 100).toFixed(0)}%`} />
            <AssetMiniMetric label="Open W.O." value={Number(health.open_work_orders ?? linkedOrders.length).toLocaleString()} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Lifecycle Profile</p>
          <div className="mt-4 grid gap-3">
            <AssetDetailLine label="Manufacturer" value={asset.manufacturer} />
            <AssetDetailLine label="Model" value={asset.model} />
            <AssetDetailLine label="Serial Number" value={asset.serial_number} />
            <AssetDetailLine label="Category" value={asset.category || asset.asset_type} />
            <AssetDetailLine label="Site / Department" value={[asset.site || customer?.name, asset.department].filter(Boolean).join(" / ")} />
            <AssetDetailLine label="QR / Barcode" value={[asset.qr_code, asset.barcode].filter(Boolean).join(" / ")} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <AssetRelationList title="Lifecycle Dates" rows={[
          `Installed: ${asset.installation_date || "-"}`,
          `Commissioned: ${asset.commission_date || "-"}`,
          `Warranty: ${asset.warranty_start || "-"} to ${asset.warranty_end || "-"}`,
          `Expected Life: ${asset.expected_life_years || 0} years`
        ]} empty="No lifecycle dates" />
        <AssetRelationList title="Operational Readings" rows={[
          `Runtime Hours: ${Number(asset.current_hours || 0).toLocaleString()} hrs`,
          `Last Reading: ${Number(asset.last_reading || 0).toLocaleString()}`,
          `Current Reading: ${Number(asset.current_reading || 0).toLocaleString()}`,
          `Last PM: ${asset.last_pm_date || asset.last_maintenance_date || "-"}`
        ]} empty="No readings" />
        <AssetRelationList title="Cost Summary" rows={[
          `Purchase Cost: ${Number(asset.purchase_cost || 0).toLocaleString()} EGP`,
          `Replacement Cost: ${Number(asset.replacement_cost || 0).toLocaleString()} EGP`,
          `Maintenance Cost: ${costTotal.toLocaleString()} EGP`,
          `Parts / Labor / Contractors: ${Number(asset.spare_parts_cost || 0).toLocaleString()} / ${Number(asset.labor_cost || 0).toLocaleString()} / ${Number(asset.contractor_cost || 0).toLocaleString()} EGP`
        ]} empty="No cost data" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <AssetRelationList title="Children" rows={children.map((item) => `${item.asset_code || `AST-${item.id}`} - ${item.name}`)} empty="No child assets" />
        <AssetRelationList title="Linked Work Orders" rows={linkedOrders.map((item) => `${item.title} (${item.status})`)} empty="No linked work orders" />
        <AssetRelationList title="Preventive Maintenance" rows={linkedPm.map((item) => `${item.task_name} - ${item.pm_alert || item.status}`)} empty="No PM tasks" />
        <AssetRelationList title="Spare Parts" rows={linkedParts.map((item) => `${item.part_number || "PART"} - ${item.name} (${item.stock_quantity} ${item.unit || "pcs"})`)} empty="No linked spare parts" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AssetTimeline rows={timelineRows} loading={lifecycleLoading} />
        <div className="space-y-4">
          <AssetRelationList title="Asset Events" rows={(lifecycle.events || []).map((item) => `${item.event_type} - ${item.severity} - ${item.status}`)} empty="No asset events" />
          <AssetRelationList title="Failure History" rows={(lifecycle.failures || []).map((item) => `${item.failure_id} - ${item.severity} - ${item.status}`)} empty="No failure events" />
          <AssetRelationList title="Downtime History" rows={(lifecycle.downtime || []).map((item) => `${item.start_time} - ${Number(item.total_downtime_minutes || 0)} min - ${item.downtime_category || "Downtime"}`)} empty="No downtime events" />
          <AssetRelationList title="Measurements" rows={(lifecycle.measurements || []).map((item) => `${item.reading_date || item.created_at}: ${item.measurement_type} = ${item.value} ${item.unit || ""}`)} empty="No measurements" />
          <AssetRelationList title="Documents" rows={(lifecycle.documents || []).map((item) => `${item.document_type} - ${item.title}${item.file_url ? ` (${item.file_url})` : ""}`)} empty="No documents" />
          <AssetRelationList title="Photos" rows={(lifecycle.photos || []).map((item) => `${item.photo_type} - ${item.title}${item.file_url ? ` (${item.file_url})` : ""}`)} empty="No photos" />
        </div>
      </div>

      {canEdit && onAddLifecycleItem ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <AssetLifecycleForm type="measurement" title="Add Measurement" onSubmit={(payload) => onAddLifecycleItem("measurement", payload)} />
          <AssetLifecycleForm type="document" title="Add Document" onSubmit={(payload) => onAddLifecycleItem("document", payload)} />
          <AssetLifecycleForm type="photo" title="Add Photo" onSubmit={(payload) => onAddLifecycleItem("photo", payload)} />
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
          <GitBranch className="h-4 w-4 text-blue-700" />
          Roll-up Logic
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Component failures roll up to parent Equipment, then System. Reports can aggregate work orders, downtime, and PM exposure through this parent-child path.
        </p>
      </div>
    </Panel>
  );
}

function AssetMiniSelect({ value, onChange, options, label }) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option || "all"} value={option}>{option || "All"}</option>)}
      </select>
    </label>
  );
}

function AssetInfoTile({ label, value, badge }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-950">{badge}{value || "-"}</div>
    </div>
  );
}

function AssetRelationList({ title, rows, empty }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((item, index) => <div key={index} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{item}</div>)}
        {!rows.length ? <p className="text-sm font-semibold text-slate-400">{empty}</p> : null}
      </div>
    </div>
  );
}

function AssetMiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function AssetDetailLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <span className="max-w-[58%] text-right text-sm font-bold text-slate-800">{value || "-"}</span>
    </div>
  );
}

function AssetTimeline({ rows = [], loading = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">Asset Timeline</h3>
        {loading ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">Loading</span> : null}
      </div>
      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
        {rows.map((item) => (
          <div key={`${item.id}-${item.created_at}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-950">{item.title || item.event_type}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.description || item.source_module || "Asset lifecycle event"}</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">{item.event_type || "Event"}</span>
            </div>
            <p className="mt-2 text-xs font-bold text-blue-700">{item.created_at}</p>
          </div>
        ))}
        {!rows.length ? <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400">No timeline entries recorded yet.</p> : null}
      </div>
    </div>
  );
}

function AssetLifecycleForm({ type, title, onSubmit }) {
  const initial = type === "measurement"
    ? { measurement_type: "Runtime Hours", value: "", unit: "hrs", reading_date: todayIso(), notes: "" }
    : type === "document"
      ? { document_type: "Manual", title: "", file_name: "", file_url: "", description: "" }
      : { photo_type: "Current Photo", title: "", file_name: "", file_url: "", description: "" };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (type === "measurement" && (form.value === "" || Number(form.value) < 0)) return;
    if (type !== "measurement" && !String(form.title || "").trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        value: type === "measurement" ? Number(form.value) : form.value
      });
      setForm(initial);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {type === "measurement" ? (
          <>
            <AssetFormInput label="Type" value={form.measurement_type} onChange={(value) => update("measurement_type", value)} />
            <AssetFormInput label="Value" type="number" value={form.value} onChange={(value) => update("value", value)} />
            <AssetFormInput label="Unit" value={form.unit} onChange={(value) => update("unit", value)} />
            <AssetFormInput label="Reading Date" type="date" value={form.reading_date} onChange={(value) => update("reading_date", value)} />
            <AssetFormInput label="Notes" value={form.notes} onChange={(value) => update("notes", value)} />
          </>
        ) : (
          <>
            <AssetFormInput label={type === "document" ? "Document Type" : "Photo Type"} value={type === "document" ? form.document_type : form.photo_type} onChange={(value) => update(type === "document" ? "document_type" : "photo_type", value)} />
            <AssetFormInput label="Title" value={form.title} onChange={(value) => update("title", value)} />
            <AssetFormInput label="File Name" value={form.file_name} onChange={(value) => update("file_name", value)} />
            <AssetFormInput label="File URL" value={form.file_url} onChange={(value) => update("file_url", value)} />
            <AssetFormInput label="Description" value={form.description} onChange={(value) => update("description", value)} />
          </>
        )}
      </div>
      <button type="submit" disabled={saving} className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-60">
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

function AssetFormInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white" />
    </label>
  );
}

function AssetHealthDot({ value }) {
  const status = String(value || "Active").toLowerCase();
  const color = status.includes("down") ? "bg-red-500" : status.includes("maintenance") || status.includes("warning") ? "bg-orange-500" : "bg-emerald-500";
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} title={value || "Active"} />;
}

function normalizeAssetForm(value) {
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

function normalizePreventiveMaintenanceForm(value) {
  const intervalHours = Number(value.interval_hours || 0);
  return {
    ...value,
    interval_hours: intervalHours,
    interval_days: calculateIntervalDays(intervalHours),
    next_due_date: "",
    last_service_date: value.last_service_date || ""
  };
}

function normalizePMPlanForm(value) {
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

function normalizeEngineerForm(value) {
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

function employeeCode(employee) {
  return employee?.employee_code || `EMP-${String(employee?.id || 0).padStart(4, "0")}`;
}

function employeeJobTitle(employee) {
  return employee?.job_title || employee?.specialty || "-";
}

function employeeDepartment(employee) {
  return employee?.department || "Maintenance";
}

function employeeWorkLocation(employee) {
  return employee?.work_location || employee?.location || "-";
}

function employeeSupervisor(employee) {
  return employee?.supervisor || "-";
}

function employeeRole(role) {
  return normalizeEmployeeRole(role);
}

function isTechnicianEmployee(employee) {
  return String(employee?.role || "").toLowerCase() === "technician" || /technician/i.test(employeeJobTitle(employee));
}

function isEngineerEmployee(employee) {
  return /engineer/i.test(employeeJobTitle(employee));
}

function isManagementEmployee(employee) {
  const title = employeeJobTitle(employee).toLowerCase();
  return MANAGEMENT_JOB_TITLE_ALIASES.some((value) => title === String(value).toLowerCase());
}

function isSupervisorEmployee(employee) {
  return String(employee?.role || "").toLowerCase() === "supervisor" || /supervisor/i.test(employeeJobTitle(employee));
}

function employeeMatchesGroup(employee, group) {
  if (!group) return false;
  if (group === "all") return true;
  if (group === "active") return employee?.status === "active" && !isManagementEmployee(employee);
  if (group === "technicians") return isTechnicianEmployee(employee);
  if (group === "engineers") return isEngineerEmployee(employee);
  if (group === "management") return isManagementEmployee(employee);
  if (group === "supervisors") return isSupervisorEmployee(employee);
  return true;
}

function employeeGroupTitle(group, language = "en") {
  const titles = {
    all: "Total Employees",
    active: "Active Staff",
    technicians: "Technicians",
    engineers: "Engineers",
    management: "Management",
    supervisors: "Supervisors"
  };
  return tr(language, titles[group] || "Employees");
}

function employeeRoleLabel(role) {
  const labels = {
    admin: "Admin",
    engineer: "Engineer",
    store_keeper: "Store Keeper",
    viewer: "Regular User",
    user: "Regular User"
  };
  return labels[normalizeEmployeeRole(role)] || "Regular User";
}

function isSystemAdminAccount(employee) {
  const name = String(employee?.name || "").trim().toLowerCase();
  const username = String(employee?.username || "").trim().toLowerCase();
  const jobTitle = String(employee?.job_title || employee?.specialty || "").trim().toLowerCase();
  return name === "system administrator" || username === "ecs-ecs" || jobTitle === "super admin";
}

function businessEmployees(employees = []) {
  return employees.filter((employee) => !isSystemAdminAccount(employee));
}

function jobTitleOptions(jobTitles = [], employees = []) {
  const hiddenTitles = new Set(["super admin", "system admin", "system administrator"]);
  const titles = uniqueSorted([
    ...jobTitles.map((item) => item.name),
    ...employees.map((employee) => employee.job_title || employee.specialty),
    "Shift Engineer",
    "Maintenance Engineer",
    ...MANAGEMENT_JOB_TITLES,
    "Senior Electrical Technician",
    "Mechanical Technician",
    "Electrical Technician",
    "Maintenance Supervisor",
    "Technician"
  ].filter((title) => !hiddenTitles.has(String(title || "").trim().toLowerCase())));
  return titles.map((title) => ({ value: title, label: title }));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => String(first).localeCompare(String(second), undefined, { sensitivity: "base" }));
}

function createDashboardFilters() {
  return {
    year: "all",
    month: "all",
    dateFrom: "",
    dateTo: "",
    category: "all",
    equipment: "all",
    location: "all"
  };
}

function buildDashboardFilterOptions(data, alerts, language = "en") {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const pmTasks = data["preventive-maintenance"] || [];
  const years = uniqueSorted([
    ...workOrders.map((order) => dashboardDateParts(getWorkOrderSavedDate(order)).year),
    ...pmTasks.map((task) => dashboardDateParts(task.next_due_date || task.last_service_date).year),
    ...alerts.map((alert) => dashboardDateParts(alert.next_maintenance_date || alert.created_at).year)
  ]).map((year) => ({ value: String(year), label: String(year) }));

  const months = Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1);
    const label = new Date(2026, index, 1).toLocaleString(language === "ar" ? "ar-EG" : "en-US", { month: "long" });
    return { value, label };
  });

  const categories = uniqueSorted([
    ...equipment.map((asset) => asset.asset_type || asset.asset_level),
    ...equipment.map((asset) => asset.asset_level)
  ]).map((value) => ({ value, label: value }));

  const equipmentOptions = sortEquipmentByName(equipment).map((asset) => ({
    value: String(asset.id),
    label: asset.name || `Asset ${asset.id}`
  }));

  const locations = uniqueSorted([
    ...(data.customers || []).map((customer) => customer.name),
    ...equipment.map((asset) => asset.customer_name || asset.location),
    ...equipment.map((asset) => asset.location),
    ...workOrders.map((order) => order.customer_name),
    ...alerts.map((alert) => alert.location)
  ]).map((value) => ({ value, label: value }));

  return { years, months, categories, equipment: equipmentOptions, locations };
}

function applyDashboardFilters(data, alerts, filters) {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const equipmentById = new Map(equipment.map((asset) => [Number(asset.id), asset]));
  const workOrderFiltered = workOrders.filter((order) => dashboardWorkOrderMatches(order, equipmentById.get(Number(order.equipment_id)), filters));
  const filteredEquipmentIds = new Set(workOrderFiltered.map((order) => Number(order.equipment_id)).filter(Boolean));
  const orderScoped = filters.year !== "all" || filters.month !== "all" || filters.dateFrom || filters.dateTo || filters.equipment !== "all";
  const equipmentFiltered = equipment.filter((asset) => {
    if (!dashboardEquipmentMatches(asset, filters)) return false;
    return orderScoped ? filteredEquipmentIds.has(Number(asset.id)) : true;
  });
  const equipmentScopeIds = new Set(equipmentFiltered.map((asset) => Number(asset.id)));
  const locationsInScope = new Set(equipmentFiltered.flatMap((asset) => [asset.customer_name, asset.location].filter(Boolean).map(normalizeChoice)));

  return {
    data: {
      ...data,
      customers: (data.customers || []).filter((customer) => filters.location === "all" || locationsInScope.has(normalizeChoice(customer.name))),
      engineers: (data.engineers || []).filter((engineer) => filters.location === "all" || ["Available for All Sites", engineer.work_location, engineer.location].some((value) => matchesFilterValue(value, filters.location))),
      equipment: equipmentFiltered,
      "work-orders": workOrderFiltered,
      inventory: (data.inventory || []).filter((item) => filters.location === "all" || matchesFilterValue(item.location, filters.location)),
      "preventive-maintenance": (data["preventive-maintenance"] || []).filter((task) => {
        const asset = equipmentById.get(Number(task.equipment_id));
        if (!asset || !equipmentScopeIds.has(Number(asset.id))) return false;
        if (!matchesDashboardDate(task.next_due_date || task.last_service_date, filters)) return false;
        return true;
      })
    },
    alerts: (alerts || []).filter((alert) => dashboardAlertMatches(alert, equipmentFiltered, filters))
  };
}

function dashboardWorkOrderMatches(order, asset, filters) {
  const meta = parseWorkOrderNotes(order.notes);
  if (!matchesDashboardDate(getWorkOrderSavedDate(order) || order.scheduled_date || order.due_date, filters)) return false;
  if (filters.equipment !== "all" && String(order.equipment_id || "") !== String(filters.equipment)) return false;
  if (!matchesAnyFilterValue([asset?.asset_type, asset?.asset_level], filters.category)) return false;
  if (!matchesAnyFilterValue([order.customer_name, asset?.customer_name, asset?.location, meta.location], filters.location)) return false;
  return true;
}

function dashboardEquipmentMatches(asset, filters) {
  if (filters.equipment !== "all" && String(asset.id || "") !== String(filters.equipment)) return false;
  if (!matchesAnyFilterValue([asset.asset_type, asset.asset_level], filters.category)) return false;
  if (!matchesAnyFilterValue([asset.customer_name, asset.location], filters.location)) return false;
  return true;
}

function dashboardAlertMatches(alert, filteredEquipment, filters) {
  if (!matchesDashboardDate(alert.next_maintenance_date || alert.created_at, filters)) return false;
  if (!matchesAnyFilterValue([alert.location], filters.location)) return false;
  if (filters.equipment !== "all") {
    const selectedAsset = filteredEquipment.find((asset) => String(asset.id) === String(filters.equipment));
    return selectedAsset ? normalizeChoice(selectedAsset.name) === normalizeChoice(alert.equipment_name) : false;
  }
  if (filters.category === "all") return true;
  const alertName = normalizeChoice(alert.equipment_name);
  return filteredEquipment.some((asset) => normalizeChoice(asset.name) === alertName);
}

function matchesDashboardDate(value, filters) {
  const parts = dashboardDateParts(value);
  if (filters.year !== "all" && String(parts.year) !== String(filters.year)) return false;
  if (filters.month !== "all" && String(parts.month) !== String(filters.month)) return false;
  const date = dashboardDateValue(value);
  if (filters.dateFrom) {
    const from = dashboardDateValue(filters.dateFrom);
    if (!date || !from || date < from) return false;
  }
  if (filters.dateTo) {
    const to = dashboardDateValue(filters.dateTo);
    if (!date || !to || date > to) return false;
  }
  return true;
}

function dashboardDateParts(value) {
  const date = dashboardDateValue(value);
  if (!date) return { year: "", month: "" };
  return { year: String(date.getFullYear()), month: String(date.getMonth() + 1) };
}

function dashboardDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function matchesAnyFilterValue(values, selected) {
  if (selected === "all") return true;
  return values.some((value) => matchesFilterValue(value, selected));
}

function matchesFilterValue(value, selected) {
  if (selected === "all") return true;
  return normalizeChoice(value) === normalizeChoice(selected);
}

function normalizeChoice(value) {
  return String(value || "").replace(/_/g, " ").trim().toLowerCase();
}

function calculateIntervalDays(intervalHours) {
  if (!Number(intervalHours)) return 0;
  return Math.ceil(Number(intervalHours) / 24);
}

function classifyAssetLevel(assetType = "", name = "") {
  const text = `${assetType} ${name}`.toLowerCase();
  if (/(bearing|seal|gasket|connector|component)/.test(text)) return "Component";
  if (/(cooling system|system|radiator|ignition)/.test(text)) return "System";
  if (/(pump|motor|generator|engine|compressor|equipment)/.test(text)) return "Equipment";
  if (/(area|department|unit)/.test(text)) return "Area / Department";
  if (/(site|plant|company)/.test(text)) return "Site";
  return "Equipment";
}

function nextAssetLevel(level) {
  const levels = ["Site", "Area / Department", "System", "Equipment", "Component"];
  const index = levels.indexOf(level || "Site");
  return levels[Math.min(index + 1, levels.length - 1)] || "Equipment";
}

function buildAssetTree(rows, search = "", filters = {}) {
  const normalized = rows.map((row) => ({ ...row, children: [] }));
  const byId = new Map(normalized.map((row) => [Number(row.id), row]));
  const rootNodes = [];
  normalized.forEach((row) => {
    const parent = byId.get(Number(row.parent_id));
    if (parent && Number(parent.id) !== Number(row.id)) {
      parent.children.push(row);
    } else {
      rootNodes.push(row);
    }
  });
  const sortedRoots = sortAssetNodes(rootNodes);
  const query = search.trim().toLowerCase();
  if (!query && !filters.status && !filters.level && !filters.criticality) return sortedRoots;
  return filterAssetNodes(sortedRoots, query, filters);
}

function sortAssetNodes(nodes) {
  return nodes
    .sort((first, second) => String(first.asset_code || first.name).localeCompare(String(second.asset_code || second.name), undefined, { numeric: true }))
    .map((node) => ({ ...node, children: sortAssetNodes(node.children || []) }));
}

function filterAssetNodes(nodes, query, filters) {
  return nodes.reduce((result, node) => {
    const children = filterAssetNodes(node.children || [], query, filters);
    const matchesQuery = !query || [node.name, node.asset_code, node.location].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = !filters.status || String(node.status || "").toLowerCase() === filters.status.toLowerCase();
    const matchesLevel = !filters.level || node.asset_level === filters.level;
    const matchesCriticality = !filters.criticality || node.criticality === filters.criticality;
    if ((matchesQuery && matchesStatus && matchesLevel && matchesCriticality) || children.length) {
      result.push({ ...node, children });
    }
    return result;
  }, []);
}

function assetLevelMeta(level = "Equipment") {
  const map = {
    Site: { icon: Building2, bg: "bg-blue-50", fg: "text-blue-700" },
    "Area / Department": { icon: Factory, bg: "bg-cyan-50", fg: "text-cyan-700" },
    System: { icon: Layers3, bg: "bg-violet-50", fg: "text-violet-700" },
    Equipment: { icon: Cpu, bg: "bg-orange-50", fg: "text-orange-700" },
    Component: { icon: Box, bg: "bg-slate-100", fg: "text-slate-700" }
  };
  return map[level] || { icon: Wrench, bg: "bg-slate-100", fg: "text-slate-700" };
}

function canPlaceAssetUnder(asset, parent, rows) {
  if (!asset || !parent) return asset?.asset_level === "Site";
  if (Number(asset.id) === Number(parent.id)) return false;
  if (getDescendantIds(asset.id, rows).has(Number(parent.id))) return false;
  const levels = ["Site", "Area / Department", "System", "Equipment", "Component"];
  const childLevel = nextAssetLevel(parent.asset_level);
  return levels.indexOf(childLevel) > levels.indexOf(parent.asset_level);
}

function getDescendantIds(assetId, rows) {
  const descendants = new Set();
  const stack = rows.filter((row) => Number(row.parent_id) === Number(assetId));
  while (stack.length) {
    const current = stack.pop();
    descendants.add(Number(current.id));
    stack.push(...rows.filter((row) => Number(row.parent_id) === Number(current.id)));
  }
  return descendants;
}

function buildAssetBreadcrumb(asset, rows) {
  const path = [];
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  let cursor = asset;
  const visited = new Set();
  while (cursor && !visited.has(Number(cursor.id))) {
    path.unshift(cursor);
    visited.add(Number(cursor.id));
    cursor = byId.get(Number(cursor.parent_id));
  }
  return path;
}

const DOCUMENT_CODE = "WO-GEN-F-001";
const ISSUE_NO = "1";
const ISSUE_DATE = "2-Jul-26";

function WorkOrdersPage({ rows, customers, equipment, engineers, onSave, onDelete, onLifecycleAction, onBackToEquipment, canManage, canCreate = canManage, canEdit = canManage, canDelete = canManage, language }) {
  const t = (text) => tr(language, text);
  const [selectedSavedId, setSelectedSavedId] = useState(rows[0]?.id || "");
  const [savedFilter, setSavedFilter] = useState({ equipmentId: "", date: "" });
  const [editingId, setEditingId] = useState(null);
  const [viewingSavedId, setViewingSavedId] = useState(null);
  const [form, setForm] = useState(() => createWorkOrderForm({ equipment, customers, engineers, rows }));
  const [activeWorkOrderTab, setActiveWorkOrderTab] = useState("overview");
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [lifecycleDraft, setLifecycleDraft] = useState({
    engineer_id: "",
    runtime_reading: "",
    notes: "",
    reason: "",
    completion_notes: "",
    supervisor_notes: "",
    checklist_completed: false
  });
  const workOrderSectionRef = useRef(null);
  const videoRef = useRef(null);
  const qrStreamRef = useRef(null);
  const selectedEquipment = equipment.find((item) => Number(item.id) === Number(form.equipment_id));
  const selectedCustomer = customers.find((item) => Number(item.id) === Number(form.customer_id));
  const selectedEngineer = engineers.find((item) => Number(item.id) === Number(form.engineer_id));
  const filteredEquipment = form.customer_id
    ? equipment.filter((item) => Number(item.customer_id) === Number(form.customer_id))
    : [];
  const woReference = buildWorkOrderReference(form, selectedCustomer, selectedEquipment);
  const duration = calculateDuration(form.start_time, form.finished_time);
  const savedEquipmentOptions = useMemo(() => {
    const usedEquipmentIds = new Set(rows.map((row) => Number(row.equipment_id)).filter(Boolean));
    return equipment
      .filter((item) => usedEquipmentIds.has(Number(item.id)))
      .slice()
      .sort((first, second) => `${first.customer_name || ""} ${first.name || ""}`.localeCompare(`${second.customer_name || ""} ${second.name || ""}`));
  }, [rows, equipment]);
  const savedRowsByEquipment = useMemo(() => {
    if (!savedFilter.equipmentId) return rows;
    return rows.filter((row) => Number(row.equipment_id) === Number(savedFilter.equipmentId));
  }, [rows, savedFilter.equipmentId]);
  const savedDateOptions = useMemo(() => (
    Array.from(new Set(savedRowsByEquipment.map(getWorkOrderSavedDate).filter(Boolean))).sort().reverse()
  ), [savedRowsByEquipment]);
  const filteredSavedRows = useMemo(() => {
    if (!savedFilter.date) return savedRowsByEquipment;
    return savedRowsByEquipment.filter((row) => getWorkOrderSavedDate(row) === savedFilter.date);
  }, [savedRowsByEquipment, savedFilter.date]);
  const selectedSavedOrder = rows.find((row) => Number(row.id) === Number(selectedSavedId));

  useEffect(() => {
    if (!form.equipment_id && !form.customer_id && !rows.length && !equipment.length) {
      setForm(createWorkOrderForm({ equipment, customers, engineers, rows }));
    }
  }, [equipment, customers, engineers]);

  useEffect(() => {
    if (filteredSavedRows.length && !filteredSavedRows.some((row) => Number(row.id) === Number(selectedSavedId))) {
      setSelectedSavedId(filteredSavedRows[0].id);
    }
    if (!filteredSavedRows.length && selectedSavedId) {
      setSelectedSavedId("");
    }
  }, [filteredSavedRows, selectedSavedId]);

  useEffect(() => () => {
    qrStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseCustomer(value) {
    setForm((current) => {
      const currentAsset = equipment.find((item) => Number(item.id) === Number(current.equipment_id));
      const assetStillMatches = currentAsset && Number(currentAsset.customer_id) === Number(value);
      return {
        ...current,
        customer_id: value,
        equipment_id: assetStillMatches ? current.equipment_id : "",
        service_hours: assetStillMatches ? Number(currentAsset.current_hours || 0) : 0,
        serial_number: assetStillMatches ? currentAsset.serial_number || "" : "",
        location: assetStillMatches ? currentAsset.location || "" : "",
        wo_no: assetStillMatches ? getNextWorkOrderNo(rows, current.equipment_id) : getNextWorkOrderNo(rows, "")
      };
    });
  }

  function chooseEquipment(value) {
    const asset = equipment.find((item) => Number(item.id) === Number(value));
    if (!value || !asset) {
      setForm((current) => ({
        ...current,
        equipment_id: "",
        service_hours: 0,
        serial_number: "",
        location: "",
        wo_no: getNextWorkOrderNo(rows, "")
      }));
      return;
    }
    setForm((current) => ({
      ...current,
      equipment_id: value,
      customer_id: asset?.customer_id || current.customer_id,
      service_hours: Number(asset?.current_hours || 0),
      serial_number: asset?.serial_number || "",
      location: asset?.location || "",
      wo_no: getNextWorkOrderNo(rows, value)
    }));
  }

  function updateMember(index, value) {
    setForm((current) => ({
      ...current,
      appointed_members_list: current.appointed_members_list.map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  }

  function addMember() {
    setForm((current) => ({
      ...current,
      appointed_members_list: [...current.appointed_members_list, ""]
    }));
  }

  function updateSparePart(index, patch) {
    setForm((current) => ({
      ...current,
      spare_parts_items: current.spare_parts_items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  }

  function addSparePart() {
    setForm((current) => ({
      ...current,
      spare_parts_items: [...current.spare_parts_items, { name: "", qty: 1 }]
    }));
  }

  function updatePhotos(key, photos) {
    setForm((current) => ({ ...current, [key]: photos }));
  }

  function updateSignature(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function openQrScanner() {
    setQrOpen(true);
    setQrMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setQrMessage("Camera is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      qrStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanQrFrame();
    } catch {
      setQrMessage("Camera permission was not granted.");
    }
  }

  function closeQrScanner() {
    qrStreamRef.current?.getTracks().forEach((track) => track.stop());
    qrStreamRef.current = null;
    setQrOpen(false);
  }

  async function scanQrFrame() {
    if (!("BarcodeDetector" in window)) {
      setQrMessage("BarcodeDetector is not supported. Select equipment manually.");
      return;
    }
    const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "code_39"] });
    const loop = async () => {
      if (!qrStreamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length) {
          const raw = codes[0].rawValue;
          const asset = equipment.find((item) => [String(item.id), item.name, item.serial_number].filter(Boolean).some((value) => raw.includes(String(value))));
          if (asset) {
            chooseEquipment(asset.id);
            closeQrScanner();
            return;
          }
          setQrMessage(`Scanned: ${raw}`);
        }
      } catch {
        setQrMessage("Unable to scan this frame.");
      }
      window.setTimeout(loop, 700);
    };
    loop();
  }

  function newWorkOrder() {
    setEditingId(null);
    setViewingSavedId(null);
    setForm(createWorkOrderForm({ equipment, customers, engineers, rows }));
  }

  function openSelected(id = selectedSavedId) {
    const selected = rows.find((row) => Number(row.id) === Number(id));
    if (!selected) return;
    setSelectedSavedId(selected.id);
    setEditingId(null);
    setViewingSavedId(selected.id);
    setForm(formFromSavedOrder(selected, equipment, customers, engineers));
    window.requestAnimationFrame(() => {
      workOrderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function editSelected() {
    if (!canEdit) return;
    const selected = rows.find((row) => Number(row.id) === Number(selectedSavedId));
    if (!selected) return;
    setViewingSavedId(null);
    setEditingId(selected.id);
    setForm(formFromSavedOrder(selected, equipment, customers, engineers));
    window.requestAnimationFrame(() => {
      workOrderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function deleteSelected() {
    if (!canDelete) return;
    if (!selectedSavedId) return;
    const confirmed = window.confirm(language === "ar" ? "هل تريد حذف أمر العمل المحدد؟" : "Delete the selected work order?");
    if (!confirmed) return;
    await onDelete(selectedSavedId);
    setEditingId(null);
    setViewingSavedId(null);
    setSelectedSavedId("");
  }

  async function runLifecycle(action) {
    if (!selectedSavedOrder || !onLifecycleAction) return;
    const payload = {
      ...lifecycleDraft,
      engineer_id: lifecycleDraft.engineer_id ? Number(lifecycleDraft.engineer_id) : Number(selectedSavedOrder.engineer_id || form.engineer_id || 0),
      runtime_reading: lifecycleDraft.runtime_reading === "" ? Number(selectedSavedOrder.service_hours || form.service_hours || 0) : Number(lifecycleDraft.runtime_reading),
      notes: lifecycleDraft.notes,
      reason: lifecycleDraft.reason,
      completion_notes: lifecycleDraft.completion_notes || lifecycleDraft.notes,
      supervisor_notes: lifecycleDraft.supervisor_notes || lifecycleDraft.notes,
      checklist_completed: Boolean(lifecycleDraft.checklist_completed)
    };
    const ok = await onLifecycleAction(selectedSavedOrder.id, action, payload);
    if (ok) {
      setLifecycleDraft((current) => ({
        ...current,
        notes: "",
        reason: "",
        completion_notes: "",
        supervisor_notes: "",
        checklist_completed: false
      }));
    }
  }

  async function saveWorkOrder() {
    if (viewingSavedId && !editingId) return;
    if (editingId && !canEdit) return;
    if (!editingId && !canCreate) return;
    if (!form.customer_id || !form.equipment_id || !form.engineer_id) {
      window.alert(language === "ar" ? "اختر العميل والمعدة ومهندس الوردية قبل الحفظ." : "Select customer, equipment, and shift engineer before saving.");
      return;
    }

    const serviceHours = Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0);
    const taskDescription = form.task_description?.trim() || "Maintenance work order";
    const payload = {
      title: `${woReference} - ${taskDescription}`.trim(),
      description: taskDescription,
      customer_id: Number(form.customer_id),
      equipment_id: Number(form.equipment_id),
      engineer_id: Number(form.engineer_id),
      scheduled_date: form.start_date || todayIso(),
      due_date: form.finished_date || form.start_date || todayIso(),
      status: form.status,
      priority: form.priority,
      service_hours: serviceHours,
      notes: JSON.stringify({
        __workOrderDocument: true,
        ...form,
        service_hours: serviceHours,
        wo_reference: woReference,
        document_code: DOCUMENT_CODE,
        issue_no: ISSUE_NO,
        issue_date: ISSUE_DATE,
        duration,
        inventory_deducted_at: form.status === "completed" ? new Date().toISOString() : form.inventory_deducted_at || ""
      })
    };

    const wasEditing = Boolean(editingId);
    const saved = await onSave(payload, editingId);
    if (saved) {
      if (form.status === "completed") {
        notifyManagerApproval(t);
      }
      setEditingId(null);
      if (!wasEditing) {
        setViewingSavedId(null);
        setForm((current) => ({ ...current, wo_no: String(Number(current.wo_no || 0) + 1).padStart(4, "0") }));
      }
    }
  }

  function exportWorkOrderPdf() {
    if (selectedSavedOrder) {
      const exportForm = formFromSavedOrder(selectedSavedOrder, equipment, customers, engineers);
      const exportCustomer = customers.find((item) => Number(item.id) === Number(exportForm.customer_id));
      const exportEquipment = equipment.find((item) => Number(item.id) === Number(exportForm.equipment_id));
      const pdfTitle = buildWorkOrderPdfFileName(exportForm, exportCustomer, exportEquipment, selectedSavedOrder);

      setEditingId(selectedSavedOrder.id);
      setForm(exportForm);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => printWorkOrderPdf(pdfTitle));
      });
      return;
    }

    const pdfTitle = buildWorkOrderPdfFileName(form, selectedCustomer, selectedEquipment, null);
    printWorkOrderPdf(pdfTitle);
  }

  function printWorkOrderPdf(pdfTitle) {
    const previousTitle = document.title;

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    document.title = pdfTitle;
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 30000);
  }

  const activeSavedOrder = viewingSavedId || editingId ? selectedSavedOrder : null;
  const currentStatus = normalizeWorkOrderStatus(activeSavedOrder?.status || form.status);
  const lifecycleActions = lifecycleActionsForStatus(currentStatus);
  const canRunAction = Boolean(activeSavedOrder && canEdit);
  const actionKeys = new Set(lifecycleActions.map((action) => action.key));
  const quickAssignedTo = form.assigned_to || selectedEngineer?.name || activeSavedOrder?.engineer_name || "-";
  const checklistProgress = activeSavedOrder?.checklist_completed || lifecycleDraft.checklist_completed ? 100 : 0;
  const partsTotal = (form.spare_parts_items || []).reduce((total, item) => total + Number(item.total || item.cost || 0), 0);
  const estimatedHours = duration && duration !== "0:00" ? duration : form.estimated_hours || "-";
  const smartAlerts = [
    !form.after_photos?.length ? "No after-maintenance photos" : "",
    checklistProgress < 100 ? "Checklist is not complete" : "",
    !form.signature_executor ? "Technician signature is missing" : "",
    !(form.spare_parts_items || []).some((item) => item.name) ? "No spare parts recorded" : ""
  ].filter(Boolean);
  const workOrderTabs = [
    ["overview", "Overview", Activity],
    ["checklist", "Checklist", CheckCircle2],
    ["labor", "Labor & Time", Clock3],
    ["parts", "Parts", Box],
    ["attachments", "Attachments", Paperclip],
    ["history", "History", TimerReset],
    ["notes", "Notes", MessageSquare]
  ];

  return (
    <div className="space-y-5">
      <section ref={workOrderSectionRef} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{t("Work Order")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="truncate text-2xl font-black text-slate-950">{woReference}</h2>
                <StatusBadge value={currentStatus} language={language} />
                <PriorityBadge value={form.priority} language={language} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-slate-600">
                <span>{selectedEquipment?.name || "Asset not selected"}</span>
                <span>{quickAssignedTo}</span>
                {viewingSavedId ? <span className="text-blue-700">{t("Viewing Saved Work Order")}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WorkOrderActionButton disabled={!canRunAction || !actionKeys.has("pause")} onClick={() => runLifecycle("pause")} label="Pause" />
              <WorkOrderActionButton disabled={!canRunAction || !actionKeys.has("waiting-parts")} onClick={() => runLifecycle("waiting-parts")} label="Waiting Parts" />
              <WorkOrderActionButton primary disabled={!canRunAction || !actionKeys.has("complete")} onClick={() => runLifecycle("complete")} label="Complete" />
              <div className="relative">
                <button type="button" onClick={() => setMoreActionsOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700" aria-label="More actions">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {moreActionsOpen ? (
                  <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <button type="button" onClick={exportWorkOrderPdf} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" />{t("Export PDF")}</button>
                    <button type="button" onClick={qrOpen ? closeQrScanner : openQrScanner} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><QrCode className="h-4 w-4" />{t("Scan Equipment QR")}</button>
                    <button type="button" onClick={onBackToEquipment} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />{t("Back to Equipment")}</button>
                  </div>
                ) : null}
              </div>
              {((editingId && canEdit) || (!editingId && !viewingSavedId && canCreate)) ? (
                <button type="button" onClick={saveWorkOrder} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-800">
                  <Save className="h-4 w-4" /> {editingId ? t("Save Changes") : t("Save Work Order")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 bg-slate-50 p-5 2xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:grid-cols-3">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Customer")}</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500" value={form.customer_id || ""} onChange={(event) => chooseCustomer(event.target.value)}>
                  <option value=""></option>
                  {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Equipment")}</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400" value={form.equipment_id || ""} onChange={(event) => chooseEquipment(event.target.value)} disabled={!form.customer_id}>
                  <option value=""></option>
                  {filteredEquipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Assigned To")}</span>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  value={form.engineer_id || ""}
                  onChange={(event) => {
                    const engineer = engineers.find((item) => Number(item.id) === Number(event.target.value));
                    setForm((current) => ({ ...current, engineer_id: event.target.value, shift_engineer_name: engineer?.name || current.shift_engineer_name }));
                  }}
                >
                  <option value=""></option>
                  {engineers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>
        {qrOpen ? (
          <div className="border-b border-slate-200 bg-slate-950 p-4 text-white">
            <div className="mx-auto max-w-xl">
              <video ref={videoRef} className="aspect-video w-full rounded-xl border border-cyan-300/40 bg-black object-cover" muted playsInline />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-300">{qrMessage || t("Scan Equipment QR")}</p>
                <button type="button" onClick={closeQrScanner} className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950">{t("Close Camera")}</button>
              </div>
            </div>
          </div>
        ) : null}

            <WorkOrderQuickInfo
              fields={[
                ["Asset", selectedEquipment?.name || "-"],
                ["Location", selectedCustomer?.name || selectedEquipment?.location || form.location || "-"],
                ["PM / Corrective", form.maintenance_type || "-"],
                ["Reporter", form.shift_engineer_name || selectedEngineer?.name || "-"],
                ["Assigned To", quickAssignedTo],
                ["Planned Date", form.start_date || "-"],
                ["Estimated Hours", estimatedHours],
                ["Current Runtime", `${Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0).toLocaleString()} h`]
              ]}
            />

            {smartAlerts.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-black text-amber-900">Smart Alerts</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {smartAlerts.map((alert) => <span key={alert} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">{alert}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-3">
                {workOrderTabs.map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveWorkOrderTab(key)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${activeWorkOrderTab === key ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeWorkOrderTab === "overview" ? (
                  <WorkOrderOverviewTab
                    form={form}
                    update={update}
                    status={currentStatus}
                    selectedEquipment={selectedEquipment}
                    selectedCustomer={selectedCustomer}
                    photosBefore={form.before_photos}
                    photosAfter={form.after_photos}
                    updatePhotos={updatePhotos}
                    language={language}
                  />
                ) : null}
                {activeWorkOrderTab === "checklist" ? (
                  <WorkOrderChecklistTab
                    draft={lifecycleDraft}
                    setDraft={setLifecycleDraft}
                    checklistProgress={checklistProgress}
                    form={form}
                  />
                ) : null}
                {activeWorkOrderTab === "labor" ? (
                  <WorkOrderLaborTab
                    form={form}
                    update={update}
                    draft={lifecycleDraft}
                    setDraft={setLifecycleDraft}
                    duration={duration}
                    selectedEquipment={selectedEquipment}
                    selectedEngineer={selectedEngineer}
                  />
                ) : null}
                {activeWorkOrderTab === "parts" ? (
                  <WorkOrderPartsTab items={form.spare_parts_items} onChange={updateSparePart} onAdd={addSparePart} total={partsTotal} />
                ) : null}
                {activeWorkOrderTab === "attachments" ? (
                  <WorkOrderAttachmentsTab form={form} updateSignature={updateSignature} labels={{ clear: t("Clear Signature") }} />
                ) : null}
                {activeWorkOrderTab === "history" ? (
                  <WorkOrderHistoryTab order={activeSavedOrder} />
                ) : null}
                {activeWorkOrderTab === "notes" ? (
                  <WorkOrderNotesTab form={form} update={update} selectedEngineer={selectedEngineer} />
                ) : null}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">KPI Sidebar</p>
              <div className="mt-4 grid gap-3">
                <WorkOrderKpi label="Execution Duration" value={duration} />
                <WorkOrderKpi label="Completion" value={`${checklistProgress}%`} tone={checklistProgress === 100 ? "green" : "amber"} />
                <WorkOrderKpi label="Labor Cost" value="0 EGP" />
                <WorkOrderKpi label="Parts Cost" value={`${partsTotal.toLocaleString()} EGP`} />
                <WorkOrderKpi label="Total Cost" value={`${partsTotal.toLocaleString()} EGP`} />
                <WorkOrderKpi label="Downtime" value={duration} tone={duration === "0:00" ? "slate" : "red"} />
              </div>
            </div>

            <div className="rounded-2xl bg-blue-700 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">QR Code</p>
                  <p className="mt-2 text-sm font-bold text-blue-50">Open this work order from mobile.</p>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-white text-blue-700">
                  <QrCode className="h-9 w-9" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-black text-slate-950">AI Suggestions</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Future assistant area for prior failures, running hours, and suggested actions.</p>
            </div>
          </aside>
        </div>

        <div className="work-order-print-area hidden bg-white p-0">
          <div className="mx-auto min-w-[1120px] max-w-[1280px] border-2 border-slate-950 bg-white text-[12px] text-slate-950 shadow-sm">
            <div className="grid grid-cols-[340px_1fr_260px] border-b-2 border-slate-950">
              <div className="grid grid-cols-[150px_1fr] border-r-2 border-slate-950">
                <DocLabel>{t("Document Code")}:</DocLabel><DocStatic>{DOCUMENT_CODE}</DocStatic>
                <DocLabel>{t("Issue No")}:</DocLabel><DocStatic>{ISSUE_NO}</DocStatic>
                <DocLabel>{t("Issue Date")}:</DocLabel><DocStatic>{ISSUE_DATE}</DocStatic>
                <DocLabel>{t("W.O No")}:</DocLabel><DocStatic>{form.wo_no}</DocStatic>
              </div>
              <div className="grid place-items-center border-r-2 border-slate-950 px-4 text-center text-xl font-black">
                Maintenance Work Order
              </div>
              <div className="grid place-items-center p-4">
                <div className="text-center text-slate-900">
                  <div className="text-3xl font-black tracking-[0.18em]">CMMS</div>
                  <div className="mt-1 text-[11px] font-bold leading-tight">Maintenance<br />Management<br />System</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950">
              <DocSectionLabel>Firstly</DocSectionLabel>
              <div className="bg-white" />
            </div>
            <div className="grid grid-cols-[340px_1fr] border-b border-slate-950">
              <DocLabel>{t("THE WORK ORDER IS ISSUED BY SHIFT ENGINEER")}:</DocLabel>
              <DocSelect value={form.shift_engineer_name} onChange={(value) => update("shift_engineer_name", value)} options={engineers.map((item) => item.name)} />
              <DocLabel>{t("FOR REQUESTING AND ASSIGN THE TASK FOR")}:</DocLabel>
              <DocSelect value={form.assigned_to} onChange={(value) => update("assigned_to", value)} options={engineers.map((item) => item.name)} />
            </div>
            <DocBand>{t("The Names of appointed Members to perform the task are")}:-</DocBand>
            <NumberedMembersEditor members={form.appointed_members_list} onChange={updateMember} onAdd={addMember} options={engineers.map((item) => item.name)} addLabel={t("Add member")} />

            <DocBand>{t("The Description & details of the required task to be done / undertaken is")}:-</DocBand>
            <div className="grid grid-cols-[1fr_240px_220px] border-b-2 border-slate-950">
              <DocTextarea value={form.task_description} onChange={(value) => update("task_description", value)} rows={8} />
              <div className="border-l-2 border-slate-950">
                <DocBand>{t("RH / Service Hours")}</DocBand>
                <div className="grid h-16 place-items-center border-b-2 border-slate-950 text-lg font-black">{Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0).toLocaleString()} hours</div>
                <div className="grid h-16 place-items-center border-b-2 border-slate-950 text-sm font-bold">S.N: {selectedEquipment?.serial_number || form.serial_number || "-"}</div>
                <DocBand>{t("The Start Of Task")}</DocBand>
                <DocManualTimeRow label={t("Starting Time is")} value={form.start_time} onChange={(value) => update("start_time", value)} />
                <DocDateRow label={t("Day in")} value={form.start_date} onChange={(value) => update("start_date", value)} />
                <DocBand>{t("The End of The Task")}</DocBand>
                <DocManualTimeRow label={t("Finished Time is")} value={form.finished_time} onChange={(value) => update("finished_time", value)} />
                <DocDateRow label={t("Day in")} value={form.finished_date} onChange={(value) => update("finished_date", value)} />
                <DocBand>{t("Duration")}</DocBand>
                <div className="grid h-12 place-items-center border-b border-slate-950 bg-white text-lg font-black">{duration}</div>
              </div>
              <div className="border-l-2 border-slate-950">
                <DocBand>{t("Location")}</DocBand>
                <div className="grid h-[126px] place-items-center border-b-2 border-slate-950 px-3 text-center text-lg font-black">{selectedCustomer?.name || selectedEquipment?.location || "-"}</div>
                <DocStackSelect label={t("Type of maintenance")} value={form.maintenance_type} onChange={(value) => update("maintenance_type", value)} options={["Service", "Condition Based / Predictive", "Periodic / Time based", "Breakdown"]} />
                <DocStackSelect label={t("Priority")} value={form.priority} onChange={(value) => update("priority", value)} options={["low", "medium", "high", "critical"]} />
                <DocStackSelect label={t("Status")} value={form.status} onChange={(value) => update("status", value)} options={["pending", "in_progress", "completed", "cancelled"]} />
              </div>
            </div>

            <div className="grid grid-cols-2 border-b-2 border-slate-950">
              <DocField shaded label={t("Work Order Executor Name")} value={form.executor_name} onChange={(value) => update("executor_name", value)} options={engineers.map((item) => item.name)} />
              <DocField shaded label={t("Job Title")} value={form.executor_job_title} onChange={(value) => update("executor_job_title", value)} options={["Shift Engineer", "Senior Electrical Technician", "Mechanical Technician", "Maintenance Engineer"]} />
            </div>

            <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950">
              <DocSectionLabel>Thirdly</DocSectionLabel>
              <div />
            </div>
            <div className="grid grid-cols-[1fr_420px] border-b-2 border-slate-950">
              <DocBox shadedLabel label={t("The Necessary requirements before starting the mentioned task")} value={form.requirements} onChange={(value) => update("requirements", value)} />
              <InventorySpareParts items={form.spare_parts_items} onChange={updateSparePart} onAdd={addSparePart} labels={{ title: t("Inventory-linked spare parts"), part: t("Part name"), qty: t("Qty"), add: t("Add part") }} />
              <DocBox shadedLabel label="QHSE INSTRUCTIONS" value={form.qhse_instructions} onChange={(value) => update("qhse_instructions", value)} />
              <DocBox shadedLabel label={t("Safety Responsible")} value={form.safety_responsible} onChange={(value) => update("safety_responsible", value)} />
            </div>

            <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950">
              <DocSectionLabel>Fourthly</DocSectionLabel>
              <div />
            </div>
            <DocBox shadedLabel label={t("Site Preparation")} value={form.site_preparation} onChange={(value) => update("site_preparation", value)} wide />
            <div className="grid grid-cols-[1fr_1fr] border-b-2 border-slate-950">
              <DocField shaded label={t("Work Order Holder Name")} value={form.holder_name} onChange={(value) => update("holder_name", value)} options={engineers.map((item) => item.name)} />
              <DocField shaded label={t("Job Title")} value={form.holder_job_title} onChange={(value) => update("holder_job_title", value)} options={["Senior Electrical Technician", "Shift Engineer", "Maintenance Engineer"]} />
              <SignaturePad title={`${t("Signature")}: ${t("Work Order Holder Name")}`} value={form.signature_executor} onChange={(value) => updateSignature("signature_executor", value)} labels={{ clear: t("Clear Signature") }} />
              <SignaturePad title={`${t("Signature")}: ${t("Shift Engineer Name")}`} value={form.signature_shift_engineer} onChange={(value) => updateSignature("signature_shift_engineer", value)} labels={{ clear: t("Clear Signature") }} />
            </div>

            <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950">
              <DocSectionLabel>Fifth</DocSectionLabel>
              <DocStatic>Ending the Work Order</DocStatic>
            </div>
            <DocBand>We have worked to fulfill the assigned task to us in accordance with the work order reference number and now we have finished the task.</DocBand>
            <DocBox label={t("Recommendation")} value={form.recommendation} onChange={(value) => update("recommendation", value)} wide />
            <div className="grid grid-cols-2 border-b-2 border-slate-950">
              <DocField shaded label={t("Executive Name")} value={form.executive_name} onChange={(value) => update("executive_name", value)} options={engineers.map((item) => item.name)} />
              <DocField shaded label={t("Shift Engineer Name")} value={form.shift_engineer_name} onChange={(value) => update("shift_engineer_name", value)} options={engineers.map((item) => item.name)} />
              <DocStatic>{t("Signature")}:</DocStatic>
              <DocStatic>{t("Signature")}:</DocStatic>
            </div>
            <div className="grid grid-cols-[1fr_1fr] border-b-2 border-slate-950">
              <DocStatic shaded>Manager Signature</DocStatic>
              <DocSelect value={form.manager_name} onChange={(value) => update("manager_name", value)} options={engineers.map((item) => item.name)} />
            </div>
            <SignaturePad title={`${t("Digital Signature")}: Manager Signature`} value={form.signature_manager} onChange={(value) => updateSignature("signature_manager", value)} labels={{ clear: t("Clear Signature") }} />
          </div>
        </div>

        <div className="hidden gap-4 border-t border-slate-200 bg-white p-4 lg:grid-cols-2">
          <PhotoUploader title={t("Before Maintenance Photos")} photos={form.before_photos} onChange={(photos) => updatePhotos("before_photos", photos)} uploadLabel={t("Upload Photos")} />
          <PhotoUploader title={t("After Maintenance Photos")} photos={form.after_photos} onChange={(photos) => updatePhotos("after_photos", photos)} uploadLabel={t("Upload Photos")} />
        </div>

        {((editingId && canEdit) || (!editingId && !viewingSavedId && canCreate)) ? (
          <div className="hidden flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button type="button" onClick={saveWorkOrder} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
              <Save className="h-4 w-4" /> {editingId ? t("Save Changes") : t("Save Work Order")}
            </button>
          </div>
        ) : null}
      </section>

      <Panel
        title={t("Saved Work Orders")}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openSelected} disabled={!selectedSavedId} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">{t("Open Selected")}</button>
            {canEdit ? <button type="button" onClick={editSelected} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">{t("Edit Selected")}</button> : null}
            {canDelete ? <button type="button" onClick={deleteSelected} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">{t("Delete Selected")}</button> : null}
            <button type="button" onClick={exportWorkOrderPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" />{t("Export PDF")}</button>
            {canCreate ? <button type="button" onClick={newWorkOrder} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">{t("New Work Order")}</button> : null}
          </div>
        }
      >
        <SavedWorkOrderFilters
          equipment={savedEquipmentOptions}
          dates={savedDateOptions}
          value={savedFilter}
          onChange={(patch) => {
            setSavedFilter((current) => ({
              ...current,
              ...patch,
              ...(Object.prototype.hasOwnProperty.call(patch, "equipmentId") ? { date: "" } : {})
            }));
          }}
          language={language}
        />
        <SavedWorkOrdersTable rows={filteredSavedRows} selectedId={selectedSavedId} setSelectedId={setSelectedSavedId} onOpen={openSelected} language={language} />
      </Panel>

    </div>
  );
}

function WorkOrderActionButton({ label, onClick, disabled, primary = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-11 rounded-xl px-4 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${primary ? "bg-blue-700 text-white hover:bg-blue-800" : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"}`}
    >
      {label}
    </button>
  );
}

function WorkOrderQuickInfo({ fields }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">Quick Information</h3>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">CMMS Summary</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
            <span className="truncate text-right text-sm font-black text-slate-950">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkOrderKpi({ label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100"
  };
  return (
    <div className={`rounded-xl p-3 ring-1 ${tones[tone] || tones.blue}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function WorkOrderOverviewTab({ form, update, status, selectedEquipment, selectedCustomer, photosBefore, photosAfter, updatePhotos, language }) {
  const t = (text) => tr(language, text);
  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <ModernTextArea label="Work Description" value={form.task_description} onChange={(value) => update("task_description", value)} rows={5} />
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Current Status</p>
              <div className="mt-2"><StatusBadge value={status} language={language} /></div>
            </div>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-blue-500" value={form.status || ""} onChange={(event) => update("status", event.target.value)}>
              {["pending", "assigned", "accepted", "in_progress", "waiting_for_parts", "completed", "approved", "closed", "cancelled"].map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
            </select>
          </div>
          <div className="mt-5">
            <WorkOrderLifecycleProgress status={status} />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CompactPhotoUploader title={t("Before Maintenance Photos")} photos={photosBefore || []} onChange={(photos) => updatePhotos("before_photos", photos)} />
          <CompactPhotoUploader title={t("After Maintenance Photos")} photos={photosAfter || []} onChange={(photos) => updatePhotos("after_photos", photos)} />
        </div>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <h3 className="text-sm font-black text-slate-950">Summary</h3>
        <div className="mt-4 space-y-3">
          <SummaryLine label="Asset" value={selectedEquipment?.name || "-"} />
          <SummaryLine label="Location" value={selectedCustomer?.name || selectedEquipment?.location || "-"} />
          <SummaryLine label="Serial Number" value={selectedEquipment?.serial_number || form.serial_number || "-"} />
          <SummaryLine label="Runtime" value={`${Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0).toLocaleString()} h`} />
          <SummaryLine label="Maintenance Type" value={form.maintenance_type || "-"} />
        </div>
      </div>
    </div>
  );
}

function WorkOrderLifecycleProgress({ status }) {
  const steps = ["new", "assigned", "accepted", "in_progress", "paused", "waiting_for_parts", "completed", "reviewed", "closed"];
  const aliases = { pending: "new", on_hold: "paused", pending_supervisor_review: "reviewed", approved: "reviewed" };
  const active = aliases[status] || status;
  const activeIndex = Math.max(steps.indexOf(active), 0);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[760px] items-center">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          return (
            <Fragment key={step}>
              <div className="flex flex-col items-center gap-2">
                <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black ${isActive ? "bg-blue-700 text-white shadow-lg shadow-blue-200" : isDone ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {index + 1}
                </div>
                <span className={`whitespace-nowrap text-[11px] font-black uppercase tracking-[0.08em] ${isActive ? "text-blue-700" : "text-slate-500"}`}>{step.replaceAll("_", " ")}</span>
              </div>
              {index < steps.length - 1 ? <div className={`mx-2 h-1 flex-1 rounded-full ${index < activeIndex ? "bg-emerald-500" : "bg-slate-200"}`} /> : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function WorkOrderChecklistTab({ draft, setDraft, checklistProgress, form }) {
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const tasks = [
    form.task_description || "Work description confirmed",
    form.requirements || "Necessary requirements checked",
    "Safety and QHSE requirements reviewed",
    "Photos and completion evidence prepared"
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">Checklist Completion</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Work order completion requires 100% checklist confirmation.</p>
          </div>
          <p className="text-3xl font-black text-blue-700">{checklistProgress}%</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${checklistProgress}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div key={`${task}-${index}`} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[40px_1fr_180px_1fr]">
            <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300" checked={Boolean(draft.checklist_completed)} onChange={(event) => update("checklist_completed", event.target.checked)} />
            <p className="text-sm font-black text-slate-950">{task}</p>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" defaultValue="">
              <option value="">Result</option>
              <option>OK</option>
              <option>Needs action</option>
              <option>N/A</option>
            </select>
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Comments" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkOrderLaborTab({ form, update, draft, setDraft, duration, selectedEquipment, selectedEngineer }) {
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <ModernField label="Technician" value={selectedEngineer?.name || form.assigned_to || "-"} readOnly />
        <div className="grid gap-3 sm:grid-cols-2">
          <ModernTimeField label="Start Time" value={form.start_time} onChange={(value) => update("start_time", value)} />
          <ModernTimeField label="Finish Time" value={form.finished_time} onChange={(value) => update("finished_time", value)} />
          <ModernDateField label="Start Date" value={form.start_date} onChange={(value) => update("start_date", value)} />
          <ModernDateField label="Finish Date" value={form.finished_date} onChange={(value) => update("finished_date", value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <WorkOrderKpi label="Break Time" value="0:00" tone="slate" />
          <WorkOrderKpi label="Working Hours" value={duration} />
          <WorkOrderKpi label="Downtime" value={duration} tone={duration === "0:00" ? "slate" : "red"} />
        </div>
      </div>
      <div className="space-y-4">
        <ModernField label="Runtime Reading" value={draft.runtime_reading} onChange={(value) => updateDraft("runtime_reading", value)} placeholder={String(selectedEquipment?.current_hours || form.service_hours || 0)} type="number" />
        <ModernTextArea label="Completion Notes" value={draft.completion_notes} onChange={(value) => updateDraft("completion_notes", value)} rows={4} />
        <ModernTextArea label="Failure Cause" value={draft.reason} onChange={(value) => updateDraft("reason", value)} rows={3} />
      </div>
    </div>
  );
}

function WorkOrderPartsTab({ items, onChange, onAdd, total }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {["Part", "Code", "Warehouse", "Available", "Reserved", "Quantity Used", "Unit Cost", "Total"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><input className="w-full rounded-lg border border-slate-200 px-3 py-2 font-bold outline-none focus:border-blue-500" value={item.name || ""} onChange={(event) => onChange(index, { name: event.target.value })} /></td>
                  <td className="px-4 py-3 text-slate-500">-</td>
                  <td className="px-4 py-3 text-slate-500">Inventory</td>
                  <td className="px-4 py-3 text-slate-500">-</td>
                  <td className="px-4 py-3 text-slate-500">-</td>
                  <td className="px-4 py-3"><input type="number" min="0" className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center font-black outline-none focus:border-blue-500" value={item.qty || 0} onChange={(event) => onChange(index, { qty: Number(event.target.value) })} /></td>
                  <td className="px-4 py-3 text-slate-500">0</td>
                  <td className="px-4 py-3 font-black text-slate-950">0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onAdd} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">Add Part</button>
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-950">Total Parts Cost: {total.toLocaleString()} EGP</div>
      </div>
      <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">Inventory integration status: linked to spare parts workflow.</div>
    </div>
  );
}

function WorkOrderAttachmentsTab({ form, updateSignature, labels }) {
  const cards = ["PDF", "Excel", "Photos", "Manuals", "Videos", "Inspection Reports"];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">{card}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Attachment card</p>
              </div>
              <UploadCloud className="h-5 w-5 text-blue-700" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SignaturePad title="Technician Signature" value={form.signature_executor} onChange={(value) => updateSignature("signature_executor", value)} labels={labels} />
        <SignaturePad title="Supervisor Signature" value={form.signature_shift_engineer} onChange={(value) => updateSignature("signature_shift_engineer", value)} labels={labels} />
        <SignaturePad title="Manager Signature" value={form.signature_manager} onChange={(value) => updateSignature("signature_manager", value)} labels={labels} />
      </div>
    </div>
  );
}

function WorkOrderHistoryTab({ order }) {
  const timeline = order?.timeline || [];
  const fallback = [
    ["Created", order?.created_at],
    ["Assigned", order?.assigned_at],
    ["Accepted", order?.accepted_at],
    ["Started", order?.started_at],
    ["Paused", order?.paused_at],
    ["Waiting Parts", order?.waiting_parts_reason],
    ["Completed", order?.completed_at],
    ["Reviewed", order?.approved_at],
    ["Closed", order?.closed_at]
  ].filter(([, value]) => value);
  const rows = timeline.length ? timeline.map((event) => [event.event_type, event.created_at, event.actor_name, event.description]) : fallback.map(([label, value]) => [label, value, "", label]);
  return (
    <div className="space-y-3">
      {rows.map(([label, date, user, description], index) => (
        <div key={`${label}-${index}`} className="grid grid-cols-[16px_1fr] gap-3">
          <span className="mt-2 h-3 w-3 rounded-full bg-blue-700 shadow-[0_0_0_5px_rgba(37,99,235,0.12)]" />
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-950">{label}</p>
              <span className="text-xs font-bold text-slate-500">{formatLifecycleDate(date)}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{description || "Action recorded"}</p>
            {user ? <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-blue-700">{user}</p> : null}
          </div>
        </div>
      ))}
      {!rows.length ? <EmptyState title="No history yet" message="Actions will appear here after the work order is saved and progressed." /> : null}
    </div>
  );
}

function WorkOrderNotesTab({ form, update, selectedEngineer }) {
  const notes = [
    form.recommendation ? ["Recommendation", form.recommendation] : null,
    form.qhse_instructions ? ["QHSE", form.qhse_instructions] : null,
    form.site_preparation ? ["Site Preparation", form.site_preparation] : null
  ].filter(Boolean);
  return (
    <div className="space-y-5">
      <ModernTextArea label="Recommendation / Comment" value={form.recommendation} onChange={(value) => update("recommendation", value)} rows={4} />
      <div className="space-y-3">
        {notes.map(([title, comment], index) => (
          <div key={`${title}-${index}`} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">{(selectedEngineer?.name || title).slice(0, 1)}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-slate-950">{selectedEngineer?.name || "System User"}</p>
                <span className="text-xs font-bold text-slate-400">Now</span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{comment}</p>
            </div>
          </div>
        ))}
        {!notes.length ? <EmptyState title="No comments" message="Write a note above to document field observations." /> : null}
      </div>
    </div>
  );
}

function CompactPhotoUploader({ title, photos, onChange }) {
  async function handleFiles(files) {
    const next = await Promise.all(Array.from(files).map(readFileAsDataUrl));
    onChange([...photos, ...next].slice(0, 6));
  }
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{photos.length} images</p>
        </div>
        <label className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
          Upload
          <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleFiles(event.target.files || [])} />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <button key={index} type="button" onClick={() => window.open(photo, "_blank")} className="relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <img src={photo} alt="" className="h-20 w-full object-cover" />
            <span className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-slate-700">{index + 1}</span>
          </button>
        ))}
        {!photos.length ? <div className="col-span-4 rounded-xl border border-dashed border-slate-300 bg-white py-5 text-center text-xs font-bold text-slate-500">Drag & drop area / no photos</div> : null}
      </div>
    </div>
  );
}

function ModernField({ label, value, onChange, type = "text", placeholder = "", readOnly = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input type={type} readOnly={readOnly} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 read-only:bg-slate-50" value={value || ""} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

function ModernTextArea({ label, value, onChange, rows = 3 }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <textarea rows={rows} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-blue-500" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ModernDateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input type="date" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ModernTimeField({ label, value, onChange }) {
  const time = splitTime12(value);
  const updatePart = (patch) => onChange(joinTime12({ ...time, ...patch }));
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <select className="px-2 py-3 text-center text-sm font-bold outline-none" value={time.hour} onChange={(event) => updatePart({ hour: event.target.value })}>
          {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
        </select>
        <select className="border-x border-slate-200 px-2 py-3 text-center text-sm font-bold outline-none" value={time.minute} onChange={(event) => updatePart({ minute: event.target.value })}>
          {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
        <select className="px-2 py-3 text-center text-sm font-bold outline-none" value={time.period} onChange={(event) => updatePart({ period: event.target.value })}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </label>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <span className="truncate text-right text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function WorkOrderLifecyclePanel({ order, engineers, draft, setDraft, onAction, canEdit, language }) {
  const t = (text) => tr(language, text);
  const status = normalizeWorkOrderStatus(order.status);
  const actions = lifecycleActionsForStatus(status);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Panel title="Work Order Lifecycle Engine" subtitle="Production workflow, assignment, review, timeline, and execution control.">
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Current Status</p>
                <div className="mt-2"><WorkOrderStatus value={status} priority={order.priority} language={language} /></div>
              </div>
              <PriorityBadge value={order.priority} language={language} />
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <LifecycleInfo label="Assigned At" value={formatLifecycleDate(order.assigned_at)} />
              <LifecycleInfo label="Accepted At" value={formatLifecycleDate(order.accepted_at)} />
              <LifecycleInfo label="Started At" value={formatLifecycleDate(order.started_at)} />
              <LifecycleInfo label="Completed At" value={formatLifecycleDate(order.completed_at)} />
              <LifecycleInfo label="Approved At" value={formatLifecycleDate(order.approved_at)} />
              <LifecycleInfo label="Closed At" value={formatLifecycleDate(order.closed_at)} />
              <LifecycleInfo label="Duration" value={order.work_duration_minutes ? `${order.work_duration_minutes} min` : "-"} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">Assignment Card</h3>
            <label className="mt-3 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Technician / Resource</span>
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" value={draft.engineer_id || order.engineer_id || ""} onChange={(event) => update("engineer_id", event.target.value)}>
                <option value=""></option>
                {engineers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">Execution Details</h3>
            <div className="mt-3 grid gap-3">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Runtime Reading</span>
                <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" value={draft.runtime_reading} onChange={(event) => update("runtime_reading", event.target.value)} placeholder={String(order.service_hours || 0)} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Technician Notes</span>
                <textarea rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Reason</span>
                <textarea rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={draft.reason} onChange={(event) => update("reason", event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Completion Notes</span>
                <textarea rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={draft.completion_notes} onChange={(event) => update("completion_notes", event.target.value)} />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
                <input type="checkbox" checked={draft.checklist_completed} onChange={(event) => update("checklist_completed", event.target.checked)} />
                Checklist completed
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">Lifecycle Actions</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Only valid state transitions are enabled.</p>
              </div>
              <StatusBadge value={status} language={language} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onAction(action.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${action.tone}`}
                >
                  {action.label}
                </button>
              ))}
              {!actions.length ? <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">No available actions</span> : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LifecycleCard title="Approval Card" rows={[
              ["Approved By", order.approved_by_name || "-"],
              ["Supervisor Notes", order.supervisor_notes || "-"],
              ["Review Status", status === "pending_supervisor_review" ? "Awaiting review" : status]
            ]} />
            <LifecycleCard title="Parts Panel" rows={[
              ["Waiting Reason", order.waiting_parts_reason || "-"],
              ["Linked Parts", "Inventory-linked records"],
              ["Reservation", status === "waiting_for_parts" ? "Required" : "Not active"]
            ]} />
            <LifecycleCard title="Checklist Panel" rows={[
              ["Checklist", order.checklist_completed ? "Completed" : "Not completed"],
              ["Completion Notes", order.completion_notes || "-"],
              ["Runtime End", order.runtime_reading_end || order.service_hours || "-"]
            ]} />
            <LifecycleCard title="History Panel" rows={[
              ["Created", formatLifecycleDate(order.created_at)],
              ["Updated", formatLifecycleDate(order.updated_at)],
              ["Timeline Events", String(order.timeline?.length || 0)]
            ]} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">Status Timeline</h3>
            <div className="mt-4 space-y-3">
              {(order.timeline || []).map((event) => (
                <div key={event.id} className="grid grid-cols-[14px_1fr] gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-950">{event.event_type}</p>
                      <span className="text-xs font-bold text-slate-500">{formatLifecycleDate(event.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{event.description}</p>
                    {event.from_status || event.to_status ? <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">{event.from_status || "-"} {"->"} {event.to_status || "-"}</p> : null}
                  </div>
                </div>
              ))}
              {!order.timeline?.length ? <EmptyState title="No lifecycle events" message="Timeline entries will appear after lifecycle actions." /> : null}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LifecycleInfo({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="text-right text-xs font-bold text-slate-800">{value || "-"}</span>
    </div>
  );
}

function LifecycleCard({ title, rows }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => <LifecycleInfo key={label} label={label} value={value} />)}
      </div>
    </div>
  );
}

function lifecycleActionsForStatus(status) {
  const actions = {
    draft: [{ key: "cancel", label: "Cancel", tone: "bg-red-600 hover:bg-red-700" }],
    new: [{ key: "assign", label: "Assign", tone: "bg-blue-700 hover:bg-blue-800" }, { key: "cancel", label: "Cancel", tone: "bg-red-600 hover:bg-red-700" }],
    pending: [{ key: "assign", label: "Assign", tone: "bg-blue-700 hover:bg-blue-800" }, { key: "cancel", label: "Cancel", tone: "bg-red-600 hover:bg-red-700" }],
    assigned: [{ key: "accept", label: "Accept", tone: "bg-emerald-600 hover:bg-emerald-700" }, { key: "pause", label: "On Hold", tone: "bg-orange-600 hover:bg-orange-700" }],
    accepted: [{ key: "start", label: "Start", tone: "bg-blue-700 hover:bg-blue-800" }, { key: "pause", label: "On Hold", tone: "bg-orange-600 hover:bg-orange-700" }],
    in_progress: [
      { key: "waiting-parts", label: "Waiting Parts", tone: "bg-orange-600 hover:bg-orange-700" },
      { key: "pause", label: "On Hold", tone: "bg-slate-700 hover:bg-slate-800" },
      { key: "complete", label: "Complete", tone: "bg-emerald-600 hover:bg-emerald-700" }
    ],
    waiting_for_parts: [{ key: "resume", label: "Resume", tone: "bg-blue-700 hover:bg-blue-800" }],
    on_hold: [{ key: "resume", label: "Resume", tone: "bg-blue-700 hover:bg-blue-800" }, { key: "cancel", label: "Cancel", tone: "bg-red-600 hover:bg-red-700" }],
    pending_supervisor_review: [{ key: "approve", label: "Approve", tone: "bg-emerald-600 hover:bg-emerald-700" }, { key: "reject", label: "Reject", tone: "bg-red-600 hover:bg-red-700" }],
    approved: [{ key: "close", label: "Close", tone: "bg-slate-950 hover:bg-slate-800" }]
  };
  return actions[status] || [];
}

function normalizeWorkOrderStatus(value) {
  return String(value || "new").toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function formatLifecycleDate(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 19);
}

function DocLabel({ children }) {
  return <div className="border-b border-r border-slate-950 bg-white px-2 py-2 text-center font-black">{children}</div>;
}

function DocStatic({ children, shaded = false }) {
  return <div className={`min-h-10 border-b border-slate-950 px-2 py-2 text-center font-bold ${shaded ? "bg-slate-300" : "bg-white"}`}>{children}</div>;
}

function DocSectionLabel({ children }) {
  return <div className="border-r-2 border-slate-950 bg-slate-200 px-3 py-2 text-center text-base font-black underline">{children}</div>;
}

function DocBand({ children }) {
  return <div className="border-b border-slate-950 bg-slate-300 px-2 py-1.5 text-sm font-black italic">{children}</div>;
}

function DocInput({ value, onChange }) {
  return <input className="h-full min-h-10 w-full border-b border-slate-950 bg-white px-2 text-center font-bold outline-none focus:bg-blue-50" value={value || ""} onChange={(event) => onChange(event.target.value)} />;
}

function DocSelect({ value, onChange, options }) {
  return (
    <select className="h-full min-h-10 w-full border-b border-slate-950 bg-white px-2 text-center font-bold outline-none focus:bg-blue-50" value={value || ""} onChange={(event) => onChange(event.target.value)}>
      <option value=""></option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function DocStackSelect({ label, value, onChange, options }) {
  return (
    <div className="border-b-2 border-slate-950">
      <DocBand>{label}</DocBand>
      <select className="h-12 w-full bg-white px-2 text-center text-sm font-black outline-none focus:bg-blue-50" value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value=""></option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function DocTextarea({ value, onChange, rows = 3, center = false }) {
  return <textarea rows={rows} className={`w-full resize-none border-b border-slate-950 bg-white p-2 text-sm outline-none focus:bg-blue-50 ${center ? "text-center text-lg font-black" : ""}`} value={value || ""} onChange={(event) => onChange(event.target.value)} />;
}

function NumberedMembersEditor({ members, onChange, onAdd, options, addLabel }) {
  return (
    <div className="min-h-20 border-b border-slate-950 bg-white p-2">
      <div className="space-y-2">
        {members.map((member, index) => (
          <div key={index} className="grid grid-cols-[42px_1fr] items-center gap-2">
            <div className="text-center text-sm font-black text-slate-950">{index + 1}.</div>
            <input
              className="border-b border-slate-200 px-2 py-1 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
              list={`appointed-members-${index}`}
              value={member}
              onChange={(event) => onChange(index, event.target.value)}
            />
            <datalist id={`appointed-members-${index}`}>
              {options.map((option) => <option key={option} value={option} />)}
            </datalist>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
        {addLabel}
      </button>
    </div>
  );
}

function DocManualTimeRow({ label, value, onChange }) {
  const time = splitTime12(value);
  const updatePart = (patch) => onChange(joinTime12({ ...time, ...patch }));
  return (
    <div className="grid grid-cols-[110px_1fr] border-b border-slate-950">
      <div className="px-2 py-2 text-center font-black">{label}:</div>
      <div className="grid grid-cols-3 bg-white text-center font-bold">
        <select className="border-l border-slate-200 bg-white px-1 py-2 text-center outline-none focus:bg-blue-50" value={time.hour} onChange={(event) => updatePart({ hour: event.target.value })}>
          {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
        </select>
        <select className="border-l border-slate-200 bg-white px-1 py-2 text-center outline-none focus:bg-blue-50" value={time.minute} onChange={(event) => updatePart({ minute: event.target.value })}>
          {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
        <select className="border-l border-slate-200 bg-white px-1 py-2 text-center outline-none focus:bg-blue-50" value={time.period} onChange={(event) => updatePart({ period: event.target.value })}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function DocDateRow({ label, value, onChange }) {
  return (
    <div className="grid grid-cols-[110px_1fr] border-b border-slate-950">
      <div className="px-2 py-2 text-center font-black">{label}:</div>
      <input type="date" className="bg-white px-2 text-center font-bold outline-none focus:bg-blue-50" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function DocField({ label, value, onChange, options, shaded = false }) {
  return (
    <div className="grid grid-cols-[220px_1fr] border-b border-slate-950">
      <div className={`border-r border-slate-950 px-2 py-2 text-center font-black ${shaded ? "bg-slate-300" : "bg-white"}`}>{label}:</div>
      <DocSelect value={value} onChange={onChange} options={options} />
    </div>
  );
}

function DocBox({ label, value, onChange, wide = false, shadedLabel = false }) {
  return (
    <div className={wide ? "border-b-2 border-slate-950" : "border-b border-slate-950"}>
      <div className={`border-b border-slate-950 px-2 py-1.5 text-sm font-black italic ${shadedLabel ? "bg-slate-300" : "bg-white"}`}>{label}</div>
      <textarea rows={wide ? 3 : 2} className="w-full resize-none bg-white p-2 outline-none focus:bg-blue-50" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function InventorySpareParts({ items, onChange, onAdd, labels }) {
  return (
    <div className="border-b border-slate-950">
      <div className="border-b border-slate-950 bg-slate-300 px-2 py-1.5 text-sm font-black italic">{labels.title}</div>
      <div className="space-y-2 bg-white p-2">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr_76px] gap-2">
            <input className="border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-500" placeholder={labels.part} value={item.name} onChange={(event) => onChange(index, { name: event.target.value })} />
            <input className="border border-slate-200 px-2 py-1 text-center text-xs font-bold outline-none focus:border-blue-500" type="number" min="0" placeholder={labels.qty} value={item.qty} onChange={(event) => onChange(index, { qty: Number(event.target.value) })} />
          </div>
        ))}
        <button type="button" onClick={onAdd} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
          {labels.add}
        </button>
      </div>
    </div>
  );
}

function SignaturePad({ title, value, onChange, labels }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const ctx = canvas.getContext("2d");
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  function point(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * canvas.width,
      y: ((source.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function start(event) {
    event.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const p = point(event);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="border-b border-slate-950 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black">{title}</span>
        <button type="button" onClick={clear} className="rounded border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-red-600">{labels.clear}</button>
      </div>
      <canvas
        ref={canvasRef}
        width="520"
        height="120"
        className="h-24 w-full touch-none rounded border border-slate-300 bg-white"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  );
}

function PhotoUploader({ title, photos, onChange, uploadLabel }) {
  async function handleFiles(files) {
    const next = await Promise.all(Array.from(files).map(readFileAsDataUrl));
    onChange([...photos, ...next].slice(0, 6));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-950"><UploadCloud className="h-4 w-4 text-blue-700" />{title}</h3>
        <label className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
          {uploadLabel}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleFiles(event.target.files || [])} />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img src={photo} alt="" className="h-24 w-full object-cover" />
            <button type="button" onClick={() => onChange(photos.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-xs font-black text-red-600">x</button>
          </div>
        ))}
        {!photos.length ? <div className="col-span-3 rounded-lg border border-dashed border-slate-300 bg-white py-8 text-center text-sm font-semibold text-slate-500">No photos uploaded</div> : null}
      </div>
    </div>
  );
}

function SavedWorkOrderFilters({ equipment, dates, value, onChange, language }) {
  const t = (text) => tr(language, text);
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-950">{t("Saved Work Orders")}</h3>
        <p className="text-xs font-semibold text-slate-500">{t("Filter by equipment then date to reach a saved work order faster.")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Equipment")}</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
            value={value.equipmentId}
            onChange={(event) => onChange({ equipmentId: event.target.value })}
          >
            <option value="">{t("All Equipment")}</option>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {[item.customer_name, item.name].filter(Boolean).join(" / ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Date")}</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            value={value.date}
            onChange={(event) => onChange({ date: event.target.value })}
            disabled={!value.equipmentId}
          >
            <option value="">{value.equipmentId ? t("All Dates") : t("Select equipment first")}</option>
            {dates.map((date) => <option key={date} value={date}>{formatShortDate(date)}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function SavedWorkOrdersTable({ rows, selectedId, setSelectedId, onOpen, language }) {
  const t = (text) => tr(language, text);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="overflow-auto">
        <table className="min-w-[1120px] w-full border-collapse text-xs">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="w-10 border border-slate-600 px-2 py-2"></th>
              <th className="border border-slate-600 px-2 py-2">{t("Date")}</th>
              <th className="border border-slate-600 px-2 py-2">W.O.</th>
              <th className="border border-slate-600 px-2 py-2">Asset</th>
              <th className="border border-slate-600 px-2 py-2">Task Description</th>
              <th className="border border-slate-600 px-2 py-2">Type of maintenance</th>
              <th className="border border-slate-600 px-2 py-2">Shift Engineer</th>
              <th className="border border-slate-600 px-2 py-2">{t("Techn.")}</th>
              <th className="border border-slate-600 px-2 py-2">R.H</th>
              <th className="border border-slate-600 px-2 py-2">{t("Duration")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const meta = parseWorkOrderNotes(row.notes);
              const reference = meta.wo_reference || `${row.customer_name || ""} ${row.equipment_name || ""}`.trim();
              const savedDate = getWorkOrderSavedDate(row);
              return (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  onDoubleClick={() => onOpen?.(row.id)}
                  className={`cursor-pointer ${Number(row.id) === Number(selectedId) ? "bg-blue-50" : "odd:bg-white even:bg-slate-50"} hover:bg-cyan-50`}
                >
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    <input type="radio" checked={Number(row.id) === Number(selectedId)} onChange={() => setSelectedId(row.id)} />
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-semibold">{formatShortDate(savedDate)}</td>
                  <td className="border border-slate-300 px-2 py-2 font-semibold">{reference}</td>
                  <td className="border border-slate-300 px-2 py-2">{row.customer_name} {row.equipment_name}</td>
                  <td className="border border-slate-300 px-2 py-2">{row.description}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{meta.maintenance_type || valueLabel(row.priority, language)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{meta.shift_engineer_name || row.engineer_name}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{meta.executor_name || meta.appointed_members || row.engineer_name}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-black">{row.service_hours}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-black">{meta.duration || calculateDuration(meta.start_time, meta.finished_time)}</td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">{t("No records found.")}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeesManagementPage({ rows, jobTitles = [], onCreate, onEdit, onDelete, onAddJobTitle, onDeleteJobTitle, canAdd, canEdit, canDelete, language }) {
  const t = (text) => tr(language, text);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ role: "", status: "", department: "" });
  const [activeGroup, setActiveGroup] = useState("");
  const departments = useMemo(() => uniqueSorted(rows.map(employeeDepartment).filter((value) => value !== "-")), [rows]);
  const scopedRows = useMemo(() => rows.filter((employee) => employeeMatchesGroup(employee, activeGroup)), [rows, activeGroup]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scopedRows.filter((employee) => {
      const searchable = [
        employeeCode(employee),
        employee.name,
        employeeJobTitle(employee),
        employeeDepartment(employee),
        employeeRoleLabel(employee.role),
        employee.phone,
        employee.email,
        employeeWorkLocation(employee),
        employeeSupervisor(employee),
        employee.status
      ].join(" ").toLowerCase();
      const matchesSearch = !term || searchable.includes(term);
      const matchesRole = !filters.role || employeeRole(employee.role) === filters.role;
      const matchesStatus = !filters.status || employee.status === filters.status;
      const matchesDepartment = !filters.department || employeeDepartment(employee) === filters.department;
      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [scopedRows, search, filters]);

  const activeStaff = rows.filter((employee) => employee.status === "active" && !isManagementEmployee(employee)).length;
  const technicians = rows.filter(isTechnicianEmployee).length;
  const engineers = rows.filter(isEngineerEmployee).length;
  const management = rows.filter(isManagementEmployee).length;
  const supervisors = rows.filter(isSupervisorEmployee).length;
  const activeGroupTitle = employeeGroupTitle(activeGroup, language);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <EmployeeMetricButton label={t("Total Employees")} value={rows.length} icon={UsersRound} tone="blue" helper={t("All registered staff")} active={activeGroup === "all"} onClick={() => setActiveGroup("all")} />
        <EmployeeMetricButton label={t("Active Staff")} value={activeStaff} icon={CheckCircle2} tone="green" helper={t("Active staff")} active={activeGroup === "active"} onClick={() => setActiveGroup("active")} />
        <EmployeeMetricButton label={t("Management")} value={management} icon={Building2} tone="slate" helper={t("Branch, site, and O&M managers")} active={activeGroup === "management"} onClick={() => setActiveGroup("management")} />
        <EmployeeMetricButton label={t("Engineers")} value={engineers} icon={ShieldCheck} tone="orange" helper={t("Engineering roles")} active={activeGroup === "engineers"} onClick={() => setActiveGroup("engineers")} />
        <EmployeeMetricButton label={t("Supervisors")} value={supervisors} icon={ShieldCheck} tone="green" helper={t("Supervision and team leadership roles")} active={activeGroup === "supervisors"} onClick={() => setActiveGroup("supervisors")} />
        <EmployeeMetricButton label={t("Technicians")} value={technicians} icon={Wrench} tone="cyan" helper={t("Technical execution roles")} active={activeGroup === "technicians"} onClick={() => setActiveGroup("technicians")} />
      </div>

      {activeGroup ? (
        <>
          <Panel
            title={`${t("Employees Management")} - ${activeGroupTitle}`}
            subtitle={t("SAP-style employee directory with role-based access, operational status, and maintenance team structure.")}
            actions={canAdd ? (
              <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
                <Plus className="h-4 w-4" />
                {t("Add Employee")}
              </button>
            ) : null}
          >
            <div className="mb-5 grid gap-3 xl:grid-cols-[1fr_180px_180px_220px]">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("Search employees")}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <EmployeeFilterSelect label={t("Role")} value={filters.role} onChange={(value) => setFilters((current) => ({ ...current, role: value }))} options={["", ...EMPLOYEE_ROLE_OPTIONS]} />
              <EmployeeFilterSelect label={t("Status")} value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={["", "active", "off_duty", "inactive"]} />
              <EmployeeFilterSelect label={t("Department")} value={filters.department} onChange={(value) => setFilters((current) => ({ ...current, department: value }))} options={["", ...departments]} />
            </div>

            <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
              {filteredRows.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} onEdit={canEdit ? onEdit : null} onDelete={canDelete ? onDelete : null} language={language} />
              ))}
              {!filteredRows.length ? <EmptyState title={t("No employees found")} message={t("Adjust search or filters to view staff records.")} /> : null}
            </div>
          </Panel>

          <Panel title={t("Employee Directory")} subtitle={t("Structured table for HR, maintenance, and access-control review.")}>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-auto">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      {["Employee ID", "Full Name", "Job Title", "Department", "Role", "Phone", "Email", "Work Location", "Status", "Supervisor"].map((label) => (
                        <th key={label} className="px-4 py-3 text-left font-black">{t(label)}</th>
                      ))}
                      {(canEdit || canDelete) ? <th className="px-4 py-3 text-right font-black">{t("Actions")}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((employee) => (
                      <tr key={employee.id} className="bg-white hover:bg-cyan-50/60">
                        <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{employeeCode(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="font-black text-slate-950">{employee.name}</p>
                          <p className="text-xs font-semibold text-slate-500">@{employee.username || "no-login"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{employeeJobTitle(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{employeeDepartment(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><RoleBadge value={employee.role} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee.phone || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee.email || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employeeWorkLocation(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={employee.status} language={language} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employeeSupervisor(employee)}</td>
                        {(canEdit || canDelete) ? (
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {canEdit ? (
                              <button type="button" onClick={() => onEdit(employee)} className="mr-2 inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:border-cyan-500 hover:text-cyan-700">
                                <Pencil className="h-3 w-3" />
                                {t("Edit")}
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button type="button" onClick={() => onDelete(employee.id)} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3 w-3" />
                                {t("Delete")}
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {!filteredRows.length ? (
                      <tr><td colSpan={(canEdit || canDelete) ? 11 : 10} className="px-4 py-10 text-center text-slate-500">{t("No records found.")}</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function EmployeeMetricButton({ label, value, icon: Icon, tone = "blue", helper, active, onClick }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-xl border ${tones[tone] || tones.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {helper ? <p className="mt-4 text-sm text-slate-500">{helper}</p> : null}
    </button>
  );
}

function EmployeeCard({ employee, onEdit, onDelete, language }) {
  const t = (text) => tr(language, text);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-950 text-white">
            <UsersRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{employeeCode(employee)}</p>
            <h3 className="mt-1 text-base font-black text-slate-950">{employee.name}</h3>
          </div>
        </div>
        <StatusBadge value={employee.status} language={language} />
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <EmployeeInfo label={t("Job Title")} value={employeeJobTitle(employee)} />
        <EmployeeInfo label={t("Department")} value={employeeDepartment(employee)} />
        <EmployeeInfo label={t("Work Location")} value={employeeWorkLocation(employee)} />
        <EmployeeInfo label={t("Supervisor")} value={employeeSupervisor(employee)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <RoleBadge value={employee.role} />
        <div className="flex gap-2">
          {onEdit ? <button type="button" onClick={() => onEdit(employee)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-400 hover:text-blue-700">{t("Edit")}</button> : null}
          {onDelete ? <button type="button" onClick={() => onDelete(employee.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">{t("Delete")}</button> : null}
        </div>
      </div>
    </article>
  );
}

function EmployeeInfo({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="truncate text-right font-semibold text-slate-800">{value || "-"}</span>
    </div>
  );
}

function EmployeeFilterSelect({ label, value, onChange, options }) {
  return (
    <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none">
        {options.map((option) => (
          <option key={option || "all"} value={option}>{option ? filterOptionLabel(option) : "All"}</option>
        ))}
      </select>
    </label>
  );
}

function filterOptionLabel(option) {
  return EMPLOYEE_ROLE_OPTIONS.includes(option) ? employeeRoleLabel(option) : String(option).replace("_", " ");
}

function RoleBadge({ value }) {
  const role = employeeRole(value);
  const tone = {
    admin: "border-red-200 bg-red-50 text-red-700",
    engineer: "border-blue-200 bg-blue-50 text-blue-700",
    store_keeper: "border-amber-200 bg-amber-50 text-amber-700",
    viewer: "border-slate-200 bg-slate-100 text-slate-600"
  }[role] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{employeeRoleLabel(role)}</span>;
}

function CrudPage({ resourceKey, rows, onCreate, onEdit, onDelete, canManage = true, canAdd = canManage, canEdit = canManage, canDelete = canManage, language, extraActions = null }) {
  const config = localizedConfig(resourceKey, language);
  const t = (text) => tr(language, text);
  return (
    <Panel
      title={config.title}
      subtitle={t("Create, update, and control operational records through the existing REST API.")}
      actions={(
        <div className="flex flex-wrap gap-2">
          {extraActions}
          {canAdd ? (
            <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              {t("New Record")}
            </button>
          ) : null}
        </div>
      )}
    >
      <DataTable columns={config.columns} rows={rows} onEdit={canEdit ? onEdit : null} onDelete={canDelete ? onDelete : null} emptyMessage={`${t("No records found.")}`} labels={tableLabels(language)} />
    </Panel>
  );
}

function Reports({ data, alerts, stats, language, canViewAuditLogs = false, canDeleteAuditLogs = false, onDeleteAuditLogs }) {
  const t = (text) => tr(language, text);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label={t("Total Orders")} value={stats.total_orders} icon={ClipboardIcon} tone="blue" />
        <MetricCard label={t("Alerts")} value={alerts.length} icon={Bell} tone={alerts.length ? "red" : "green"} />
        <MetricCard label={t("Assets Monitored")} value={data.equipment.length} icon={Wrench} tone="cyan" />
      </div>
      <AnalyticsSection data={data} alerts={alerts} language={language} />
      {canViewAuditLogs ? <AuditLogsPanel logs={data["audit-logs"] || []} language={language} canDelete={canDeleteAuditLogs} onDeleteSelected={onDeleteAuditLogs} /> : null}
    </>
  );
}

function AuditLogsPanel({ logs = [], language, canDelete = false, onDeleteSelected }) {
  const t = (text) => tr(language, text);
  const [filters, setFilters] = useState({ search: "", role: "", module: "", action: "", status: "", from: "", to: "" });
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const modules = uniqueValues(logs, "module");
  const actions = uniqueValues(logs, "action");
  const roles = uniqueValues(logs, "role");
  const statuses = uniqueValues(logs, "status");
  const filteredLogs = logs.filter((log) => auditLogMatches(log, filters));
  const filteredIds = filteredLogs.map((log) => Number(log.id));
  const selectedInFiltered = selectedIds.filter((id) => filteredIds.includes(Number(id)));
  const allFilteredSelected = Boolean(filteredIds.length) && selectedInFiltered.length === filteredIds.length;
  const failedLogins = logs.filter((log) => log.action === "LOGIN" && log.status === "FAILED").length;
  const assetChanges = logs.filter((log) => log.module === "Assets").length;
  const workOrderUpdates = logs.filter((log) => log.module === "Work Orders").length;
  const activeUsers = Object.keys(groupCount(logs, "user_name")).length;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => logs.some((log) => Number(log.id) === Number(id))));
  }, [logs]);

  function toggleLogSelection(logId) {
    const id = Number(logId);
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function toggleFilteredSelection() {
    setSelectedIds((current) => {
      if (allFilteredSelected) return current.filter((id) => !filteredIds.includes(Number(id)));
      return [...new Set([...current, ...filteredIds])];
    });
  }

  async function deleteSelectedLogs() {
    if (!canDelete || !selectedIds.length || !onDeleteSelected) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected audit log entries?`);
    if (!confirmed) return;
    setDeleting(true);
    const ok = await onDeleteSelected(selectedIds);
    setDeleting(false);
    if (ok) {
      setSelectedIds([]);
      setSelectedLog(null);
    }
  }

  async function exportLogs(format) {
    await api.auditExport(format).catch(() => null);
    if (format === "csv") exportAuditCsv(filteredLogs);
    if (format === "excel") exportAuditExcel(filteredLogs);
    if (format === "pdf") exportAuditPdf(filteredLogs);
  }

  return (
    <Panel
      title="Audit Logs"
      subtitle="Security audit trail for login, logout, create, update, delete, role changes, and critical operational actions."
      actions={
        <div className="flex flex-wrap gap-2">
          {canDelete ? (
            <button
              type="button"
              onClick={deleteSelectedLogs}
              disabled={!selectedIds.length || deleting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
            </button>
          ) : null}
          <button type="button" onClick={() => exportLogs("csv")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300">CSV</button>
          <button type="button" onClick={() => exportLogs("excel")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300">Excel</button>
          <button type="button" onClick={() => exportLogs("pdf")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
            <Printer className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <AuditStatCard label="Recent Activity" value={logs.length} tone="blue" />
          <AuditStatCard label="Failed Login Attempts" value={failedLogins} tone={failedLogins ? "red" : "green"} />
          <AuditStatCard label="Most Active Users" value={activeUsers} tone="cyan" />
          <AuditStatCard label="Asset / Work Order Changes" value={`${assetChanges}/${workOrderUpdates}`} tone="amber" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Search</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  placeholder="User, asset, work order, inventory item..."
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                />
              </div>
            </label>
            <AuditSelect label="Role" value={filters.role} options={roles} onChange={(role) => setFilters({ ...filters, role })} />
            <AuditSelect label="Module" value={filters.module} options={modules} onChange={(module) => setFilters({ ...filters, module })} />
            <AuditSelect label="Action" value={filters.action} options={actions} onChange={(action) => setFilters({ ...filters, action })} />
            <AuditSelect label="Status" value={filters.status} options={statuses} onChange={(status) => setFilters({ ...filters, status })} />
            <label>
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">From</span>
              <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">To</span>
              <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {canDelete ? (
                    <th className="whitespace-nowrap px-4 py-3 text-left font-black">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleFilteredSelection}
                        className="h-4 w-4 rounded border-slate-300 text-blue-700"
                        title="Select visible logs"
                      />
                    </th>
                  ) : null}
                  {["Date & Time", "User", "Role", "Module", "Action", "Description", "IP Address", "Details"].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-3 text-left font-black">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={canDelete ? () => toggleLogSelection(log.id) : undefined}
                    className={`transition ${canDelete ? "cursor-pointer" : ""} ${selectedIds.includes(Number(log.id)) ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-cyan-50/50"}`}
                  >
                    {canDelete ? (
                      <td className="whitespace-nowrap px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(Number(log.id))}
                          onChange={() => toggleLogSelection(log.id)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 rounded border-slate-300 text-blue-700"
                        />
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{formatAuditTimestamp(log.timestamp)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{log.user_name || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.role || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.module}</td>
                    <td className="whitespace-nowrap px-4 py-3"><AuditActionBadge action={log.action} status={log.status} /></td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-slate-600">{log.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.ip_address || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedLog(log); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        <Eye className="h-3.5 w-3.5" />
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredLogs.length ? (
                  <tr>
                    <td colSpan={canDelete ? 9 : 8} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">
                      No audit logs match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLog ? <AuditLogDetails log={selectedLog} onClose={() => setSelectedLog(null)} /> : null}
      </div>
    </Panel>
  );
}

function AuditStatCard({ label, value, tone = "blue" }) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    red: "border-red-100 bg-red-50 text-red-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700"
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[tone] || colors.blue}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function AuditSelect({ label, value, options, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none">
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AuditActionBadge({ action, status }) {
  const failed = status === "FAILED";
  const destructive = ["DELETE", "REJECT", "FAILED"].includes(action) || failed;
  const positive = ["CREATE", "LOGIN", "APPROVE", "CLOSE", "EXPORT"].includes(action);
  const style = destructive ? "border-red-200 bg-red-50 text-red-700" : positive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${style}`}>{action}</span>;
}

function AuditLogDetails({ log, onClose }) {
  const oldValues = parseAuditJson(log.old_values);
  const newValues = parseAuditJson(log.new_values);
  const fields = auditChangedFields(oldValues, newValues);
  const summary = auditChangeSummary(log, oldValues, newValues, fields);
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">Audit Entry #{log.id}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{log.description}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Close</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <InfoTile icon={ShieldCheck} title="User Details" text={`${log.user_name || "-"} / ${log.role || "-"}`} />
        <InfoTile icon={Clock3} title="Timestamp" text={formatAuditTimestamp(log.timestamp)} />
        <InfoTile icon={Activity} title="Action" text={`${log.module} / ${log.action}`} />
        <InfoTile icon={Filter} title="Changed Fields" text={fields.length ? fields.join(", ") : "Snapshot only"} />
      </div>
      <AuditChangeSummary text={summary} />
    </div>
  );
}

function AuditChangeSummary({ text }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-black text-slate-950">Change Summary</h4>
      <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();
}

function groupCount(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "-";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function auditLogMatches(log, filters) {
  const searchText = `${log.user_name} ${log.description} ${log.record_id} ${log.module} ${log.action}`.toLowerCase();
  if (filters.search && !searchText.includes(filters.search.toLowerCase())) return false;
  if (filters.role && log.role !== filters.role) return false;
  if (filters.module && log.module !== filters.module) return false;
  if (filters.action && log.action !== filters.action) return false;
  if (filters.status && log.status !== filters.status) return false;
  if (filters.from && String(log.timestamp).slice(0, 10) < filters.from) return false;
  if (filters.to && String(log.timestamp).slice(0, 10) > filters.to) return false;
  return true;
}

function parseAuditJson(value) {
  if (!value) return {};
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return { raw: value };
  }
}

function auditChangedFields(oldValues, newValues) {
  const keys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);
  return [...keys].filter((key) => JSON.stringify(oldValues?.[key]) !== JSON.stringify(newValues?.[key]));
}

function auditChangeSummary(log, oldValues, newValues, fields) {
  const action = String(log.action || "").toUpperCase();
  if (oldValues?.deleted_count) {
    return `Deleted ${oldValues.deleted_count} selected audit log entries.`;
  }
  if (fields.length) {
    const readable = fields
      .filter((field) => field !== "deleted_logs")
      .slice(0, 3)
      .map((field) => `${humanizeAuditField(field)} changed from ${formatAuditValue(oldValues?.[field])} to ${formatAuditValue(newValues?.[field])}`);
    const extra = fields.length > 3 ? `, plus ${fields.length - 3} more field${fields.length - 3 === 1 ? "" : "s"}` : "";
    return `${readable.join("; ")}${extra}.`;
  }
  if (action === "LOGIN") return log.status === "FAILED" ? "Login attempt failed." : "User logged in successfully.";
  if (action === "LOGOUT") return "User logged out.";
  if (action === "CREATE") return log.description || "A new record was created.";
  if (action === "DELETE") return log.description || "The selected record was deleted.";
  if (action === "EXPORT") return log.description || "A report export was completed.";
  return log.description || "No field-level changes were recorded.";
}

function humanizeAuditField(field) {
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAuditValue(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "structured data";
  const text = String(value);
  return text.length > 70 ? `${text.slice(0, 70)}...` : text;
}

function formatAuditTimestamp(value) {
  if (!value) return "-";
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(String(value));
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(date);
}

function auditExportRows(logs) {
  return logs.map((log) => ({
    "Date & Time": formatAuditTimestamp(log.timestamp),
    User: log.user_name || "",
    Role: log.role || "",
    Module: log.module || "",
    Action: log.action || "",
    Description: log.description || "",
    "IP Address": log.ip_address || "",
    Status: log.status || ""
  }));
}

function exportAuditCsv(logs) {
  const rows = auditExportRows(logs);
  const headers = Object.keys(rows[0] || { "Date & Time": "", User: "", Role: "", Module: "", Action: "", Description: "", "IP Address": "", Status: "" });
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  downloadTextFile(`audit-logs-${todayFileStamp()}.csv`, csv, "text/csv;charset=utf-8");
}

function exportAuditExcel(logs) {
  const rows = auditExportRows(logs);
  const headers = Object.keys(rows[0] || { "Date & Time": "", User: "", Role: "", Module: "", Action: "", Description: "", "IP Address": "", Status: "" });
  const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  downloadTextFile(`audit-logs-${todayFileStamp()}.xls`, table, "application/vnd.ms-excel;charset=utf-8");
}

function exportAuditPdf(logs) {
  const rows = auditExportRows(logs);
  const headers = Object.keys(rows[0] || { "Date & Time": "", User: "", Role: "", Module: "", Action: "", Description: "", "IP Address": "", Status: "" });
  const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Audit Logs</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:22px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#e2e8f0}</style></head><body><h1>Audit Logs</h1>${table}<script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayFileStamp() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function AccessControlPage({ users, currentUser, onSaveUserPermissions, language }) {
  const t = (text) => tr(language, text);
  const activeUsers = users.filter((user) => user.username || user.email);
  return (
    <div className="space-y-6">
      <Panel
        title={t("Access Control")}
        subtitle="Admin can assign precise permissions by user email. New users start with view-only permissions until the admin increases access."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <InfoTile icon={ShieldCheck} title="Admin Master Access" text="The master admin account always has full permissions." />
          <InfoTile icon={UsersRound} title="Users Synced Automatically" text={`${activeUsers.length} users from Resources are available here.`} />
          <InfoTile icon={Lock} title="Default Permission" text="New users receive least privilege: view only, no add/edit/delete." />
        </div>
      </Panel>

      <div className="space-y-4">
        {activeUsers.map((user) => (
          <AccessControlUserCard
            key={user.id}
            user={user}
            currentUser={currentUser}
            onSave={onSaveUserPermissions}
          />
        ))}
        {!activeUsers.length ? (
          <Panel title="No Users">
            <EmptyState title="No users found" message="Create users from Resources, then they will appear here automatically." />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function AccessControlUserCard({ user, currentUser, onSave }) {
  const [permissions, setPermissions] = useState(() => parsePermissions(user.permissions, user.role));

  useEffect(() => {
    setPermissions(parsePermissions(user.permissions, user.role));
  }, [user.permissions, user.role, user.id]);

  const togglePermission = (moduleKey, action) => {
    setPermissions((current) => {
      const next = parsePermissions(current);
      const modulePermissions = { ...next[moduleKey] };
      modulePermissions[action] = !modulePermissions[action];
      if (action !== "view" && modulePermissions[action]) modulePermissions.view = true;
      if (action === "view" && !modulePermissions.view) {
        modulePermissions.add = false;
        modulePermissions.edit = false;
        modulePermissions.delete = false;
      }
      return { ...next, [moduleKey]: modulePermissions };
    });
  };

  const enabledCount = PERMISSION_MODULES.reduce((total, module) => (
    total + PERMISSION_ACTIONS.filter((action) => permissions[module.key]?.[action.key]).length
  ), 0);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-base font-black text-slate-950">{user.name}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{user.email || "No email"} / Username: {user.username || "-"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">{enabledCount} permissions enabled</span>
          <StatusBadge value={user.status} />
          <button
            type="button"
            onClick={() => onSave(user, permissions)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
          >
            Save Permissions
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead className="bg-white text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="border border-slate-200 px-4 py-3 text-left">Control Area</th>
              {PERMISSION_ACTIONS.map((action) => (
                <th key={action.key} className="border border-slate-200 px-4 py-3 text-center">{action.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map((module) => (
              <tr key={module.key} className="hover:bg-slate-50">
                <td className="border border-slate-200 px-4 py-3">
                  <p className="font-black text-slate-950">{module.label}</p>
                  <p className="text-xs font-semibold text-slate-500">{module.key}</p>
                </td>
                {PERMISSION_ACTIONS.map((action) => {
                  const checked = Boolean(permissions[module.key]?.[action.key]);
                  return (
                    <td key={action.key} className="border border-slate-200 px-4 py-3 text-center">
                      <label className={`mx-auto inline-flex h-9 w-16 cursor-pointer items-center justify-center rounded-full border text-xs font-black transition ${
                        checked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-400"
                      }`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => togglePermission(module.key, action.key)}
                        />
                        {checked ? "ON" : "OFF"}
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsSummary({ data, language, onAccessControl, isAdmin = false }) {
  const t = (text) => tr(language, text);
  return (
    <Panel title={t("Settings")} subtitle={t("Presentation-ready system overview. Operational settings can be extended without changing current API contracts.")}>
      <div className="grid gap-4 md:grid-cols-3">
        <InfoTile icon={ShieldCheck} title={t("Access Control")} text={`${t("Full Admin Access")} - ${t("View, add, edit, and delete all maintenance records.")}`} onClick={isAdmin ? onAccessControl : null} />
        <InfoTile icon={Activity} title={t("API Health")} text={t("Frontend is connected to the FastAPI maintenance service.")} />
        <InfoTile icon={Wrench} title={t("Configured Assets")} text={`${data.equipment.length} ${t("equipment records available for maintenance control.")}`} />
      </div>
    </Panel>
  );
}

function InfoTile({ icon: Icon, title, text, onClick }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component type={onClick ? "button" : undefined} onClick={onClick} className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-200 hover:bg-blue-50">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-700 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-4 text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </Component>
  );
}

function Schedule({ customers = [], workOrders, pmTasks, equipment = [], onCreatePm, onEditPm, onDeletePm, onUpdatePmHistory, canManage = true, canAdd = canManage, canEdit = canManage, canDelete = canManage, language }) {
  const t = (text) => tr(language, text);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const grouped = workOrders.reduce((acc, order) => {
    const key = order.scheduled_date || t("Unscheduled");
    acc[key] = [...(acc[key] || []), order];
    return acc;
  }, {});
  const days = Object.keys(grouped).sort();
  const customerOptions = customers.filter((customer) => equipment.some((asset) => Number(asset.customer_id) === Number(customer.id)));
  const selectedCustomer = customers.find((customer) => Number(customer.id) === Number(selectedCustomerId));
  const customerEquipment = selectedCustomerId
    ? sortEquipmentByName(equipment.filter((asset) => Number(asset.customer_id) === Number(selectedCustomerId)))
    : [];
  const categories = buildScheduleCategories(customerEquipment);
  const filteredEquipment = selectedCategory
    ? sortEquipmentByName(customerEquipment.filter((asset) => equipmentCategory(asset).key === selectedCategory))
    : [];
  const selectedEquipment = filteredEquipment.find((asset) => Number(asset.id) === Number(selectedEquipmentId));

  useEffect(() => {
    if (!selectedCustomerId && customerOptions.length) {
      setSelectedCustomerId(customerOptions[0].id);
    }
    if (selectedCustomerId && !customerOptions.some((customer) => Number(customer.id) === Number(selectedCustomerId))) {
      setSelectedCustomerId(customerOptions[0]?.id || "");
    }
  }, [customerOptions, selectedCustomerId]);

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategory("");
      setSelectedEquipmentId("");
      return;
    }
    if (!selectedCategory || !categories.some((category) => category.key === selectedCategory)) {
      setSelectedCategory(categories[0].key);
      setSelectedEquipmentId("");
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (selectedEquipmentId && !filteredEquipment.some((asset) => Number(asset.id) === Number(selectedEquipmentId))) {
      setSelectedEquipmentId("");
    }
  }, [filteredEquipment, selectedEquipmentId]);

  return (
    <div className="space-y-6">
      <Panel title="Schedule Navigator" subtitle="Select the customer/location first, then choose the equipment type to show its maintenance follow-up tables.">
        <div className="space-y-5">
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Customers / Locations</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {customerOptions.map((customer) => {
                const active = Number(customer.id) === Number(selectedCustomerId);
                const count = equipment.filter((asset) => Number(asset.customer_id) === Number(customer.id)).length;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setSelectedCategory("");
                      setSelectedEquipmentId("");
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      active ? "border-blue-300 bg-blue-50 shadow-sm ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-black text-slate-950">{customer.name}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{count} assets</p>
                  </button>
                );
              })}
              {!customerOptions.length ? <EmptyState title={t("No customers / locations")} message={t("Add customers or places first, then assign assets to them.")} /> : null}
            </div>
          </div>

          {selectedCustomerId ? (
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Equipment Type</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {categories.map((category) => {
                  const active = category.key === selectedCategory;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.key);
                        setSelectedEquipmentId("");
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        active ? "border-slate-900 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <p className={`text-sm font-black ${active ? "text-white" : "text-slate-950"}`}>{category.label}</p>
                      <p className={`mt-2 text-xs font-semibold ${active ? "text-slate-300" : "text-slate-500"}`}>{category.count} assets</p>
                    </button>
                  );
                })}
                {!categories.length ? <EmptyState title={t("No equipment")} message="No equipment types are linked to this customer." /> : null}
              </div>
            </div>
          ) : null}

          {selectedCustomerId && selectedCategory ? (
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Equipment</h3>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {filteredEquipment.map((asset) => {
                  const active = Number(asset.id) === Number(selectedEquipmentId);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedEquipmentId(asset.id)}
                      className={`rounded-lg border px-3 py-2 text-center text-sm font-black transition ${
                        active
                          ? "border-blue-300 bg-blue-700 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      {asset.name}
                    </button>
                  );
                })}
                {!filteredEquipment.length ? <EmptyState title={t("No equipment")} message="No equipment is available under this type." /> : null}
              </div>
            </div>
          ) : null}
        </div>
      </Panel>

      {selectedCustomerId && selectedCategory && selectedEquipment ? (
        <MaintenanceFollowUpBoard
          title={`${selectedEquipment.name} - Maintenance Follow-up`}
          subtitle={`${selectedCustomer?.name || "Customer"} / ${scheduleCategoryLabel(selectedCategory)}. This page shows the selected equipment maintenance table only.`}
          equipment={[selectedEquipment]}
          pmTasks={pmTasks}
          workOrders={workOrders}
          onCreatePm={onCreatePm}
          onEditPm={onEditPm}
          onDeletePm={onDeletePm}
          onUpdatePmHistory={onUpdatePmHistory}
          canManage={canManage}
          canAdd={canAdd}
          canEdit={canEdit}
          canDelete={canDelete}
          language={language}
        />
      ) : selectedCustomerId && selectedCategory ? (
        <Panel title="Select Equipment" subtitle="Choose an equipment name above to open its preventive maintenance follow-up page.">
          <EmptyState title="No equipment selected" message="Click one equipment name to show its maintenance table." />
        </Panel>
      ) : null}

      <Panel title={t("Calendar Schedule")} subtitle={t("Work orders grouped by scheduled date for fast maintenance planning.")}>
        <div className="grid gap-4 lg:grid-cols-3">
          {days.map((day) => (
            <div key={day} className="min-h-44 rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950">{day}</div>
              <div className="space-y-3 p-4">
                {grouped[day].map((order) => (
                  <div key={order.id} className="rounded-lg border-l-4 border-blue-600 bg-slate-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">{order.title}</p>
                      <WorkOrderStatus value={order.status} priority={order.priority} language={language} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{order.equipment_name} - {order.engineer_name}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!days.length ? <EmptyState title={t("No scheduled work orders")} message={t("Scheduled maintenance will appear in this calendar view.")} /> : null}
        </div>
      </Panel>
    </div>
  );
}

function MaintenanceFollowUpBoard({ title = "Equipment Preventive Maintenance Follow-up", subtitle = "Dynamic tables are generated from each asset maintenance type, interval, running hours, and previous service data.", equipment, pmTasks, workOrders, onCreatePm, onEditPm, onDeletePm, onUpdatePmHistory, canManage, canAdd = canManage, canEdit = canManage, canDelete = canManage, language }) {
  const t = (text) => tr(language, text);
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      actions={canAdd ? <button onClick={onCreatePm} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"><Plus className="h-4 w-4" />{t("New Record")}</button> : null}
    >
      <div className="space-y-5">
        {sortEquipmentByName(equipment).map((asset) => (
          <EquipmentMaintenanceCard
            key={asset.id}
            asset={asset}
            pmTasks={pmTasks.filter((task) => Number(task.equipment_id) === Number(asset.id))}
            workOrders={workOrders.filter((order) => Number(order.equipment_id) === Number(asset.id))}
            onEditPm={onEditPm}
            onDeletePm={onDeletePm}
            onUpdatePmHistory={onUpdatePmHistory}
            canManage={canManage}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ))}
        {!equipment.length ? <EmptyState title={t("No equipment")} message="Add assets first, then create preventive maintenance tasks." /> : null}
      </div>
    </Panel>
  );
}

function EquipmentMaintenanceCard({ asset, pmTasks, workOrders, onEditPm, onDeletePm, onUpdatePmHistory, canManage, canEdit = canManage, canDelete = canManage }) {
  const [activeRecordsTaskId, setActiveRecordsTaskId] = useState(null);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{asset.name}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Running Hour: <span className="text-slate-950">{formatScheduleCell(asset.current_hours)}</span>
            {asset.asset_code ? <span> - Code: <span className="text-slate-950">{asset.asset_code}</span></span> : null}
          </p>
        </div>
        <MaintenanceBadge value={asset.maintenance_alert} />
      </div>

      <div className="overflow-auto">
        <table className="min-w-[1180px] w-full border-collapse text-center text-sm text-slate-950">
          <thead>
            <tr className="bg-white text-sm font-bold">
              <th className="border border-slate-950 px-3 py-2">Preventive Maintenance Type</th>
              <th className="border border-slate-950 px-3 py-2">Interval</th>
              <th className="border border-slate-950 px-3 py-2">Running Hour</th>
              <th className="border border-slate-950 px-3 py-2">Operating Hours at Maintenance</th>
              <th className="border border-slate-950 px-3 py-2">Next Maintenance Hour</th>
              <th className="border border-slate-950 px-3 py-2">Remaining Hours</th>
              <th className="border border-slate-950 px-3 py-2">Status</th>
              {(canEdit || canDelete) ? <th className="border border-slate-950 px-3 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {pmTasks.map((task) => {
              const runningHour = Number(task.current_hours ?? asset.current_hours ?? 0);
              const nextHour = Number(task.last_service_hours || 0) + Number(task.interval_hours || 0);
              const remainingHours = task.hours_until_due ?? (Number(task.interval_hours || 0) ? nextHour - runningHour : "");
              const previousRecords = previousRecordsForTask(task);
              const recordsOpen = Number(activeRecordsTaskId) === Number(task.id);
              return (
                <Fragment key={task.id}>
                  <tr className="bg-white">
                    <td className="border border-slate-950 px-3 py-2 font-semibold">{task.task_name}</td>
                    <td className="border border-slate-950 px-3 py-2">{formatInterval(task)}</td>
                    <td className="border border-slate-950 px-3 py-2">{formatScheduleCell(runningHour)}</td>
                    <td className="border border-slate-950 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setActiveRecordsTaskId(recordsOpen ? null : task.id)}
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-black text-blue-700 hover:border-blue-400 hover:bg-blue-100"
                        title="Show previous readings"
                      >
                        {formatScheduleCell(task.last_service_hours)}
                        <span className="ml-2 text-[11px] font-bold text-blue-500">({previousRecords.length})</span>
                      </button>
                    </td>
                    <td className="border border-slate-950 px-3 py-2">{formatScheduleCell(nextHour)}</td>
                    <td className={`border border-slate-950 px-3 py-2 font-black ${Number(remainingHours) <= 0 ? "text-red-600" : Number(remainingHours) <= 100 ? "text-orange-600" : "text-emerald-700"}`}>{formatScheduleCell(remainingHours)}</td>
                    <td className="border border-slate-950 px-3 py-2">{task.pm_alert || task.status}</td>
                    {(canEdit || canDelete) ? (
                      <td className="border border-slate-950 px-3 py-2">
                        {canEdit ? <button type="button" onClick={() => onEditPm(task)} className="mr-2 rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">Edit</button> : null}
                        {canDelete ? <button type="button" onClick={() => onDeletePm(task.id)} className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button> : null}
                      </td>
                    ) : null}
                  </tr>
                  {recordsOpen ? (
                    <tr>
                      <td colSpan={(canEdit || canDelete) ? 8 : 7} className="border border-slate-950 bg-slate-50 p-3">
                        <PreviousRecordsTable records={previousRecords} canManage={canEdit} onUpdateRecord={onUpdatePmHistory} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!pmTasks.length ? (
              <tr>
                <td colSpan={(canEdit || canDelete) ? 8 : 7} className="border border-slate-950 px-3 py-8 text-center text-slate-500">No preventive maintenance tasks for this equipment.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatInterval(task) {
  const parts = [];
  if (Number(task.interval_hours || 0)) parts.push(`${formatScheduleCell(task.interval_hours)} HR`);
  if (Number(task.interval_days || 0)) parts.push(`${formatScheduleCell(task.interval_days)} Days`);
  return parts.join(" / ") || "-";
}

function PreviousRecordsTable({ records, canManage = false, onUpdateRecord }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ hours: "", date: "" });
  const [savingId, setSavingId] = useState(null);

  const startEdit = (record) => {
    setEditingId(record.id);
    setDraft({ hours: record.hours ?? "", date: record.date || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ hours: "", date: "" });
  };

  const saveEdit = async (record) => {
    if (!record.id || !onUpdateRecord) return;
    setSavingId(record.id);
    await onUpdateRecord(record.id, {
      service_hours: Number(draft.hours || 0),
      service_date: draft.date || ""
    });
    setSavingId(null);
    cancelEdit();
  };

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-[640px] w-full border-collapse text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="border border-slate-300 px-3 py-2 text-left">Maintenance Count</th>
            <th className="border border-slate-300 px-3 py-2 text-left">Previous Records</th>
            <th className="border border-slate-300 px-3 py-2 text-left">Date</th>
            {canManage ? <th className="border border-slate-300 px-3 py-2 text-left">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const editing = record.id && Number(editingId) === Number(record.id);
            return (
              <tr key={`${record.id || record.count}-${record.hours}-${record.date}`}>
                <td className="border border-slate-300 px-3 py-2">{record.count}</td>
                <td className="border border-slate-300 px-3 py-2 font-black text-slate-950">
                  {editing ? (
                    <input
                      type="number"
                      min="0"
                      value={draft.hours}
                      onChange={(event) => setDraft({ ...draft, hours: event.target.value })}
                      className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  ) : (
                    formatScheduleCell(record.hours)
                  )}
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {editing ? (
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                      className="rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  ) : (
                    record.date || "-"
                  )}
                </td>
                {canManage ? (
                  <td className="border border-slate-300 px-3 py-2">
                    {editing ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveEdit(record)} disabled={savingId === record.id} className="rounded-md bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-60">
                          {savingId === record.id ? "Saving" : "Save"}
                        </button>
                        <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:border-slate-300">
                          Cancel
                        </button>
                      </div>
                    ) : record.id ? (
                      <button type="button" onClick={() => startEdit(record)} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        Edit
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
          {!records.length ? (
            <tr>
              <td colSpan={canManage ? 4 : 3} className="border border-slate-300 px-3 py-6 text-center text-slate-500">No previous readings recorded.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function buildScheduleCategories(equipment) {
  const order = ["generators", "compressors", "boilers", "chillers", "fans", "other"];
  const counts = equipment.reduce((acc, asset) => {
    const category = equipmentCategory(asset);
    acc[category.key] = (acc[category.key] || 0) + 1;
    return acc;
  }, {});
  return order.filter((key) => counts[key]).map((key) => ({
    key,
    label: scheduleCategoryLabel(key),
    count: counts[key]
  }));
}

function sortEquipmentByName(equipment) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  return [...equipment].sort((first, second) => collator.compare(assetSortKey(first), assetSortKey(second)));
}

function assetSortKey(asset) {
  return `${asset.name || ""} ${asset.asset_code || ""}`.replace(/\bM(\d+)\b/gi, (_, number) => `M${String(number).padStart(3, "0")}`);
}

function equipmentCategory(asset) {
  const text = `${asset.name || ""} ${asset.asset_type || ""} ${asset.model || ""}`.toLowerCase();
  if (/(generator|genset|m0\d|\bm\d\b)/.test(text)) return { key: "generators", label: scheduleCategoryLabel("generators") };
  if (/(compressor|comp\b|air comp)/.test(text)) return { key: "compressors", label: scheduleCategoryLabel("compressors") };
  if (/(boiler|steam|غلا)/.test(text)) return { key: "boilers", label: scheduleCategoryLabel("boilers") };
  if (/(chiller|cooler|cooling|مبرد)/.test(text)) return { key: "chillers", label: scheduleCategoryLabel("chillers") };
  if (/(fan|blower|مروحة|مراوح)/.test(text)) return { key: "fans", label: scheduleCategoryLabel("fans") };
  return { key: "other", label: scheduleCategoryLabel("other") };
}

function scheduleCategoryLabel(key) {
  const labels = {
    generators: "Generators / مولدات",
    compressors: "Compressors / كباسات",
    boilers: "Boilers / غلايات",
    chillers: "Chillers / مبردات",
    fans: "Fans / مراوح",
    other: "Other Equipment"
  };
  return labels[key] || labels.other;
}

function previousRecordsForTask(task) {
  const records = Array.isArray(task.previous_records) ? task.previous_records : [];
  if (records.length) {
    return records
      .slice()
      .sort((first, second) => {
        const firstKey = `${first.created_at || first.service_date || ""}-${first.id || ""}`;
        const secondKey = `${second.created_at || second.service_date || ""}-${second.id || ""}`;
        return firstKey.localeCompare(secondKey);
      })
      .map((record, index) => ({
        id: record.id,
        date: record.service_date || record.created_at?.slice(0, 10) || "",
        type: record.task_name || task.task_name,
        hours: record.service_hours,
        count: index + 1,
        source: "Previous Records"
      }));
  }
  if (Number(task.last_service_hours || 0)) {
    return [{
      date: task.last_service_date || "",
      type: task.task_name,
      hours: task.last_service_hours,
      count: 1,
      source: "PM Last Service"
    }];
  }
  return [];
}

function buildMaintenanceHistory(asset, pmTasks, workOrders) {
  const pmLogs = pmTasks.flatMap(previousRecordsForTask);
  const orderLogs = workOrders
    .filter((order) => order.status === "completed" || order.service_hours)
    .map((order) => ({
      date: order.due_date || order.scheduled_date || order.created_at?.slice(0, 10) || "",
      type: order.description || order.title,
      hours: order.service_hours || asset.current_hours,
      count: "",
      source: "Work Order"
    }));
  return [...pmLogs, ...orderLogs].sort((first, second) => String(second.date).localeCompare(String(first.date))).slice(0, 12);
}

function formatScheduleCell(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : value;
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-white shadow-sm" />
    </div>
  );
}

function trendData(workOrders) {
  const buckets = {};
  for (const order of workOrders) {
    const label = order.scheduled_date ? order.scheduled_date.slice(5) : "N/A";
    buckets[label] = (buckets[label] || 0) + 1;
  }
  const data = Object.entries(buckets).slice(-6).map(([label, value]) => ({ label, value }));
  return data.length ? data : [{ label: "No data", value: 0 }];
}

function plannedBreakdownData(data, alerts, language = "en") {
  const breakdownOrders = data["work-orders"].filter((item) => ["high", "critical"].includes(item.priority)).length + alerts.filter((item) => item.alert_level === "DUE NOW").length;
  const plannedOrders = Math.max(data["work-orders"].length - breakdownOrders, 0);
  return [
    { label: tr(language, "Planned"), value: plannedOrders, color: "bg-blue-600" },
    { label: tr(language, "Breakdown"), value: breakdownOrders, color: "bg-red-600" }
  ];
}

function buildMaintenanceDashboardMetrics(data, alerts, reliability, language = "en") {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const pmTasks = data["preventive-maintenance"] || [];
  const inventory = data.inventory || [];
  const customers = data.customers || [];
  const equipmentById = new Map(equipment.map((asset) => [Number(asset.id), asset]));
  const faultOrders = workOrders.filter(isReliabilityFaultOrder);
  const totalDowntimeHours = Number(reliability?.totalDowntimeHours || 0);
  const plannedHours = calculatePlannedOperatingHours(equipment, workOrders);
  const availabilityPercent = plannedHours
    ? clampPercent(((plannedHours - totalDowntimeHours) / plannedHours) * 100)
    : 100;
  const failureCount = Number(reliability?.failureCount ?? faultOrders.length);
  const averageDowntimeHours = Number(reliability?.averageDowntimeHours ?? (failureCount ? totalDowntimeHours / failureCount : 0));
  const mttrHours = Number(reliability?.mttrHours || 0);
  const mtbfHours = Number(reliability?.mtbfHours || 0);
  const breakdownEquipment = equipment.filter((asset) => equipmentIndustrialStatus(asset) === "Breakdown").length;
  const breakdownCount = Number(reliability?.failureCount ?? (faultOrders.length + breakdownEquipment + alerts.filter((alert) => alert.alert_level === "DUE NOW").length));
  const overduePmTasks = buildOverduePmRows(pmTasks, equipmentById);
  const cost = buildMaintenanceCostMetrics(workOrders, equipmentById, language);
  const assetReliabilityRows = buildAssetReliabilityRows(workOrders, equipment, pmTasks);
  const assetHealthRanking = assetReliabilityRows
    .map((row) => ({ ...row, category: assetHealthCategory(row.health) }))
    .sort((first, second) => first.health - second.health || first.name.localeCompare(second.name));
  const assetHealthAverage = assetHealthRanking.length
    ? Math.round(assetHealthRanking.reduce((sum, asset) => sum + asset.health, 0) / assetHealthRanking.length)
    : 0;
  const criticalEquipment = assetReliabilityRows
    .filter((asset) => ["critical", "high"].includes(String(asset.criticality || "").toLowerCase()) || ["Breakdown", "Under Maintenance", "Offline"].includes(asset.statusLabel))
    .sort((first, second) => first.health - second.health || first.name.localeCompare(second.name));

  return {
    availabilityPercent,
    averageDowntimeHours,
    averageDowntimeLabel: formatReliabilityHours(averageDowntimeHours),
    mttrHours,
    mttrLabel: reliability?.mttrLabel || "0h",
    mtbfHours,
    mtbfLabel: reliability?.mtbfLabel || "N/A",
    breakdownCount,
    overduePmTasks,
    cost,
    assetHealthAverage,
    criticalEquipment,
    siteSummary: buildSiteSummary(customers, equipment, alerts),
    topDowntimeAssets: (reliability?.topFailureAssets?.length ? reliability.topFailureAssets : buildTopDowntimeAssets(workOrders, equipment)).slice(0, 10),
    assetHealthRanking,
    breakdownTrend: reliability?.failureTrend?.length ? reliability.failureTrend : buildBreakdownTrend(workOrders, equipment),
    workOrderStatusPie: buildWorkOrderStatusPie(workOrders, language)
  };
}

function availabilityTone(value) {
  if (Number(value) > 95) return "green";
  if (Number(value) >= 90) return "orange";
  return "red";
}

function calculatePlannedOperatingHours(equipment, workOrders) {
  const currentHoursTotal = equipment.reduce((sum, asset) => sum + Number(asset.current_hours || 0), 0);
  if (currentHoursTotal > 0) return currentHoursTotal;
  const serviceHoursTotal = workOrders.reduce((sum, order) => sum + Number(order.service_hours || 0), 0);
  if (serviceHoursTotal > 0) return serviceHoursTotal;
  return Math.max(equipment.length, 1) * 720;
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function buildOverduePmRows(pmTasks, equipmentById) {
  return pmTasks
    .filter(isPmOverdue)
    .map((task) => {
      const asset = equipmentById.get(Number(task.equipment_id));
      const dueDate = task.next_due_date || task.last_service_date || "";
      return {
        ...task,
        equipment_name: task.equipment_name || asset?.name || "-",
        site: asset?.customer_name || asset?.location || "-",
        dueLabel: dueDate ? formatShortDate(dueDate) : "Hours exceeded",
        daysOverdue: calculateDaysOverdue(task)
      };
    })
    .sort((first, second) => Number(second.daysOverdue || 0) - Number(first.daysOverdue || 0));
}

function calculateDaysOverdue(task) {
  const dateValue = task.next_due_date || task.last_service_date;
  const dueDate = dateValue ? new Date(dateValue) : null;
  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / 86400000));
  }
  const overdueHours = Math.abs(Math.min(Number(task.hours_until_due || 0), 0));
  return overdueHours ? Math.ceil(overdueHours / 24) : 0;
}

function buildMaintenanceCostMetrics(workOrders, equipmentById, language = "en") {
  const categoryTotals = {
    Labor: 0,
    "Spare Parts": 0,
    Contractors: 0,
    Tools: 0,
    Miscellaneous: 0
  };
  const monthlyBuckets = createMonthBuckets();
  const siteTotals = new Map();
  const equipmentTotals = new Map();
  const now = new Date();
  const currentMonthKey = toMonthKey(now);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = toMonthKey(previousMonth);

  for (const order of workOrders) {
    const asset = equipmentById.get(Number(order.equipment_id));
    const orderCosts = extractWorkOrderCosts(order);
    const total = Object.values(orderCosts).reduce((sum, value) => sum + value, 0);
    for (const [key, value] of Object.entries(orderCosts)) categoryTotals[key] += value;
    const key = toMonthKey(getWorkOrderSavedDate(order) || order.scheduled_date || order.due_date || order.created_at);
    if (monthlyBuckets.has(key)) monthlyBuckets.set(key, monthlyBuckets.get(key) + total);
    addChartValue(siteTotals, order.customer_name || asset?.customer_name || asset?.location || tr(language, "Unassigned"), total);
    addChartValue(equipmentTotals, order.equipment_name || asset?.name || tr(language, "Unassigned"), total);
  }

  const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
  const categories = Object.entries(categoryTotals).map(([label, value]) => ({ label, value }));

  return {
    total,
    totalLabel: formatCurrency(total),
    currentMonth: monthlyBuckets.get(currentMonthKey) || 0,
    previousMonth: monthlyBuckets.get(previousMonthKey) || 0,
    monthlyTrend: [...monthlyBuckets.entries()].map(([key, value]) => ({ label: monthLabel(key), value: Math.round(value) })),
    categories,
    bySite: chartCostRows(siteTotals),
    byEquipment: chartCostRows(equipmentTotals)
  };
}

function extractWorkOrderCosts(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const sparePartItems = Array.isArray(meta.spare_parts_items) ? meta.spare_parts_items : [];
  const sparePartTotal = sparePartItems.reduce((sum, item) => (
    sum + Number(item.total_cost || item.cost || item.unit_cost || 0) * Math.max(Number(item.qty || item.quantity || 1), 1)
  ), 0);

  return {
    Labor: numberFromAny(meta.labor_cost, meta.cost_labor, order.labor_cost),
    "Spare Parts": numberFromAny(meta.spare_parts_cost, meta.cost_spare_parts, sparePartTotal, order.spare_parts_cost),
    Contractors: numberFromAny(meta.contractors_cost, meta.contractor_cost, order.contractors_cost),
    Tools: numberFromAny(meta.tools_cost, order.tools_cost),
    Miscellaneous: numberFromAny(meta.miscellaneous_cost, meta.misc_cost, order.cost)
  };
}

function numberFromAny(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function chartCostRows(counter) {
  return [...counter.entries()]
    .filter(([, value]) => Number(value) > 0)
    .sort(([firstLabel, firstValue], [secondLabel, secondValue]) => secondValue - firstValue || firstLabel.localeCompare(secondLabel))
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: Math.round(value) }));
}

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString()} EGP`;
}

function createMonthBuckets() {
  const buckets = new Map();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(start.getFullYear(), start.getMonth() - index, 1);
    buckets.set(toMonthKey(date), 0);
  }
  return buckets;
}

function toMonthKey(value) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = String(key || "").split("-").map(Number);
  if (!year || !month) return "N/A";
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function buildAssetReliabilityRows(workOrders, equipment, pmTasks) {
  const assetStats = buildAssetFaultStats(workOrders, equipment);
  return equipment.map((asset) => {
    const stats = assetStats.get(Number(asset.id)) || { faults: 0, downtimeHours: 0, mttrHours: 0, mtbfHours: 0 };
    const overduePmCount = pmTasks.filter((task) => Number(task.equipment_id) === Number(asset.id) && isPmOverdue(task)).length;
    const availability = assetAvailabilityPercent(asset, stats.downtimeHours);
    const health = calculateAssetHealthScore(asset, stats, overduePmCount, availability);
    return {
      ...asset,
      site: asset.customer_name || asset.location || "-",
      statusLabel: equipmentIndustrialStatus(asset),
      health,
      availability,
      faults: stats.faults,
      downtimeHours: stats.downtimeHours,
      downtimeLabel: formatReliabilityHours(stats.downtimeHours),
      mttrHours: stats.mttrHours,
      mtbfHours: stats.mtbfHours
    };
  });
}

function buildAssetFaultStats(workOrders, equipment) {
  const stats = new Map();
  const equipmentById = new Map(equipment.map((asset) => [Number(asset.id), asset]));
  for (const order of workOrders.filter(isReliabilityFaultOrder)) {
    const asset = equipmentById.get(Number(order.equipment_id));
    const key = Number(order.equipment_id);
    if (!key && !asset) continue;
    const duration = workOrderDurationMinutes(order) / 60;
    const current = stats.get(key) || { faults: 0, downtimeHours: 0, orders: [] };
    current.faults += 1;
    current.downtimeHours += duration;
    current.orders.push(order);
    stats.set(key, current);
  }

  for (const [key, value] of stats.entries()) {
    value.mttrHours = value.faults ? value.downtimeHours / value.faults : 0;
    value.mtbfHours = calculateMtbfHours(value.orders, equipment);
    stats.set(key, value);
  }

  return stats;
}

function assetAvailabilityPercent(asset, downtimeHours) {
  const planned = Math.max(Number(asset.current_hours || asset.maintenance_interval_hours || 720), 1);
  return clampPercent(((planned - Number(downtimeHours || 0)) / planned) * 100);
}

function calculateAssetHealthScore(asset, stats, overduePmCount, availability) {
  const base = equipmentHealthPercent(asset);
  const mttrPenalty = Math.min(Number(stats.mttrHours || 0) * 2, 15);
  const mtbfBoost = Number(stats.mtbfHours || 0) >= 500 ? 5 : 0;
  const score = base - Number(stats.faults || 0) * 5 - Number(stats.downtimeHours || 0) * 1.5 - overduePmCount * 8 - (100 - availability) * 0.35 - mttrPenalty + mtbfBoost;
  return clampPercent(score);
}

function assetHealthCategory(value) {
  if (value >= 90) return "Excellent";
  if (value >= 75) return "Good";
  if (value >= 60) return "Fair";
  return "Poor";
}

function buildSiteSummary(customers, equipment, alerts) {
  const siteNames = uniqueSorted([
    ...customers.map((customer) => customer.name),
    ...equipment.map((asset) => asset.customer_name || asset.location),
    ...alerts.map((alert) => alert.location)
  ]);

  return siteNames.map((name) => {
    const siteAssets = equipment.filter((asset) => matchesAnyFilterValue([asset.customer_name, asset.location], name));
    const breakdown = siteAssets.filter((asset) => ["Breakdown", "Offline"].includes(equipmentIndustrialStatus(asset))).length;
    return {
      name,
      assets: siteAssets.length,
      running: siteAssets.filter((asset) => equipmentIndustrialStatus(asset) === "Running").length,
      breakdown,
      operational: siteOperationalPercent(siteAssets, alerts.filter((alert) => matchesFilterValue(alert.location, name) && alert.alert_level === "DUE NOW").length + breakdown)
    };
  }).filter((site) => site.assets || alerts.some((alert) => matchesFilterValue(alert.location, site.name)));
}

function buildTopDowntimeAssets(workOrders, equipment) {
  const stats = buildAssetFaultStats(workOrders, equipment);
  const rows = equipment.map((asset) => {
    const item = stats.get(Number(asset.id)) || { faults: 0, downtimeHours: 0 };
    return {
      id: asset.id,
      name: asset.name || `Asset ${asset.id}`,
      site: asset.customer_name || asset.location || "-",
      faults: item.faults || 0,
      downtimeHours: item.downtimeHours || 0,
      downtimeLabel: formatReliabilityHours(item.downtimeHours || 0)
    };
  });
  return rows.sort((first, second) => second.downtimeHours - first.downtimeHours || second.faults - first.faults || first.name.localeCompare(second.name));
}

function buildBreakdownTrend(workOrders, equipment) {
  const buckets = createMonthBuckets();
  for (const order of workOrders.filter(isBreakdownTrendOrder)) {
    const key = toMonthKey(getWorkOrderOperationalDate(order));
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }
  const currentKey = toMonthKey(new Date());
  const activeBreakdowns = equipment.filter((asset) => equipmentIndustrialStatus(asset) === "Breakdown").length;
  if (activeBreakdowns && buckets.has(currentKey)) buckets.set(currentKey, buckets.get(currentKey) + activeBreakdowns);
  return [...buckets.entries()].map(([key, value]) => ({ label: monthLabel(key), value }));
}

function getWorkOrderOperationalDate(order) {
  const meta = parseWorkOrderNotes(order.notes);
  return meta.start_date || order.scheduled_date || order.due_date || "";
}

function isBreakdownTrendOrder(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const status = String(order.status || "").toLowerCase();
  const maintenanceType = String(meta.maintenance_type || order.type || "").toLowerCase();
  const text = `${order.title || ""} ${order.description || ""}`.toLowerCase();
  return ["breakdown", "fault", "down"].some((keyword) => maintenanceType.includes(keyword) || status.includes(keyword) || text.includes(keyword));
}

function buildWorkOrderStatusPie(workOrders, language = "en") {
  const openOrders = workOrders.filter((order) => !["completed", "cancelled"].includes(String(order.status || "").toLowerCase()));
  const buckets = new Map([
    ["New", 0],
    ["Assigned", 0],
    ["In Progress", 0],
    ["Waiting for Parts", 0],
    ["Waiting for Approval", 0]
  ]);
  for (const order of openOrders) {
    const bucket = workOrderStatusBucket(order);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }
  const colors = {
    New: "#64748b",
    Assigned: "#2563eb",
    "In Progress": "#0ea5e9",
    "Waiting for Parts": "#f97316",
    "Waiting for Approval": "#8b5cf6"
  };
  return [...buckets.entries()].map(([label, value]) => ({ label: tr(language, label), value, color: colors[label] }));
}

function workOrderStatusBucket(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const status = String(order.status || "").toLowerCase();
  const text = `${status} ${order.title || ""} ${order.description || ""} ${meta.spare_parts || ""}`.toLowerCase();
  if (text.includes("part") || text.includes("spare")) return "Waiting for Parts";
  if (text.includes("approval")) return "Waiting for Approval";
  if (status.includes("progress")) return "In Progress";
  if (order.engineer_id || meta.shift_engineer_name || meta.executor_name || meta.assigned_to) return "Assigned";
  return "New";
}

function engineerWorkloadData(workOrders, language = "en", limit = 6) {
  const counts = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const name = cleanChartLabel(meta.shift_engineer_name || order.engineer_name || "") || tr(language, "Unassigned");
    addChartValue(counts, name, 1);
  }
  return chartRowsFromMap(counts, "bg-blue-600", language, limit);
}

function technicianWorkloadData(workOrders, language = "en", limit = 6) {
  const counts = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const names = extractTechnicianNames(meta);
    const uniqueNames = names.length ? [...new Set(names)] : [tr(language, "Unassigned")];
    for (const name of uniqueNames) addChartValue(counts, name, 1);
  }
  return chartRowsFromMap(counts, "bg-cyan-600", language, limit);
}

function equipmentMaintenanceTimeData(workOrders, language = "en") {
  const totals = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const name = cleanChartLabel(order.equipment_name || meta.equipment_name || meta.asset_name || order.title || "") || tr(language, "Unassigned");
    addChartValue(totals, name, workOrderDurationMinutes(order));
  }
  return chartRowsFromMap(totals, "bg-orange-500", language);
}

function extractTechnicianNames(meta) {
  const candidates = [
    meta.executor_name,
    meta.holder_name,
    meta.assigned_to,
    meta.appointed_members,
    ...(Array.isArray(meta.appointed_members_list) ? meta.appointed_members_list : [])
  ];
  return candidates.flatMap(splitChartNames).filter(Boolean);
}

function splitChartNames(value) {
  return String(value || "")
    .split(/\/+|,|\r?\n/)
    .map(cleanChartLabel)
    .filter(Boolean);
}

function cleanChartLabel(value) {
  const normalized = String(value || "")
    .replace(/\s*\/+\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.split(" / ").map((part) => part.trim()).filter(Boolean)[0] || "";
}

function addChartValue(counter, label, value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  counter.set(label, (counter.get(label) || 0) + safeValue);
}

function chartRowsFromMap(counter, color, language = "en", limit = 6) {
  const rows = [...counter.entries()]
    .sort(([firstLabel, firstValue], [secondLabel, secondValue]) => secondValue - firstValue || firstLabel.localeCompare(secondLabel))
    .slice(0, limit)
    .map(([label, value]) => ({ label, value: Math.round(value), color }));
  return rows.length ? rows : [{ label: tr(language, "No data"), value: 0, color }];
}

function workOrderDurationMinutes(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const savedDuration = durationTextToMinutes(meta.duration);
  if (savedDuration > 0) return savedDuration;
  const calculatedDuration = durationTextToMinutes(calculateDuration(meta.start_time, meta.finished_time));
  return calculatedDuration;
}

function buildAssetReliability(workOrders, equipment, language = "en") {
  const equipmentById = new Map(equipment.map((asset) => [Number(asset.id), asset]));
  const faultOrders = workOrders.filter(isReliabilityFaultOrder);
  const byAsset = new Map();
  const downtimeByDate = new Map();
  let totalDowntimeMinutes = 0;

  for (const order of faultOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const asset = equipmentById.get(Number(order.equipment_id));
    const assetKey = Number(order.equipment_id) || `order-${order.id || order.title}`;
    const assetName = cleanChartLabel(order.equipment_name || asset?.name || meta.equipment_name || meta.asset_name || order.title || "") || tr(language, "Unassigned");
    const downtimeMinutes = workOrderDurationMinutes(order);
    const downtimeHours = downtimeMinutes / 60;
    totalDowntimeMinutes += downtimeMinutes;

    const current = byAsset.get(assetKey) || {
      id: assetKey,
      name: assetName,
      faults: 0,
      downtimeHours: 0,
      impactScore: 0
    };
    current.faults += 1;
    current.downtimeHours += downtimeHours;
    current.impactScore = Math.round(current.faults * 10 + current.downtimeHours * 2);
    byAsset.set(assetKey, current);

    const dateKey = getWorkOrderSavedDate(order) || todayIso();
    downtimeByDate.set(dateKey, (downtimeByDate.get(dateKey) || 0) + downtimeHours);
  }

  for (const asset of equipment.filter((item) => equipmentIndustrialStatus(item) === "Breakdown")) {
    const key = Number(asset.id);
    if (byAsset.has(key)) continue;
    byAsset.set(key, {
      id: key,
      name: asset.name || `Asset ${asset.id}`,
      faults: 1,
      downtimeHours: 0,
      impactScore: 10
    });
  }

  const badActors = [...byAsset.values()]
    .sort((first, second) => second.downtimeHours - first.downtimeHours || second.faults - first.faults || first.name.localeCompare(second.name))
    .slice(0, 5)
    .map((asset) => ({
      ...asset,
      downtimeLabel: formatReliabilityHours(asset.downtimeHours)
    }));

  const downtimeSeries = [...downtimeByDate.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .slice(-8)
    .map(([date, hours]) => ({ label: formatShortDate(date) || date, value: Number(hours.toFixed(1)) }));

  const mttrHours = faultOrders.length ? totalDowntimeMinutes / faultOrders.length / 60 : 0;
  const mtbfHours = calculateMtbfHours(faultOrders, equipment);
  const totalDowntimeHours = totalDowntimeMinutes / 60;
  const incidentCount = [...byAsset.values()].reduce((sum, asset) => sum + asset.faults, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - incidentCount * 3 - totalDowntimeHours * 1.2)));

  return {
    badActors,
    downtimeSeries: downtimeSeries.length ? downtimeSeries : [{ label: tr(language, "No data"), value: 0 }],
    totalDowntimeHours,
    downtimeLabel: formatReliabilityHours(totalDowntimeHours),
    mttrHours,
    mttrLabel: faultOrders.length ? formatReliabilityHours(mttrHours) : "0h",
    mtbfHours,
    mtbfLabel: mtbfHours ? formatReliabilityHours(mtbfHours) : "N/A",
    score
  };
}

function isReliabilityFaultOrder(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const priority = String(order.priority || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  const maintenanceType = String(meta.maintenance_type || order.type || "").toLowerCase();
  const text = `${order.title || ""} ${order.description || ""}`.toLowerCase();
  return (
    ["critical", "high"].includes(priority) ||
    ["breakdown", "fault", "down"].some((keyword) => maintenanceType.includes(keyword) || status.includes(keyword) || text.includes(keyword))
  );
}

function calculateMtbfHours(faultOrders, equipment) {
  const intervals = [];
  const grouped = new Map();
  for (const order of faultOrders) {
    const key = Number(order.equipment_id) || order.equipment_name || "unassigned";
    grouped.set(key, [...(grouped.get(key) || []), order]);
  }

  for (const orders of grouped.values()) {
    const sorted = orders.slice().sort((first, second) => {
      const firstHours = Number(first.service_hours || 0);
      const secondHours = Number(second.service_hours || 0);
      if (firstHours && secondHours && firstHours !== secondHours) return firstHours - secondHours;
      return workOrderDateMs(first) - workOrderDateMs(second);
    });

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousHours = Number(previous.service_hours || 0);
      const currentHours = Number(current.service_hours || 0);
      if (currentHours > previousHours) {
        intervals.push(currentHours - previousHours);
        continue;
      }
      const diffHours = (workOrderDateMs(current) - workOrderDateMs(previous)) / 36e5;
      if (diffHours > 0) intervals.push(diffHours);
    }
  }

  if (intervals.length) return intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  if (!faultOrders.length) return 0;
  const totalRunningHours = equipment.reduce((sum, asset) => sum + Number(asset.current_hours || 0), 0);
  return totalRunningHours > 0 ? totalRunningHours / faultOrders.length : 0;
}

function workOrderDateMs(order) {
  const value = getWorkOrderSavedDate(order) || order.created_at || order.due_date || "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatReliabilityHours(value) {
  const hours = Number(value || 0);
  if (!Number.isFinite(hours) || hours <= 0) return "0h";
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours).toLocaleString()}h`;
}

function durationTextToMinutes(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Math.max(0, value);
  const text = String(value).trim().toLowerCase();
  const timeMatch = text.match(/^(\d+):(\d{1,2})$/);
  if (timeMatch) return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  const hourMatch = text.match(/([\d.]+)\s*(h|hr|hrs|hour|hours)\b/);
  const minuteMatch = text.match(/([\d.]+)\s*(m|min|mins|minute|minutes)\b/);
  if (hourMatch || minuteMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) * 60 : 0;
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
    return Math.max(0, Math.round(hours + minutes));
  }
  const numeric = Number(text);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function downtimeDistribution(equipment, language = "en") {
  const normal = equipment.filter((item) => loadPercent(item) < 80).length;
  const warning = equipment.filter((item) => loadPercent(item) >= 80 && loadPercent(item) < 100).length;
  const critical = equipment.filter((item) => loadPercent(item) >= 100 || item.status === "down").length;
  return [
    { label: tr(language, "Normal"), value: normal, color: "#10b981" },
    { label: tr(language, "Warning"), value: warning, color: "#f97316" },
    { label: tr(language, "Critical"), value: critical, color: "#dc2626" }
  ];
}

function loadPercent(item) {
  return Math.round((Number(item.current_hours || 0) / Math.max(Number(item.maintenance_interval_hours || 1), 1)) * 100);
}

function equipmentHealthPercent(asset) {
  const status = equipmentIndustrialStatus(asset);
  if (status === "Breakdown") return 12;
  if (status === "Offline") return 25;
  if (status === "Under Maintenance") return 58;
  const exposure = Math.min(loadPercent(asset), 120);
  const alertPenalty = asset.maintenance_alert === "DUE NOW" ? 24 : asset.maintenance_alert === "UPCOMING" ? 12 : 0;
  const criticality = String(asset.criticality || "").toLowerCase();
  const criticalityPenalty = criticality === "critical" ? 10 : criticality === "high" ? 6 : 0;
  const idlePenalty = status === "Idle" ? 8 : 0;
  return Math.max(5, Math.min(100, Math.round(100 - exposure * 0.42 - alertPenalty - criticalityPenalty - idlePenalty)));
}

function equipmentIndustrialStatus(asset) {
  const raw = String(asset.status || "").toLowerCase();
  if (["down", "breakdown", "failed"].includes(raw)) return "Breakdown";
  if (["offline", "inactive", "off"].includes(raw)) return "Offline";
  if (["maintenance", "under maintenance", "paused"].includes(raw)) return "Under Maintenance";
  if (Number(asset.current_hours || 0) <= 0 || raw === "idle") return "Idle";
  return "Running";
}

function healthTone(value) {
  if (value < 45) return "red";
  if (value < 70) return "orange";
  return "green";
}

function assetLastMaintenance(asset, pmTasks) {
  const related = pmTasks.filter((task) => Number(task.equipment_id) === Number(asset.id));
  const dates = related
    .flatMap((task) => [
      task.last_service_date,
      ...(Array.isArray(task.previous_records) ? task.previous_records.map((record) => record.service_date) : [])
    ])
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : asset.last_maintenance_date || "Not configured";
}

function assetNextMaintenance(asset, pmTasks) {
  const related = pmTasks
    .filter((task) => Number(task.equipment_id) === Number(asset.id))
    .sort((first, second) => Number(first.hours_until_due ?? 999999) - Number(second.hours_until_due ?? 999999));
  const nextTask = related[0];
  if (nextTask) {
    const hourText = Number.isFinite(Number(nextTask.hours_until_due)) ? `${formatScheduleCell(nextTask.hours_until_due)} hrs` : "Hours-based";
    return `${nextTask.task_name}: ${nextTask.next_due_date || hourText}`;
  }
  return asset.next_maintenance_date || "Not configured";
}

function siteOperationalPercent(assets, activeFaults) {
  if (!assets.length) return 0;
  const available = assets.filter((asset) => !["Breakdown", "Offline"].includes(equipmentIndustrialStatus(asset))).length;
  return Math.max(0, Math.min(100, Math.round(((available - activeFaults * 0.35) / assets.length) * 100)));
}

function findAssetForAlert(alert, equipment) {
  return equipment.find((asset) => Number(asset.id) === Number(alert.equipment_id))
    || equipment.find((asset) => asset.name === alert.equipment_name)
    || equipment.find((asset) => String(asset.name || "").toLowerCase() === String(alert.equipment_name || "").toLowerCase());
}

function isPmOverdue(task) {
  return task.pm_alert === "DUE NOW" || Number(task.hours_until_due) <= 0;
}

function alarmDowntime(alarm) {
  const hoursUntil = Number(alarm.hours_until_maintenance ?? alarm.hours_until_due);
  if (Number.isFinite(hoursUntil) && hoursUntil < 0) return `${formatScheduleCell(Math.abs(hoursUntil))} hrs`;
  if (alarm.priority === "critical") return "Live";
  return "0 hrs";
}

function ProgressBar({ value, tone = "blue" }) {
  const colors = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    red: "bg-red-600",
    slate: "bg-slate-500"
  };
  return (
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${colors[tone] || colors.blue}`} style={{ width: `${Math.max(0, Math.min(Number(value) || 0, 100))}%` }} />
    </div>
  );
}

function IndustrialStatusBadge({ status }) {
  const tone = {
    Running: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Idle: "border-slate-200 bg-slate-100 text-slate-700",
    "Under Maintenance": "border-blue-200 bg-blue-50 text-blue-700",
    Breakdown: "border-red-200 bg-red-50 text-red-700",
    Offline: "border-slate-300 bg-slate-200 text-slate-700"
  }[status] || "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

function CriticalityBadge({ value }) {
  const normalized = String(value || "Medium").toLowerCase();
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  const tone = {
    critical: "border-red-300 bg-red-50 text-red-700",
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-orange-200 bg-orange-50 text-orange-700",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[normalized] || "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{label}</span>;
}

function SiteMiniStat({ label, value, danger = false }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
      <p className={`text-lg font-black ${danger ? "text-red-600" : "text-slate-950"}`}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
    </div>
  );
}

function PmStat({ label, value, tone = "blue" }) {
  const colors = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700"
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[tone] || colors.blue}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] opacity-80">{label}</p>
    </div>
  );
}

function MiniKpi({ label, value, tone = "blue" }) {
  const colors = {
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return (
    <div className={`rounded-xl border px-3 py-3 shadow-sm ${colors[tone] || colors.blue}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em]">{label}</p>
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeValue() {
  return new Date().toTimeString().slice(0, 5);
}

function createWorkOrderForm({ equipment = [], customers = [], engineers = [], rows = [] } = {}) {
  return {
    customer_id: "",
    equipment_id: "",
    engineer_id: "",
    wo_no: getNextWorkOrderNo(rows, ""),
    shift_engineer_name: "",
    assigned_to: "",
    appointed_members_list: [""],
    task_description: "",
    service_hours: 0,
    serial_number: "",
    location: "",
    start_time: "",
    start_date: "",
    finished_time: "",
    finished_date: "",
    maintenance_type: "Service",
    executor_name: "",
    executor_job_title: "",
    status: "pending",
    priority: "medium",
    requirements: "",
    spare_parts: "",
    qhse_instructions: "",
    safety_responsible: "",
    site_preparation: "",
    holder_name: "",
    holder_job_title: "",
    recommendation: "",
    executive_name: "",
    manager_name: "",
    spare_parts_items: [{ name: "", qty: 1 }],
    signature_executor: "",
    signature_shift_engineer: "",
    signature_manager: "",
    before_photos: [],
    after_photos: []
  };
}

function formFromSavedOrder(order, equipment, customers, engineers) {
  const meta = parseWorkOrderNotes(order.notes);
  const asset = equipment.find((item) => Number(item.id) === Number(order.equipment_id));
  const customer = customers.find((item) => Number(item.id) === Number(order.customer_id));
  const engineer = engineers.find((item) => Number(item.id) === Number(order.engineer_id));
  return {
    ...createWorkOrderForm({ equipment, customers, engineers }),
    ...meta,
    customer_id: order.customer_id || customer?.id || "",
    equipment_id: order.equipment_id || asset?.id || "",
    engineer_id: order.engineer_id || engineer?.id || "",
    shift_engineer_name: meta.shift_engineer_name || engineer?.name || order.engineer_name || "",
    appointed_members_list: Array.isArray(meta.appointed_members_list) && meta.appointed_members_list.length ? meta.appointed_members_list : splitLines(meta.appointed_members),
    task_description: meta.task_description || order.description || "",
    service_hours: Number(order.service_hours || asset?.current_hours || 0),
    serial_number: meta.serial_number || asset?.serial_number || "",
    location: meta.location || asset?.location || customer?.name || "",
    start_date: meta.start_date || order.scheduled_date || todayIso(),
    finished_date: meta.finished_date || order.due_date || order.scheduled_date || todayIso(),
    status: order.status || meta.status || "pending",
    priority: order.priority || meta.priority || "medium"
  };
}

function parseWorkOrderNotes(notes) {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && parsed.__workOrderDocument ? parsed : {};
  } catch {
    return {};
  }
}

function getWorkOrderSavedDate(row) {
  const meta = parseWorkOrderNotes(row.notes);
  return meta.start_date || row.scheduled_date || row.created_at?.slice(0, 10) || row.due_date || "";
}

function splitLines(value) {
  const lines = String(value || "").split(/\r?\n/).map((line) => line.replace(/^\s*\d+[\-.)]\s*/, "").trim()).filter(Boolean);
  return lines.length ? lines : [""];
}

function getNextWorkOrderNo(rows, equipmentId) {
  const matchingRows = rows.filter((row) => Number(row.equipment_id) === Number(equipmentId));
  const highest = matchingRows.reduce((max, row) => {
    const meta = parseWorkOrderNotes(row.notes);
    const number = Number.parseInt(meta.wo_no || String(meta.wo_reference || row.title || "").match(/-(\d{1,})\b/)?.[1] || "0", 10);
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return String(highest + 1).padStart(4, "0");
}

function buildWorkOrderReference(form, customer, equipmentItem) {
  const customerName = customer?.name || form.location || "Location";
  const assetName = equipmentItem?.name || "Asset";
  return `${customerName} ${assetName} -${form.wo_no || "0000"}`.replace(/\s+/g, " ").trim();
}

function buildWorkOrderPdfFileName(form, customer, equipmentItem, savedOrder) {
  const savedMeta = savedOrder ? parseWorkOrderNotes(savedOrder.notes) : {};
  const siteName = customer?.name || savedOrder?.customer_name || savedMeta.location || form.location || "Location";
  const assetName = equipmentItem?.name || savedOrder?.equipment_name || "Asset";
  const savedNo = String(savedMeta.wo_reference || savedOrder?.title || "").match(/-(\d{1,})\b/)?.[1] || "";
  const woNo = String(form.wo_no || savedMeta.wo_no || savedNo || "0000").replace(/^-+/, "");
  return sanitizePdfFileName(`${siteName} ${assetName} -${woNo}`.replace(/\s+/g, " ").trim());
}

function sanitizePdfFileName(value) {
  return String(value || "Work Order")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Work Order";
}

function calculateDuration(start, end) {
  if (!start || !end) return "0:00";
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  if ([startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))) return "0:00";
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}:${String(rest).padStart(2, "0")}`;
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, "-");
}

function formatTimeDisplay(value) {
  if (!value) return "--:--";
  const [hourText, minuteText] = value.split(":");
  let hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${minuteText || "00"} ${suffix}`;
}

function splitTime12(value) {
  if (!value) return { hour: "12", minute: "00", period: "AM" };
  const [hourText, minuteText = "00"] = value.split(":");
  const hour24 = Number(hourText);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return { hour: String(hour).padStart(2, "0"), minute: minuteText.padStart(2, "0"), period };
}

function joinTime12({ hour, minute, period }) {
  let nextHour = Number(hour);
  if (period === "PM" && nextHour !== 12) nextHour += 12;
  if (period === "AM" && nextHour === 12) nextHour = 0;
  return `${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function notifyManagerApproval(t) {
  const message = t("Manager approval notification sent");
  if (!("Notification" in window)) {
    window.alert(`${message}. ${t("Browser notifications are not enabled.")}`);
    return;
  }
  if (Notification.permission === "granted") {
    new Notification(message, { body: "A completed work order is waiting for approval." });
    return;
  }
  if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(message, { body: "A completed work order is waiting for approval." });
      } else {
        window.alert(message);
      }
    });
    return;
  }
  window.alert(message);
}

const VALUE_AR = {
  completed: "مكتمل",
  pending: "معلق",
  in_progress: "قيد التنفيذ",
  breakdown: "عطل",
  cancelled: "ملغي",
  active: "متاح",
  operational: "تشغيلي",
  warning: "تحذير",
  down: "متوقف",
  off_duty: "خارج الخدمة",
  inactive: "غير نشط",
  critical: "حرج",
  high: "عالي",
  medium: "متوسط",
  low: "منخفض",
  "DUE NOW": "مستحق الآن",
  UPCOMING: "قريب",
  OK: "جيد",
  unknown: "غير معروف"
};

function valueLabel(value, language) {
  if (EMPLOYEE_ROLE_OPTIONS.includes(String(value))) return employeeRoleLabel(value);
  return language === "ar" ? VALUE_AR[value] || VALUE_AR[String(value).replace("_", " ")] || value : String(value || "unknown").replace("_", " ");
}

function StatusBadge({ value, language = "en" }) {
  const normalized = normalizeWorkOrderStatus(value);
  const tone = {
    draft: "border-slate-200 bg-slate-100 text-slate-600",
    new: "border-cyan-200 bg-cyan-50 text-cyan-700",
    assigned: "border-blue-200 bg-blue-50 text-blue-700",
    accepted: "border-indigo-200 bg-indigo-50 text-indigo-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending_supervisor_review: "border-purple-200 bg-purple-50 text-purple-700",
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    closed: "border-slate-300 bg-slate-200 text-slate-800",
    rejected: "border-red-200 bg-red-50 text-red-700",
    waiting_for_parts: "border-orange-200 bg-orange-50 text-orange-700",
    on_hold: "border-orange-200 bg-orange-50 text-orange-700",
    overdue: "border-red-200 bg-red-50 text-red-700",
    pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    in_progress: "border-blue-200 bg-blue-50 text-blue-700",
    breakdown: "border-red-200 bg-red-50 text-red-700",
    cancelled: "border-slate-200 bg-slate-100 text-slate-600",
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    on_shift: "border-blue-200 bg-blue-50 text-blue-700",
    operational: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-orange-200 bg-orange-50 text-orange-700",
    down: "border-red-200 bg-red-50 text-red-700",
    off_duty: "border-orange-200 bg-orange-50 text-orange-700",
    inactive: "border-slate-200 bg-slate-100 text-slate-600",
    paused: "border-orange-200 bg-orange-50 text-orange-700"
  }[normalized] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{valueLabel(normalized || "unknown", language)}</span>;
}

function WorkOrderStatus({ value, priority, language = "en" }) {
  const status = priority === "critical" ? "breakdown" : value;
  return <StatusBadge value={status} language={language} />;
}

function MaintenanceBadge({ value, language = "en" }) {
  const tone = {
    "DUE NOW": "border-red-200 bg-red-50 text-red-700",
    UPCOMING: "border-orange-200 bg-orange-50 text-orange-700",
    OK: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{valueLabel(value || "OK", language)}</span>;
}

function StockBadge({ value, language = "en" }) {
  const tone = {
    "OUT OF STOCK": "border-red-200 bg-red-50 text-red-700",
    "LOW STOCK": "border-orange-200 bg-orange-50 text-orange-700",
    OK: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{valueLabel(value || "OK", language)}</span>;
}

function PriorityBadge({ value, language = "en" }) {
  const tone = {
    critical: "border-red-200 bg-red-50 text-red-700",
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-orange-200 bg-orange-50 text-orange-700",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${tone}`}>{valueLabel(value, language)}</span>;
}

function ClipboardIcon(props) {
  return <Clock3 {...props} />;
}
