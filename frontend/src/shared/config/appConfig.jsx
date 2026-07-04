import { EMPLOYEE_ROLE_OPTIONS } from "../../features/authentication/services/authSession.js";
import { MaintenanceBadge, PriorityBadge, StatusBadge, StockBadge, WorkOrderStatus, valueLabel } from "../components/StatusBadges.jsx";
import { resources } from "./resourceRegistry.jsx";

export const PERMISSION_ACTIONS = [{
  key: "view",
  label: "View"
}, {
  key: "add",
  label: "Add"
}, {
  key: "edit",
  label: "Edit"
}, {
  key: "delete",
  label: "Delete"
}];

export const PERMISSION_MODULES = [{
  key: "customers",
  label: "Locations / Customers",
  resourceKey: "customers"
}, {
  key: "equipment",
  label: "Assets / Equipment",
  resourceKey: "equipment"
}, {
  key: "asset-history",
  label: "Asset History"
}, {
  key: "engineers",
  label: "Resources / Users",
  resourceKey: "engineers"
}, {
  key: "work-orders",
  label: "Work Orders",
  resourceKey: "work-orders"
}, {
  key: "preventive-maintenance",
  label: "Preventive Maintenance",
  resourceKey: "preventive-maintenance"
}, {
  key: "pm-plans",
  label: "PM Plans",
  resourceKey: "pm-plans"
}, {
  key: "inventory",
  label: "Inventory / Spare Parts",
  resourceKey: "inventory"
}, {
  key: "reports",
  label: "Reports & Analytics"
}, {
  key: "audit-logs",
  label: "Audit Logs"
}, {
  key: "settings",
  label: "Settings"
}];

export function createDefaultPermissions() {
  return PERMISSION_MODULES.reduce((acc, module) => {
    acc[module.key] = {
      view: module.key !== "audit-logs",
      add: false,
      edit: false,
      delete: false
    };
    return acc;
  }, {});
}

export function createFullPermissions() {
  return PERMISSION_MODULES.reduce((acc, module) => {
    acc[module.key] = {
      view: true,
      add: true,
      edit: true,
      delete: true
    };
    return acc;
  }, {});
}

export function normalizeEmployeeRole(role = "viewer") {
  const normalized = String(role || "viewer").toLowerCase().trim().replaceAll(" ", "_").replaceAll("-", "_");
  if (normalized === "super_admin") return "admin";
  if (normalized === "user") return "viewer";
  if (["technician", "supervisor", "maintenance_manager", "branch_manager"].includes(normalized)) return "engineer";
  if (normalized === "storekeeper") return "store_keeper";
  return EMPLOYEE_ROLE_OPTIONS.includes(normalized) ? normalized : "viewer";
}

export function createRolePermissions(role = "viewer") {
  const normalized = normalizeEmployeeRole(role);
  if (normalized === "admin") return createFullPermissions();
  const permissions = createDefaultPermissions();
  if (normalized === "engineer") {
    permissions.equipment = {
      view: true,
      add: false,
      edit: true,
      delete: false
    };
    permissions["work-orders"] = {
      view: true,
      add: true,
      edit: true,
      delete: false
    };
    permissions["preventive-maintenance"] = {
      view: true,
      add: false,
      edit: true,
      delete: false
    };
    permissions["pm-plans"] = {
      view: true,
      add: false,
      edit: false,
      delete: false
    };
    permissions.inventory = {
      view: true,
      add: false,
      edit: false,
      delete: false
    };
  }
  if (normalized === "store_keeper") {
    permissions.inventory = {
      view: true,
      add: true,
      edit: true,
      delete: true
    };
    permissions["work-orders"] = {
      view: true,
      add: false,
      edit: false,
      delete: false
    };
  }
  return permissions;
}

export function parsePermissions(value, role = "user") {
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
    acc[module.key] = {
      ...fallback[module.key],
      ...(parsed?.[module.key] || {})
    };
    return acc;
  }, {});
}

