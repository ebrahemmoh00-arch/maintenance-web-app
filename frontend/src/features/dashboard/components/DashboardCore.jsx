import { DonutChart } from "../../../shared/components/Charts.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { applyDashboardFilters, buildDashboardFilterOptions, createDashboardFilters } from "../utils/dashboardFilters.js";
import { buildExecutiveDashboardInsights, hasChartValue } from "../utils/executiveDashboardMetrics.js";
import { buildMaintenanceDashboardMetrics } from "../utils/maintenanceMetrics.jsx";
import { buildAssetReliability, engineerWorkloadData, technicianWorkloadData } from "../utils/reliabilityMetrics.js";
import { CriticalAttentionPanel, DashboardEmptyState, ExecutiveKpiSection, MaintenanceOverviewSection, NotificationCenter, OperationsKpiSection, SiteStatusOverviewStrip, TopListsSection } from "./ExecutiveDashboardSections.jsx";
import { WorkOrderParticipationPanel } from "./WorkOrderParticipation.jsx";
import { useMemo, useState } from "react";

export function Dashboard({
  stats,
  data,
  alerts,
  backendReliability,
  openCreate,
  language,
  setActive,
  dashboardAlertsOpen,
  setDashboardAlertsOpen
}) {
  const [filters, setFilters] = useState(createDashboardFilters);
  const filterOptions = useMemo(() => buildDashboardFilterOptions(data, alerts, language), [data, alerts, language]);
  const filteredScope = useMemo(() => applyDashboardFilters(data, alerts, filters), [data, alerts, filters]);
  const filteredData = filteredScope.data;
  const filteredAlerts = filteredScope.alerts;
  const workOrders = filteredData["work-orders"];
  const fallbackReliability = useMemo(() => buildAssetReliability(workOrders, filteredData.equipment, language), [workOrders, filteredData.equipment, language]);
  const reliability = backendReliability || fallbackReliability;
  const metrics = useMemo(() => buildMaintenanceDashboardMetrics(filteredData, filteredAlerts, reliability, language), [filteredData, filteredAlerts, reliability, language]);
  const insights = useMemo(() => buildExecutiveDashboardInsights(filteredData, filteredAlerts, metrics, reliability, stats, language), [filteredData, filteredAlerts, metrics, reliability, stats, language]);
  return <>
      <DashboardFilterBar filters={filters} setFilters={setFilters} options={filterOptions} language={language} />

      <ExecutiveKpiSection data={filteredData} metrics={metrics} insights={insights} onNavigate={setActive} language={language} />
      <SiteStatusOverviewStrip metrics={metrics} language={language} />
      <MaintenanceOverviewSection metrics={metrics} insights={insights} openCreate={openCreate} language={language} />
      <OperationsKpiSection insights={insights} language={language} />
      <CriticalAttentionPanel insights={insights} onNavigate={setActive} language={language} />
      <DashboardWorkOrderStatusPanel metrics={metrics} onNavigate={setActive} language={language} />
      <TopListsSection insights={insights} onNavigate={setActive} language={language} />
      <NotificationCenter
        insights={insights}
        openCreate={openCreate}
        language={language}
        dashboardAlertsOpen={dashboardAlertsOpen}
        setDashboardAlertsOpen={setDashboardAlertsOpen}
      />
      <DashboardWorkOrderCountCharts workOrders={workOrders} language={language} />
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

export function DashboardWorkOrderStatusPanel({
  metrics,
  onNavigate,
  language
}) {
  return <Panel title={tr(language, "Work Order Status")} subtitle={tr(language, "Work orders grouped by current workflow status.")} actions={<button type="button" onClick={() => onNavigate?.("work-orders")} className="text-sm font-black text-blue-700 hover:text-blue-900">{tr(language, "View All")}</button>}>
      {hasChartValue(metrics.workOrderStatusPie) ? <DonutChart data={metrics.workOrderStatusPie} centerLabel="Orders" /> : <DashboardEmptyState title="No work order status data available yet." actionLabel="Create First Work Order" onAction={() => onNavigate?.("work-orders")} language={language} />}
    </Panel>;
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
