import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Box,
  CalendarCheck,
  CheckCircle,
  Clock,
  FilePlus,
  FileText,
  Gauge,
  Image,
  Lock,
  MessageSquare,
  PackageMinus,
  PackagePlus,
  Play,
  PlayCircle,
  ShieldCheck,
  Shuffle,
  UserCheck,
  Wrench
} from "lucide-react";
import { tr } from "../../../../shared/config/appConfig.jsx";
import { formatDateTime } from "../../../../shared/i18n/index.js";

const ICONS = {
  activity: Activity,
  "alert-triangle": AlertTriangle,
  "badge-check": BadgeCheck,
  box: Box,
  "calendar-check": CalendarCheck,
  "check-circle": CheckCircle,
  clock: Clock,
  edit: Shuffle,
  "file-plus": FilePlus,
  "file-text": FileText,
  gauge: Gauge,
  image: Image,
  lock: Lock,
  "message-square": MessageSquare,
  "package-minus": PackageMinus,
  "package-plus": PackagePlus,
  play: Play,
  "play-circle": PlayCircle,
  "shield-check": ShieldCheck,
  shuffle: Shuffle,
  "user-check": UserCheck,
  wrench: Wrench
};

export function HistoryEventCard({ event, onOpen, language }) {
  const t = text => tr(language, text);
  const Icon = ICONS[event.icon] || Activity;
  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-slate-950">{t(event.event_type)}</h4>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">{t(event.category)}</span>
                {event.status ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-blue-700">{t(event.status)}</span> : null}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800">{event.summary || t("Asset history event")}</p>
              {event.description ? <p className="mt-1 text-xs font-semibold text-slate-500">{event.description}</p> : null}
            </div>
            <time className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-right text-xs font-black text-slate-600">{formatEventTime(event.event_time, language)}</time>
          </div>

          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <Meta label="User" value={event.technician || event.user_name} language={language} />
            <Meta label="Work Order" value={event.work_order_number} language={language} />
            <Meta label="PM Plan" value={event.pm_plan} language={language} />
            <Meta label="Failure Code" value={event.failure_code} language={language} />
            <Meta label="Downtime" value={event.downtime_duration} language={language} />
            <Meta label="Parts" value={partsLabel(event.parts_used, language)} language={language} />
          </div>

          <button
            type="button"
            onClick={() => onOpen(event)}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700"
          >
            {t("Expand Details")}
          </button>
        </div>
      </div>
    </article>
  );
}

function Meta({ label, value, language }) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{tr(language, label)}</span>
      <span className="mt-1 block truncate text-slate-700">{value}</span>
    </div>
  );
}

function formatEventTime(value, language) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return formatDateTime(parsed, language);
}

function partsLabel(value, language) {
  if (!value) return "";
  if (Array.isArray(value)) return `${value.length} ${tr(language, value.length === 1 ? "item" : "items")}`;
  if (typeof value === "object") return Object.keys(value).join(", ");
  return String(value);
}
