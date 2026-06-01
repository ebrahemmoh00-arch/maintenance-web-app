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
  Globe2,
  Lock,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Printer,
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

import { api } from "./api";
import Sidebar from "./components/Sidebar";
import Panel from "./components/Panel";
import DataTable from "./components/DataTable";
import FormModal from "./components/FormModal";
import MetricCard from "./components/MetricCard";
import { BarChart, DonutChart, LineChart } from "./components/Charts";
import EmptyState from "./components/EmptyState";

const LOGIN_USERNAME = "ECS-ECS";
const LOGIN_PASSWORD = "E5C9S2@rom";
const EMPLOYEE_ROLE_OPTIONS = ["viewer", "technician", "supervisor", "admin"];

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
      location: "",
      parent_id: null,
      asset_type: "Equipment",
      asset_level: "Equipment",
      asset_code: "",
      criticality: "Medium",
      maintenance_interval_hours: 1000,
      maintenance_interval_days: 90,
      current_hours: 0,
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
      { key: "location", label: "Asset Location" },
      { key: "current_hours", label: "Current Hours / Running Hours", type: "number" },
      { key: "criticality", label: "Criticality", type: "select", options: ["Low", "Medium", "High", "Critical"] },
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
      { key: "status", label: "Status", type: "select", options: ["pending", "in_progress", "completed", "cancelled"] },
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
  { key: "inventory", label: "Inventory / Spare Parts", resourceKey: "inventory" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "settings", label: "Settings" }
];

