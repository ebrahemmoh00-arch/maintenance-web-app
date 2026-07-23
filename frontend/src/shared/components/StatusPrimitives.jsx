import { uiText } from "../i18n/index.js";

export function ProgressBar({
  value,
  tone = "blue"
}) {
  const colors = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    red: "bg-red-600",
    slate: "bg-slate-500"
  };
  return <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${colors[tone] || colors.blue}`} style={{
      width: `${Math.max(0, Math.min(Number(value) || 0, 100))}%`
    }} />
    </div>;
}

export function IndustrialStatusBadge({
  status,
  language
}) {
  const tone = {
    Running: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Idle: "border-slate-200 bg-slate-100 text-slate-700",
    "Under Maintenance": "border-blue-200 bg-blue-50 text-blue-700",
    Breakdown: "border-red-200 bg-red-50 text-red-700",
    Offline: "border-slate-300 bg-slate-200 text-slate-700"
  }[status] || "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{uiText(status, language)}</span>;
}

export function CriticalityBadge({
  value,
  language
}) {
  const normalized = String(value || "Medium").toLowerCase();
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  const tone = {
    critical: "border-red-300 bg-red-50 text-red-700",
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-orange-200 bg-orange-50 text-orange-700",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[normalized] || "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{uiText(label, language)}</span>;
}

export function SiteMiniStat({
  label,
  value,
  danger = false,
  language
}) {
  return <div className={`rounded-lg border px-3 py-2 ${danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
      <p className={`text-lg font-black ${danger ? "text-red-600" : "text-slate-950"}`}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{uiText(label, language)}</p>
    </div>;
}

export function PmStat({
  label,
  value,
  tone = "blue",
  language
}) {
  const colors = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700"
  };
  return <div className={`rounded-xl border p-4 ${colors[tone] || colors.blue}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] opacity-80">{uiText(label, language)}</p>
    </div>;
}

export function MiniKpi({
  label,
  value,
  tone = "blue",
  language
}) {
  const colors = {
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return <div className={`rounded-xl border px-3 py-3 shadow-sm ${colors[tone] || colors.blue}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em]">{uiText(label, language)}</p>
    </div>;
}
