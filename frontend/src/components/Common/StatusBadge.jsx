const STATUS_STYLES = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  "in progress": "border-blue-200 bg-blue-50 text-blue-700",
  breakdown: "border-red-200 bg-red-50 text-red-700",
  offline: "border-slate-200 bg-slate-100 text-slate-600"
};

export default function StatusBadge({ status = "Pending" }) {
  const key = String(status).toLowerCase();
  const style = STATUS_STYLES[key] || "border-slate-200 bg-slate-50 text-slate-600";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] ${style}`}>{status}</span>;
}