function createDefaultPermissions() {
  return PERMISSION_MODULES.reduce((acc, module) => {
    acc[module.key] = { view: true, add: false, edit: false, delete: false };
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
  const normalized = String(role || "viewer").toLowerCase();
  if (normalized === "user") return "viewer";
  return EMPLOYEE_ROLE_OPTIONS.includes(normalized) ? normalized : "viewer";
}

function createRolePermissions(role = "viewer") {
  const normalized = normalizeEmployeeRole(role);
  if (normalized === "admin") return createFullPermissions();
  const permissions = createDefaultPermissions();
  if (normalized === "supervisor") {
    for (const module of PERMISSION_MODULES) {
      permissions[module.key] = { view: true, add: true, edit: true, delete: ["work-orders", "preventive-maintenance"].includes(module.key) };
    }
  }
  if (normalized === "technician") {
    permissions["work-orders"] = { view: true, add: true, edit: true, delete: false };
    permissions["preventive-maintenance"] = { view: true, add: false, edit: true, delete: false };
    permissions.inventory = { view: true, add: false, edit: false, delete: false };
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

export default function App() {
  const [active, setActive] = useState(() => {
    const page = new URLSearchParams(window.location.search).get("page");
    return ["dashboard", "customers", "equipment", "engineers", "work-orders", "schedule", "inventory", "reports", "settings", "access-control"].includes(page) ? page : "dashboard";
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
  const [authenticated, setAuthenticated] = useState(
    () =>
      localStorage.getItem("maintenance-authenticated") === "true" &&
      ["admin", "supervisor", "technician", "viewer", "user"].includes(localStorage.getItem("maintenance-role") || "") &&
      Boolean(localStorage.getItem("maintenance-auth-user"))
  );
  const [currentUser, setCurrentUser] = useState(() => ({
    username: localStorage.getItem("maintenance-auth-user") || "",
    name: localStorage.getItem("maintenance-auth-name") || "",
    role: localStorage.getItem("maintenance-role") || "",
    permissions: localStorage.getItem("maintenance-permissions") || ""
  }));
  const [loginValue, setLoginValue] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState({ customers: [], engineers: [], equipment: [], "work-orders": [], inventory: [], "preventive-maintenance": [], "job-titles": [] });
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total_orders: 0, pending_orders: 0, completed_orders: 0 });
  const [modal, setModal] = useState(null);
  const [formValue, setFormValue] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const options = useMemo(
    () => ({
      customers: data.customers.map((item) => ({ value: item.id, label: item.name })),
      customerLocations: [{ value: "Available for All Sites", label: "Available for All Sites" }, ...data.customers.map((item) => ({ value: item.name, label: item.name }))],
      engineers: data.engineers.map((item) => ({ value: item.id, label: item.name })),
      equipment: data.equipment.map((item) => ({ value: item.id, label: item.name })),
      jobTitles: jobTitleOptions(data["job-titles"], data.engineers),
      assetParents: data.equipment
        .filter((item) => !modal?.id || Number(item.id) !== Number(modal.id))
        .map((item) => ({ value: item.id, label: `${item.asset_code || `AST-${item.id}`} - ${item.name}` })),
      "work-orders": data["work-orders"].map((item) => ({ value: item.id, label: item.title }))
    }),
    [data, modal?.id]
  );

  async function loadAll(options = {}) {
    const silent = Boolean(options?.silent);
    if (!silent) setLoading(true);
    setError("");
    try {
      const [customers, engineers, equipment, workOrders, inventory, preventiveMaintenance, jobTitles, dashboard, maintenanceAlerts] = await Promise.all([
        api.list("customers"),
        api.list("engineers"),
        api.list("equipment"),
        api.list("work-orders"),
        api.list("inventory"),
        api.list("preventive-maintenance"),
        api.list("job-titles"),
        api.stats(),
        api.alerts()
      ]);
      setData({ customers, engineers, equipment, "work-orders": workOrders, inventory, "preventive-maintenance": preventiveMaintenance, "job-titles": jobTitles });
      setAlerts(buildSmartAlerts(maintenanceAlerts, inventory, preventiveMaintenance));
      setStats(dashboard);
      const storedUsername = localStorage.getItem("maintenance-auth-user") || "";
      if (storedUsername && storedUsername !== LOGIN_USERNAME) {
        const refreshedUser = engineers.find((user) => user.username === storedUsername);
        if (refreshedUser) {
          const permissions = refreshedUser.permissions || "";
          localStorage.setItem("maintenance-permissions", permissions);
          setCurrentUser({
            username: refreshedUser.username,
            name: refreshedUser.name,
            role: normalizeEmployeeRole(refreshedUser.role),
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

  useEffect(() => {
    if (authenticated) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  const isAdmin = normalizeEmployeeRole(currentUser.role) === "admin";
  const canAddWorkOrders = hasPermission(currentUser, "work-orders", "add");
  const canModifyWorkOrders = hasPermission(currentUser, "work-orders", "edit") || hasPermission(currentUser, "work-orders", "delete");

  async function handleLogin(event) {
    event.preventDefault();
    const usernameMatches = loginValue.username.trim() === LOGIN_USERNAME;
    const passwordMatches = loginValue.password === LOGIN_PASSWORD;
    if (usernameMatches && passwordMatches) {
      localStorage.setItem("maintenance-authenticated", "true");
      localStorage.setItem("maintenance-role", "admin");
      localStorage.setItem("maintenance-auth-user", LOGIN_USERNAME);
      localStorage.setItem("maintenance-auth-name", "Administrator");
      localStorage.setItem("maintenance-permissions", JSON.stringify(createFullPermissions()));
      setCurrentUser({ username: LOGIN_USERNAME, name: "Administrator", role: "admin", permissions: JSON.stringify(createFullPermissions()) });
      setAuthenticated(true);
      setLoginError("");
      return;
    }

    try {
      const users = await api.list("engineers");
      const matchedUser = users.find(
        (user) =>
          user.status === "active" &&
          user.username &&
          user.username === loginValue.username.trim() &&
          user.password === loginValue.password
      );
      if (!matchedUser) {
        setLoginError(tr(language, "Invalid username or password"));
        return;
      }
      const role = normalizeEmployeeRole(matchedUser.role);
      localStorage.setItem("maintenance-authenticated", "true");
      localStorage.setItem("maintenance-role", role);
      localStorage.setItem("maintenance-auth-user", matchedUser.username);
      localStorage.setItem("maintenance-auth-name", matchedUser.name);
      localStorage.setItem("maintenance-permissions", matchedUser.permissions || "");
      setCurrentUser({ username: matchedUser.username, name: matchedUser.name, role, permissions: matchedUser.permissions || "" });
      setAuthenticated(true);
      setLoginError("");
    } catch (err) {
      setLoginError(err.message || tr(language, "Invalid username or password"));
    }
  }

  function handleLogout() {
    localStorage.removeItem("maintenance-authenticated");
    localStorage.removeItem("maintenance-role");
    localStorage.removeItem("maintenance-auth-user");
    localStorage.removeItem("maintenance-auth-name");
    localStorage.removeItem("maintenance-permissions");
    setAuthenticated(false);
    setCurrentUser({ username: "", name: "", role: "", permissions: "" });
    setLoginValue({ username: "", password: "" });
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
          : nextValue
    );
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
    <div dir={language === "ar" ? "rtl" : "ltr"} className={`flex min-h-screen w-full overflow-x-auto ${darkMode ? "bg-slate-900" : "bg-slate-100"} text-slate-900`}>
      <Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} language={language} isAdmin={isAdmin} />
      <main className="min-w-[920px] flex-1 overflow-x-auto">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">{t("Professional Industrial Maintenance Dashboard")}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{pageTitle(active, language)}</h1>
            </div>
            <div className="flex items-center gap-3">
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
        <div className="min-w-[920px] space-y-6 p-6">
          {loading && <SkeletonDashboard />}
          {!loading && page === "dashboard" && (
            <Dashboard
              stats={stats}
              data={data}
              alerts={alerts}
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
              engineers={data.engineers}
              onSave={saveWorkOrderDocument}
              onDelete={(id) => deleteRecord("work-orders", id)}
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
              rows={data.engineers}
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
          {!loading && page === "reports" && <Reports data={data} alerts={alerts} stats={stats} language={language} />}
          {!loading && page === "settings" && <SettingsSummary data={data} language={language} onAccessControl={() => setActive("access-control")} isAdmin={isAdmin} />}
          {!loading && page === "access-control" && isAdmin && (
            <AccessControlPage
              users={data.engineers}
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
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t("Username")}</span>
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
    schedule: "Maintenance Schedule",
    inventory: "Inventory",
    reports: "Reports & Analytics",
    "access-control": "Access Control",
    settings: "Settings"
  };
  return tr(language, titles[active] || active);
}

function Dashboard({ stats, data, alerts, openCreate, canManage, language, dashboardAlertsOpen, setDashboardAlertsOpen }) {
  const t = (text) => tr(language, text);
  const workOrders = data["work-orders"];
  const activeOrders = workOrders.filter((item) => item.status !== "completed" && item.status !== "cancelled").length;
  const breakdowns = data.equipment.filter((item) => item.status === "down").length + alerts.filter((item) => item.alert_level === "DUE NOW").length;
  const completedThisWeek = workOrders.filter((item) => item.status === "completed").length || stats.completed_orders;
  const availableTechnicians = data.engineers.filter((item) => item.status === "active").length;
  const averageDowntime = `${Math.max(1.2, breakdowns * 2.4 + activeOrders * 0.35).toFixed(1)}h`;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
        <MetricCard label={t("Total Active Work Orders")} value={activeOrders} icon={Activity} tone="blue" helper={t("Open operational workload")} />
        <MetricCard label={t("Equipment Breakdowns")} value={breakdowns} icon={AlertTriangle} tone={breakdowns ? "red" : "green"} helper={t("Down or due-now assets")} />
        <MetricCard label={t("Completed This Week")} value={completedThisWeek} icon={CheckCircle2} tone="green" helper={t("Closed maintenance orders")} />
        <MetricCard label={t("Available Technicians")} value={availableTechnicians} icon={UsersRound} tone="cyan" helper={t("Ready for assignment")} />
        <MetricCard label={t("Average Downtime")} value={averageDowntime} icon={TimerReset} tone="orange" helper={t("Estimated operational impact")} />
      </div>

      <DashboardAlertControls
        alerts={alerts}
        equipment={data.equipment}
        workOrders={data["work-orders"]}
        open={dashboardAlertsOpen}
        setOpen={setDashboardAlertsOpen}
        language={language}
      />
      <AnalyticsSection data={data} alerts={alerts} language={language} />
      <WorkloadAnalyticsCharts workOrders={workOrders} language={language} />

      <EquipmentHealthMonitoring equipment={data.equipment} pmTasks={data["preventive-maintenance"]} language={language} />
      <SiteStatusOverview customers={data.customers} equipment={data.equipment} engineers={data.engineers} alerts={alerts} language={language} />
      <PreventiveMaintenanceDashboard pmTasks={data["preventive-maintenance"]} workOrders={data["work-orders"]} language={language} />

      <div className="grid gap-6 xl:grid-cols-2">
        <InventoryMonitoringSection inventory={data.inventory} language={language} />
        <TechnicianPerformanceSection engineers={data.engineers} workOrders={data["work-orders"]} language={language} />
      </div>

    </>
  );
}

function DashboardAlertControls({ alerts, equipment, workOrders, open, setOpen, language }) {
  const t = (text) => tr(language, text);
  const criticalAlerts = alerts.filter((alert) => alert.alert_level === "DUE NOW").length;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("Alerts")}</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{alerts.length}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{criticalAlerts} {t("Critical")} / {Math.max(alerts.length - criticalAlerts, 0)} {t("Warning")}</p>
            </div>
            <span className={`grid h-14 w-14 place-items-center rounded-xl ${alerts.length ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
              <Bell className="h-6 w-6" />
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-xl border border-blue-200 bg-blue-700 p-5 text-left text-white shadow-sm transition hover:bg-blue-800"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">{t("Show Alarms")}</p>
              <p className="mt-3 text-2xl font-black">{t("Show Alarms")}</p>
              <p className="mt-2 text-sm font-semibold text-blue-100">{t("Open alarm panel")}</p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/15">
              <AlertTriangle className="h-6 w-6" />
            </span>
          </div>
        </button>
      </div>

      {open ? (
        <AlertsAlarmsSection alerts={alerts} equipment={equipment} workOrders={workOrders} language={language} />
      ) : null}
    </div>
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

function AssetDetailsPanel({ asset, rows, departments, workOrders, pmTasks, inventory, onEdit, onDelete, canManage, canEdit = canManage, canDelete = canManage, language }) {
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

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <AssetRelationList title="Children" rows={children.map((item) => `${item.asset_code || `AST-${item.id}`} - ${item.name}`)} empty="No child assets" />
        <AssetRelationList title="Linked Work Orders" rows={linkedOrders.map((item) => `${item.title} (${item.status})`)} empty="No linked work orders" />
        <AssetRelationList title="Preventive Maintenance" rows={linkedPm.map((item) => `${item.task_name} - ${item.pm_alert || item.status}`)} empty="No PM tasks" />
        <AssetRelationList title="Spare Parts" rows={linkedParts.map((item) => `${item.part_number || "PART"} - ${item.name} (${item.stock_quantity} ${item.unit || "pcs"})`)} empty="No linked spare parts" />
      </div>

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
  return employeeRole(employee?.role) === "technician" || /technician/i.test(employeeJobTitle(employee));
}

function isEngineerEmployee(employee) {
  return /engineer/i.test(employeeJobTitle(employee));
}

function employeeMatchesGroup(employee, group) {
  if (!group) return false;
  if (group === "all") return true;
  if (group === "active") return employee?.status === "active";
  if (group === "technicians") return isTechnicianEmployee(employee);
  if (group === "engineers") return isEngineerEmployee(employee);
  return true;
}

function employeeGroupTitle(group, language = "en") {
  const titles = {
    all: "Total Employees",
    active: "Active Staff",
    technicians: "Technicians",
    engineers: "Engineers"
  };
  return tr(language, titles[group] || "Employees");
}

function employeeRoleLabel(role) {
  const labels = {
    admin: "Admin",
    supervisor: "Supervisor",
    technician: "Technician",
    viewer: "Viewer",
    user: "Viewer"
  };
  return labels[normalizeEmployeeRole(role)] || "Viewer";
}

function jobTitleOptions(jobTitles = [], employees = []) {
  const titles = uniqueSorted([
    ...jobTitles.map((item) => item.name),
    ...employees.map((employee) => employee.job_title || employee.specialty),
    "Shift Engineer",
    "Maintenance Engineer",
    "Senior Electrical Technician",
    "Mechanical Technician",
    "Electrical Technician",
    "Maintenance Supervisor",
    "Technician"
  ]);
  return titles.map((title) => ({ value: title, label: title }));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => String(first).localeCompare(String(second), undefined, { sensitivity: "base" }));
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

const DOCUMENT_CODE = "ECS-EN-OP-01-F-12";
const ISSUE_NO = "1";
const ISSUE_DATE = "1-Mar-21";

function WorkOrdersPage({ rows, customers, equipment, engineers, onSave, onDelete, onBackToEquipment, canManage, canCreate = canManage, canEdit = canManage, canDelete = canManage, language }) {
  const t = (text) => tr(language, text);
  const [selectedSavedId, setSelectedSavedId] = useState(rows[0]?.id || "");
  const [savedFilter, setSavedFilter] = useState({ equipmentId: "", date: "" });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => createWorkOrderForm({ equipment, customers, engineers, rows }));
  const [qrOpen, setQrOpen] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
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
    setForm(createWorkOrderForm({ equipment, customers, engineers, rows }));
  }

  function editSelected() {
    if (!canEdit) return;
    const selected = rows.find((row) => Number(row.id) === Number(selectedSavedId));
    if (!selected) return;
    setEditingId(selected.id);
    setForm(formFromSavedOrder(selected, equipment, customers, engineers));
  }

  async function deleteSelected() {
    if (!canDelete) return;
    if (!selectedSavedId) return;
    const confirmed = window.confirm(language === "ar" ? "هل تريد حذف أمر العمل المحدد؟" : "Delete the selected work order?");
    if (!confirmed) return;
    await onDelete(selectedSavedId);
    setEditingId(null);
    setSelectedSavedId("");
  }

  async function saveWorkOrder() {
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

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-5 py-4 text-white">
          <div>
            <h2 className="text-xl font-black">{t("Work Order")}: {selectedCustomer?.name || "Customer"} / {selectedEquipment?.name || "Asset"}</h2>
            <p className="mt-1 text-sm text-slate-300">{t("Create a work order using the current service hours from the maintenance record.")}</p>
          </div>
          <button type="button" onClick={onBackToEquipment} className="rounded-lg bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-100">
            {t("Back to Equipment")}
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-white p-4 md:grid-cols-3">
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Customer")}</span>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500" value={form.customer_id || ""} onChange={(event) => chooseCustomer(event.target.value)}>
              <option value=""></option>
              {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Equipment")}</span>
            <div className="flex gap-2">
              <select className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400" value={form.equipment_id || ""} onChange={(event) => chooseEquipment(event.target.value)} disabled={!form.customer_id}>
                <option value=""></option>
                {filteredEquipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button type="button" onClick={qrOpen ? closeQrScanner : openQrScanner} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-cyan-400 hover:text-cyan-700" title={t("Scan Equipment QR")}>
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </label>
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("THE WORK ORDER IS ISSUED BY SHIFT ENGINEER")}</span>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500"
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

        <div className="work-order-print-area max-h-[72vh] overflow-auto bg-slate-100 p-4">
          <div className="mx-auto min-w-[1120px] max-w-[1280px] border-2 border-slate-950 bg-white text-[12px] text-slate-950 shadow-sm">
            <div className="grid grid-cols-[340px_1fr_260px] border-b-2 border-slate-950">
              <div className="grid grid-cols-[150px_1fr] border-r-2 border-slate-950">
                <DocLabel>{t("Document Code")}:</DocLabel><DocStatic>{DOCUMENT_CODE}</DocStatic>
                <DocLabel>{t("Issue No")}:</DocLabel><DocStatic>{ISSUE_NO}</DocStatic>
                <DocLabel>{t("Issue Date")}:</DocLabel><DocStatic>{ISSUE_DATE}</DocStatic>
                <DocLabel>{t("W.O No")}:</DocLabel><DocStatic>{form.wo_no}</DocStatic>
              </div>
              <div className="grid place-items-center border-r-2 border-slate-950 px-4 text-center text-xl font-black">
                Energy - Power Plant Work Order
              </div>
              <div className="grid place-items-center p-4">
                <div className="text-center">
                  <div className="text-4xl font-black tracking-tight text-red-800">ECS</div>
                  <div className="text-[11px] font-bold leading-tight">Energy &<br />Contracting<br />Solutions</div>
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

        <div className="grid gap-4 border-t border-slate-200 bg-white p-4 lg:grid-cols-2">
          <PhotoUploader title={t("Before Maintenance Photos")} photos={form.before_photos} onChange={(photos) => updatePhotos("before_photos", photos)} uploadLabel={t("Upload Photos")} />
          <PhotoUploader title={t("After Maintenance Photos")} photos={form.after_photos} onChange={(photos) => updatePhotos("after_photos", photos)} uploadLabel={t("Upload Photos")} />
        </div>

        {(canCreate || (editingId && canEdit)) ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
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
        <SavedWorkOrdersTable rows={filteredSavedRows} selectedId={selectedSavedId} setSelectedId={setSelectedSavedId} language={language} />
      </Panel>
    </div>
  );
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

function SavedWorkOrdersTable({ rows, selectedId, setSelectedId, language }) {
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
                <tr key={row.id} className={Number(row.id) === Number(selectedId) ? "bg-blue-50" : "odd:bg-white even:bg-slate-50"}>
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

  const activeStaff = rows.filter((employee) => employee.status === "active").length;
  const technicians = rows.filter(isTechnicianEmployee).length;
  const engineers = rows.filter(isEngineerEmployee).length;
  const activeGroupTitle = employeeGroupTitle(activeGroup, language);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <EmployeeMetricButton label={t("Total Employees")} value={rows.length} icon={UsersRound} tone="blue" helper={t("All registered staff")} active={activeGroup === "all"} onClick={() => setActiveGroup("all")} />
        <EmployeeMetricButton label={t("Active Staff")} value={activeStaff} icon={CheckCircle2} tone="green" helper={t("Active staff")} active={activeGroup === "active"} onClick={() => setActiveGroup("active")} />
        <EmployeeMetricButton label={t("Technicians")} value={technicians} icon={Wrench} tone="cyan" helper={t("Technical execution roles")} active={activeGroup === "technicians"} onClick={() => setActiveGroup("technicians")} />
        <EmployeeMetricButton label={t("Engineers")} value={engineers} icon={ShieldCheck} tone="orange" helper={t("Engineering roles")} active={activeGroup === "engineers"} onClick={() => setActiveGroup("engineers")} />
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
    supervisor: "border-blue-200 bg-blue-50 text-blue-700",
    technician: "border-cyan-200 bg-cyan-50 text-cyan-700",
    viewer: "border-slate-200 bg-slate-100 text-slate-600"
  }[role] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{employeeRoleLabel(role)}</span>;
}

function CrudPage({ resourceKey, rows, onCreate, onEdit, onDelete, canManage = true, canAdd = canManage, canEdit = canManage, canDelete = canManage, language }) {
  const config = localizedConfig(resourceKey, language);
  const t = (text) => tr(language, text);
  return (
    <Panel
      title={config.title}
      subtitle={t("Create, update, and control operational records through the existing REST API.")}
      actions={canAdd ? (
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
          <Plus className="h-4 w-4" />
          {t("New Record")}
        </button>
      ) : null}
    >
      <DataTable columns={config.columns} rows={rows} onEdit={canEdit ? onEdit : null} onDelete={canDelete ? onDelete : null} emptyMessage={`${t("No records found.")}`} labels={tableLabels(language)} />
    </Panel>
  );
}

function Reports({ data, alerts, stats, language }) {
  const t = (text) => tr(language, text);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label={t("Total Orders")} value={stats.total_orders} icon={ClipboardIcon} tone="blue" />
        <MetricCard label={t("Alerts")} value={alerts.length} icon={Bell} tone={alerts.length ? "red" : "green"} />
        <MetricCard label={t("Assets Monitored")} value={data.equipment.length} icon={Wrench} tone="cyan" />
      </div>
      <AnalyticsSection data={data} alerts={alerts} language={language} />
    </>
  );
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

function engineerWorkloadData(workOrders, language = "en") {
  const counts = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const name = cleanChartLabel(meta.shift_engineer_name || order.engineer_name || "") || tr(language, "Unassigned");
    addChartValue(counts, name, 1);
  }
  return chartRowsFromMap(counts, "bg-blue-600", language);
}

function technicianWorkloadData(workOrders, language = "en") {
  const counts = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const names = extractTechnicianNames(meta);
    const uniqueNames = names.length ? [...new Set(names)] : [tr(language, "Unassigned")];
    for (const name of uniqueNames) addChartValue(counts, name, 1);
  }
  return chartRowsFromMap(counts, "bg-cyan-600", language);
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
  return language === "ar" ? VALUE_AR[value] || VALUE_AR[String(value).replace("_", " ")] || value : String(value || "unknown").replace("_", " ");
}

function StatusBadge({ value, language = "en" }) {
  const tone = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{valueLabel(value || "unknown", language)}</span>;
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