export function stringifyPermissions(permissions) {
  return JSON.stringify(parsePermissions(permissions));
}

export function hasPermission(user, moduleKey, action = "view") {
  if (normalizeEmployeeRole(user?.role) === "admin") return true;
  const permissions = parsePermissions(user?.permissions, user?.role);
  return Boolean(permissions?.[moduleKey]?.[action]);
}

export function isVisiblePageForUser(user, page) {
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

export const AR = {
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
  Arabic: "عربي",
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

export function tr(language, text) {
  return language === "ar" ? AR[text] || text : text;
}

export function getAlertKey(alert) {
  return alert.alert_key || `${alert.alert_type || "asset"}-${alert.equipment_id ?? alert.pm_id ?? alert.inventory_id ?? alert.equipment_name}`;
}

export function buildSmartAlerts(equipmentAlerts, inventoryItems, pmTasks) {
  const assetAlerts = equipmentAlerts.map(alert => ({
    ...alert,
    alert_key: `asset-${alert.equipment_id}`,
    alert_type: "asset"
  }));
  const pmAlerts = pmTasks.filter(task => task.status === "active" && task.pm_alert && task.pm_alert !== "OK").map(task => {
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
  const stockAlerts = inventoryItems.filter(item => item.stock_alert && item.stock_alert !== "OK").map(item => ({
    alert_key: `stock-${item.id}`,
    alert_type: "inventory",
    inventory_id: item.id,
    equipment_name: item.name,
    serial_number: item.part_number || "Spare Part",
    location: item.location || "",
    alert_level: item.stock_alert === "OUT OF STOCK" ? "DUE NOW" : "UPCOMING",
    reason: item.stock_alert === "OUT OF STOCK" ? "Spare part is out of stock" : `${item.stock_quantity} ${item.unit || "pcs"} remaining, minimum ${item.minimum_quantity}`,
    next_maintenance_date: null,
    days_until_maintenance: null,
    hours_until_maintenance: null
  }));
  return [...assetAlerts, ...pmAlerts, ...stockAlerts];
}

export function localizedConfig(resourceKey, language) {
  const config = resources[resourceKey];
  return {
    ...config,
    title: tr(language, config.title),
    fields: config.fields.map(field => ({
      ...field,
      label: tr(language, field.label),
      addPlaceholder: field.addPlaceholder ? tr(language, field.addPlaceholder) : field.addPlaceholder,
      addLabel: field.addLabel ? tr(language, field.addLabel) : field.addLabel,
      options: Array.isArray(field.options) ? field.options.map(option => ({
        value: option,
        label: valueLabel(option, language)
      })) : field.options
    })),
    columns: config.columns.map(column => {
      const localized = {
        ...column,
        label: tr(language, column.label)
      };
      if (resourceKey === "work-orders" && column.key === "status") {
        localized.render = row => <WorkOrderStatus value={row.status} priority={row.priority} language={language} />;
      }
      if (resourceKey === "work-orders" && column.key === "priority") {
        localized.render = row => <PriorityBadge value={row.priority} language={language} />;
      }
      if (column.key === "status" && resourceKey !== "work-orders") {
        localized.render = row => <StatusBadge value={row.status} language={language} />;
      }
      if (column.key === "maintenance_alert") {
        localized.render = row => <MaintenanceBadge value={row.maintenance_alert} language={language} />;
      }
      if (column.key === "pm_alert") {
        localized.render = row => <MaintenanceBadge value={row.pm_alert} language={language} />;
      }
      if (column.key === "stock_alert") {
        localized.render = row => <StockBadge value={row.stock_alert} language={language} />;
      }
      return localized;
    })
  };
}

export function tableLabels(language) {
  return {
    actions: tr(language, "Actions"),
    edit: tr(language, "Edit"),
    delete: tr(language, "Delete")
  };
}
