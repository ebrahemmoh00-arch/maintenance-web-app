import { BarChart, DonutChart, LineChart } from "../../../shared/components/Charts.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { MaintenanceBadge } from "../../../shared/components/StatusBadges.jsx";
import { getAlertKey, tr } from "../../../shared/config/appConfig.jsx";
import { plannedBreakdownData, trendData } from "../utils/maintenanceMetrics.jsx";
import { downtimeDistribution, engineerWorkloadData, equipmentMaintenanceTimeData, technicianWorkloadData } from "../utils/reliabilityMetrics.js";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

export function AnalyticsSection({
  data,
  alerts,
  language
}) {
  const t = text => tr(language, text);
  return <div className="grid gap-6 xl:grid-cols-3">
      <Panel title={t("Maintenance Trends")} subtitle={t("Work order volume over scheduled dates.")}>
        <LineChart data={trendData(data["work-orders"])} />
      </Panel>
      <Panel title={t("Breakdown vs Planned")} subtitle={t("Ratio based on priority and asset condition.")}>
        <BarChart data={plannedBreakdownData(data, alerts, language)} />
      </Panel>
      <Panel title={t("Downtime Distribution")} subtitle={t("Asset load grouped by maintenance exposure.")}>
        <DonutChart data={downtimeDistribution(data.equipment, language)} centerLabel={t("Assets")} />
      </Panel>
    </div>;
}

export function WorkloadAnalyticsCharts({
  workOrders,
  language
}) {
  const t = text => tr(language, text);
  const engineerData = useMemo(() => engineerWorkloadData(workOrders, language), [workOrders, language]);
  const technicianData = useMemo(() => technicianWorkloadData(workOrders, language), [workOrders, language]);
  const equipmentTimeData = useMemo(() => equipmentMaintenanceTimeData(workOrders, language), [workOrders, language]);
  return <div className="grid gap-6 xl:grid-cols-3">
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
    </div>;
}

export function MaintenanceAlerts({
  alerts,
  language
}) {
  const t = text => tr(language, text);
  return <Panel title={t("Smart Maintenance Alerts")} subtitle={t("Automatic notifications based on service hours and next maintenance date.")}>
      <AlertList alerts={alerts} language={language} />
    </Panel>;
}

export function AlertList({
  alerts,
  language
}) {
  const t = text => tr(language, text);
  return <div className="grid gap-3 lg:grid-cols-2">
      {alerts.map(alert => <div key={getAlertKey(alert)} className={`rounded-xl border px-4 py-3 ${alert.alert_level === "DUE NOW" ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}`}>
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
        </div>)}
      {!alerts.length ? <EmptyState title={t("No maintenance alerts")} message={t("All monitored equipment is within maintenance limits.")} /> : null}
    </div>;
}

export function NotificationMenu({
  alerts,
  language,
  anchor,
  onViewAlerts
}) {
  const t = text => tr(language, text);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const menuWidth = Math.min(viewportWidth * 0.92, 440);
  const padding = 16;
  const anchorCenter = anchor ? (anchor.left + anchor.right) / 2 : viewportWidth - padding - 20;
  const anchoredLeft = anchorCenter - menuWidth / 2;
  const left = Math.max(padding, Math.min(anchoredLeft, viewportWidth - menuWidth - padding));
  const top = (anchor?.bottom ?? 72) + 10;
  return <div className="fixed z-[90] max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/25" style={{
    top,
    left,
    width: menuWidth
  }}>
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
          {alerts.length ? <MaintenanceBadge value={alerts.some(alert => alert.alert_level === "DUE NOW") ? "DUE NOW" : "UPCOMING"} language={language} /> : null}
        </div>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
        {alerts.map(alert => <div key={getAlertKey(alert)} className="rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50">
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
          </div>)}

        {!alerts.length ? <div className="px-4 py-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-black text-slate-950">{t("No notifications")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("All equipment is currently within the configured limits.")}</p>
          </div> : null}
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        <button type="button" onClick={onViewAlerts} className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
          {t("View dashboard alerts")}
        </button>
      </div>
    </div>;
}
