import { DonutChart, LineChart } from "../../../shared/components/Charts.jsx";
import { MetricCard } from "../../../shared/components/MetricCard.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { MiniKpi, PmStat } from "../../../shared/components/StatusPrimitives.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { applyDashboardFilters, buildDashboardFilterOptions, createDashboardFilters } from "../utils/dashboardFilters.js";
import { buildMaintenanceDashboardMetrics } from "../utils/maintenanceMetrics.jsx";
import { buildAssetReliability, engineerWorkloadData, technicianWorkloadData } from "../utils/reliabilityMetrics.js";
import { AlertsAlarmsSection } from "./OperationalWidgets.jsx";
import { AssetReliabilityPanel, DashboardBottomRow } from "./ReliabilityPanels.jsx";
import { WorkOrderParticipationPanel } from "./WorkOrderParticipation.jsx";
import { Activity, AlertTriangle, Bell, CheckCircle2, Cpu, TimerReset, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

export function Dashboard({
  stats,
  data,
  alerts,
  backendReliability,
  openCreate,
  canManage,
  language,
  dashboardAlertsOpen,
  setDashboardAlertsOpen
}) {
  const t = text => tr(language, text);
  const [filters, setFilters] = useState(createDashboardFilters);
  const filterOptions = useMemo(() => buildDashboardFilterOptions(data, alerts, language), [data, alerts, language]);
  const filteredScope = useMemo(() => applyDashboardFilters(data, alerts, filters), [data, alerts, filters]);
  const filteredData = filteredScope.data;
  const filteredAlerts = filteredScope.alerts;
  const workOrders = filteredData["work-orders"];
  const fallbackReliability = useMemo(() => buildAssetReliability(workOrders, filteredData.equipment, language), [workOrders, filteredData.equipment, language]);
  const reliability = backendReliability || fallbackReliability;
  const metrics = useMemo(() => buildMaintenanceDashboardMetrics(filteredData, filteredAlerts, reliability, language), [filteredData, filteredAlerts, reliability, language]);
  return <>
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

      <DashboardAlertControls alerts={filteredAlerts} equipment={filteredData.equipment} workOrders={filteredData["work-orders"]} reliability={reliability} open={dashboardAlertsOpen} setOpen={setDashboardAlertsOpen} language={language} />

      <DashboardMiddleRow metrics={metrics} />
      <DashboardWorkOrderCountCharts workOrders={workOrders} language={language} />
      <DashboardBottomRow metrics={metrics} language={language} />
    </>;
}

export function DashboardFilterBar({
  filters,
  setFilters,
  options,
  language
}) {
  const t = text => tr(language, text);
  const fields = [{
    key: "dateFrom",
    label: "From Date",
    type: "date"
  }, {
    key: "dateTo",
    label: "To Date",
    type: "date"
  }, {
    key: "location",
    label: "Site",
    options: options.locations
  }, {
    key: "category",
    label: "Asset Category",
    options: options.categories
  }, {
    key: "equipment",
    label: "Equipment",
    options: options.equipment
  }];
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {fields.map(field => <label key={field.key} className="block">
            <span className="mb-2 block text-xs font-black text-slate-800">{t(field.label)}</span>
            {field.type === "date" ? <input type="date" value={filters[field.key]} onChange={event => setFilters(current => ({
          ...current,
          [field.key]: event.target.value
        }))} className="w-full rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" /> : <select value={filters[field.key]} onChange={event => setFilters(current => ({
          ...current,
          [field.key]: event.target.value
        }))} className="w-full rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                <option value="all">{t("All")}</option>
                {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>}
          </label>)}
      </div>
    </div>;
}

export function DashboardAlertControls({
  alerts,
  equipment,
  workOrders,
  reliability,
  open,
  setOpen,
  language
}) {
  const t = text => tr(language, text);
  const [reliabilityOpen, setReliabilityOpen] = useState(false);
  const criticalAlerts = alerts.filter(alert => alert.alert_level === "DUE NOW").length;
  const reliabilityData = reliability || buildAssetReliability(workOrders, equipment, language);
  return <div className="space-y-4">
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
              <button type="button" onClick={() => setOpen(!open)} className={`grid h-11 w-11 place-items-center rounded-lg border transition ${open ? "border-blue-300 bg-blue-700 text-white shadow-sm" : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"}`} title={open ? t("Hide Alerts") : t("Show Alerts")} aria-label={open ? t("Hide Alerts") : t("Show Alerts")}>
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
              <button type="button" onClick={() => setReliabilityOpen(current => !current)} className={`grid h-11 w-11 place-items-center rounded-lg border transition ${reliabilityOpen ? "border-slate-800 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"}`} title="Show Asset Reliability" aria-label="Show Asset Reliability">
                <Activity className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {open ? <AlertsAlarmsSection alerts={alerts} equipment={equipment} workOrders={workOrders} language={language} /> : null}
      {reliabilityOpen ? <AssetReliabilityPanel reliability={reliabilityData} language={language} /> : null}
    </div>;
}

export function MaintenancePerformanceSummary({
  metrics
}) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <PmStat label="Average Downtime" value={metrics.averageDowntimeLabel} tone={metrics.averageDowntimeHours > 4 ? "orange" : "green"} />
      <PmStat label="Overdue PM Tasks" value={metrics.overduePmTasks.length} tone={metrics.overduePmTasks.length ? "red" : "green"} />
      <PmStat label="Maintenance Cost" value={metrics.cost.totalLabel} tone={metrics.cost.currentMonth > metrics.cost.previousMonth ? "orange" : "blue"} />
      <PmStat label="Breakdown Count" value={metrics.breakdownCount} tone={metrics.breakdownCount ? "red" : "green"} />
      <PmStat label="Asset Health Index" value={`${metrics.assetHealthAverage}%`} tone={metrics.assetHealthAverage < 60 ? "red" : metrics.assetHealthAverage < 75 ? "orange" : "green"} />
    </div>;
}

export function DashboardMiddleRow({
  metrics
}) {
  return <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Breakdown Trend Chart" subtitle="Monthly breakdown incidents during the selected period.">
        <LineChart data={metrics.breakdownTrend} color="#dc2626" />
      </Panel>
      <Panel title="Work Order Status Pie Chart" subtitle="Open and closed work orders grouped by current status.">
        <DonutChart data={metrics.workOrderStatusPie} centerLabel="Orders" />
      </Panel>
    </div>;
}

export function DashboardWorkOrderCountCharts({
  workOrders,
  language
}) {
  const technicianData = useMemo(() => technicianWorkloadData(workOrders, language, 100), [workOrders, language]);
  const engineerData = useMemo(() => engineerWorkloadData(workOrders, language, 100), [workOrders, language]);
  return <div className="grid gap-6 xl:grid-cols-2">
      <WorkOrderParticipationPanel title="Technician Work Order Participation" subtitle="Technician name linked to the number of work orders he participated in." filterTitle="Technicians" data={technicianData} color="cyan" />
      <WorkOrderParticipationPanel title="Engineer Work Order Participation" subtitle="Engineer name linked to the number of work orders assigned or issued." filterTitle="Engineers" data={engineerData} color="blue" />
    </div>;
}
