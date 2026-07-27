import { Panel } from "../../../shared/components/Panel.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { calculateDuration, parseWorkOrderNotes } from "../../work-orders/utils/workOrderForms.js";
import { Activity, Bell, CheckCircle2, Clock3, TimerReset, Wrench } from "lucide-react";
import { AuditStatCard } from "./AuditLogsPanel.jsx";

export function WorkOrderKpisPage({
  data,
  language
}) {
  const t = text => tr(language, text);
  const metrics = buildWorkOrderKpiMetrics(data["work-orders"] || []);
  return (
    <div className="space-y-5">
      <Panel title={t("Work Order KPIs")} subtitle={t("Execution, completion, cost, and downtime indicators moved from the Work Orders KPI sidebar.")}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ReportKpiCard label="Execution Duration" value={metrics.executionDuration} icon={Clock3} tone="blue" helper={t("Average execution time")} language={language} />
          <ReportKpiCard label="Completion" value={metrics.completionRate} icon={CheckCircle2} tone={metrics.completedCount ? "green" : "amber"} helper={`${metrics.completedCount} / ${metrics.totalOrders} ${t("completed")}`} language={language} />
          <ReportKpiCard label="Labor Cost" value={`${metrics.laborCost.toLocaleString()} EGP`} icon={Wrench} tone="slate" helper={t("Recorded labor cost")} language={language} />
          <ReportKpiCard label="Parts Cost" value={`${metrics.partsCost.toLocaleString()} EGP`} icon={Bell} tone={metrics.partsCost ? "amber" : "slate"} helper={t("Spare parts consumption")} language={language} />
          <ReportKpiCard label="Total Cost" value={`${metrics.totalCost.toLocaleString()} EGP`} icon={Activity} tone={metrics.totalCost ? "blue" : "slate"} helper={t("Labor plus spare parts")} language={language} />
          <ReportKpiCard label="Downtime" value={metrics.downtime} icon={TimerReset} tone={metrics.downtimeMinutes ? "red" : "slate"} helper={t("Total downtime exposure")} language={language} />
        </div>
      </Panel>

      <Panel title={t("Work Order KPI Summary")} subtitle={t("High-level work order performance snapshot.")}>
        <div className="grid gap-3 md:grid-cols-4">
          <AuditStatCard label={t("Total Work Orders")} value={metrics.totalOrders} tone="blue" />
          <AuditStatCard label={t("Completed")} value={metrics.completedCount} tone="green" />
          <AuditStatCard label={t("Open Work Orders")} value={metrics.openCount} tone={metrics.openCount ? "amber" : "green"} />
          <AuditStatCard label={t("Average Downtime")} value={metrics.averageDowntime} tone={metrics.downtimeMinutes ? "red" : "green"} />
        </div>
      </Panel>
    </div>
  );
}

export function ReportKpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "blue",
  language
}) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-700 ring-blue-100",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "border-amber-100 bg-amber-50 text-amber-700 ring-amber-100",
    red: "border-red-100 bg-red-50 text-red-700 ring-red-100",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700 ring-cyan-100",
    slate: "border-slate-200 bg-slate-50 text-slate-700 ring-slate-100"
  };
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ring-1 ${colors[tone] || colors.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] opacity-80">{tr(language, label)}</p>
          <p className="mt-3 text-4xl font-black tracking-tight">{value}</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/80 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {helper ? <p className="mt-3 text-sm font-bold opacity-75">{helper}</p> : null}
    </article>
  );
}

export function buildWorkOrderKpiMetrics(workOrders = []) {
  const totalOrders = workOrders.length;
  const completedStatuses = new Set(["completed", "approved", "closed"]);
  const completedCount = workOrders.filter(order => completedStatuses.has(String(order.status || "").toLowerCase())).length;
  const openCount = Math.max(totalOrders - completedCount, 0);
  const durationMinutes = workOrders.map(workOrderDurationMinutes).filter(value => value > 0);
  const totalDurationMinutes = durationMinutes.reduce((sum, value) => sum + value, 0);
  const downtimeMinutes = workOrders.reduce((sum, order) => sum + Number(order.work_duration_minutes || 0), 0) || totalDurationMinutes;
  const laborCost = workOrders.reduce((sum, order) => sum + numericValue(order.labor_cost || order.actual_labor_cost), 0);
  const partsCost = workOrders.reduce((sum, order) => sum + workOrderPartsCost(order), 0);
  const averageDuration = durationMinutes.length ? Math.round(totalDurationMinutes / durationMinutes.length) : 0;
  const averageDowntime = totalOrders ? Math.round(downtimeMinutes / totalOrders) : 0;
  return {
    totalOrders,
    completedCount,
    openCount,
    executionDuration: formatMinutesLabel(averageDuration),
    completionRate: totalOrders ? `${Math.round(completedCount / totalOrders * 100)}%` : "0%",
    laborCost,
    partsCost,
    totalCost: laborCost + partsCost,
    downtimeMinutes,
    downtime: formatMinutesLabel(downtimeMinutes),
    averageDowntime: formatMinutesLabel(averageDowntime)
  };
}

function workOrderDurationMinutes(order) {
  const savedDuration = Number(order.work_duration_minutes || 0);
  if (savedDuration > 0) return savedDuration;
  const meta = parseWorkOrderNotes(order.notes);
  return parseDurationMinutes(meta.duration || calculateDuration(meta.start_time, meta.finished_time));
}

function workOrderPartsCost(order) {
  const meta = parseWorkOrderNotes(order.notes);
  return (meta.spare_parts_items || []).reduce((sum, item) => {
    const directTotal = numericValue(item.total || item.total_cost);
    if (directTotal) return sum + directTotal;
    return sum + numericValue(item.qty) * numericValue(item.unit_cost || item.cost);
  }, 0);
}

function parseDurationMinutes(value) {
  const text = String(value || "");
  const match = text.match(/^(\d+):(\d{1,2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutesLabel(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return `${hours}:${String(rest).padStart(2, "0")}`;
}

function numericValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}
