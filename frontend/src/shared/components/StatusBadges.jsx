import { EMPLOYEE_ROLE_OPTIONS } from "../../features/authentication/services/authSession.js";
import { normalizeWorkOrderStatus } from "../../features/work-orders/utils/workOrderStatus.js";
import { Clock3 } from "lucide-react";

export const VALUE_AR = {
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

export function valueLabel(value, language) {
  if (EMPLOYEE_ROLE_OPTIONS.includes(String(value))) {
    const labels = {
      admin: "Admin",
      engineer: "Engineer",
      store_keeper: "Store Keeper",
      viewer: "Regular User",
      user: "Regular User"
    };
    return labels[String(value)] || "Regular User";
  }
  return language === "ar" ? VALUE_AR[value] || VALUE_AR[String(value).replace("_", " ")] || value : String(value || "unknown").replace("_", " ");
}

export function StatusBadge({
  value,
  language = "en"
}) {
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

export function WorkOrderStatus({
  value,
  priority,
  language = "en"
}) {
  const status = priority === "critical" ? "breakdown" : value;
  return <StatusBadge value={status} language={language} />;
}

export function MaintenanceBadge({
  value,
  language = "en"
}) {
  const tone = {
    "DUE NOW": "border-red-200 bg-red-50 text-red-700",
    UPCOMING: "border-orange-200 bg-orange-50 text-orange-700",
    OK: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{valueLabel(value || "OK", language)}</span>;
}

export function StockBadge({
  value,
  language = "en"
}) {
  const tone = {
    "OUT OF STOCK": "border-red-200 bg-red-50 text-red-700",
    "LOW STOCK": "border-orange-200 bg-orange-50 text-orange-700",
    OK: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{valueLabel(value || "OK", language)}</span>;
}

export function PriorityBadge({
  value,
  language = "en"
}) {
  const tone = {
    critical: "border-red-200 bg-red-50 text-red-700",
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-orange-200 bg-orange-50 text-orange-700",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${tone}`}>{valueLabel(value, language)}</span>;
}

export function ClipboardIcon(props) {
  return <Clock3 {...props} />;
}
