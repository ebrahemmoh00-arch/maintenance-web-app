import { LineChart } from "../../../shared/components/Charts.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { ProgressBar } from "../../../shared/components/StatusPrimitives.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { formatShortDate } from "../../work-orders/utils/workOrderForms.js";
import { hasChartValue } from "../utils/executiveDashboardMetrics.js";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Eye,
  EyeOff,
  FilePlus2,
  Gauge,
  PackageCheck,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  TimerReset,
  TrendingDown,
  TrendingUp,
  Wrench
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const toneStyles = {
  blue: {
    card: "border-blue-100 bg-white",
    icon: "border-blue-100 bg-blue-50 text-blue-700",
    text: "text-blue-700",
    chip: "bg-blue-50 text-blue-700"
  },
  green: {
    card: "border-emerald-100 bg-white",
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700"
  },
  orange: {
    card: "border-orange-100 bg-white",
    icon: "border-orange-100 bg-orange-50 text-orange-700",
    text: "text-orange-700",
    chip: "bg-orange-50 text-orange-700"
  },
  red: {
    card: "border-red-100 bg-white",
    icon: "border-red-100 bg-red-50 text-red-700",
    text: "text-red-700",
    chip: "bg-red-50 text-red-700"
  },
  slate: {
    card: "border-slate-200 bg-white",
    icon: "border-slate-200 bg-slate-50 text-slate-700",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-700"
  }
};

export function ExecutiveKpiSection({
  data,
  metrics,
  insights,
  onNavigate,
  language
}) {
  const t = text => tr(language, text);
  const availabilityTone = metrics.availabilityPercent > 95 ? "green" : metrics.availabilityPercent >= 90 ? "orange" : "red";
  const healthTone = metrics.assetHealthAverage >= 75 ? "green" : metrics.assetHealthAverage >= 60 ? "orange" : "red";
  const cards = [{
    label: "Total Assets",
    value: data.equipment.length,
    subtitle: "Assets under maintenance control",
    trend: `${metrics.criticalEquipment.length} need attention`,
    icon: Cpu,
    tone: "blue",
    route: "equipment"
  }, {
    label: "Active Work Orders",
    value: insights.activeWorkOrders.length,
    subtitle: "Open execution workload",
    trend: `${data["work-orders"].length} total orders`,
    icon: Wrench,
    tone: insights.activeWorkOrders.length ? "blue" : "green",
    route: "work-orders"
  }, {
    label: "Overdue PM Tasks",
    value: metrics.overduePmTasks.length,
    subtitle: "Preventive tasks past due",
    trend: metrics.overduePmTasks.length ? "Immediate planner action" : "No overdue PM",
    icon: CalendarClock,
    tone: metrics.overduePmTasks.length ? "red" : "green",
    route: "pm-plans"
  }, {
    label: "Critical Alarms",
    value: insights.criticalAlerts.length,
    subtitle: "Critical alerts in scope",
    trend: `${Math.max((insights.notifications || []).length - insights.criticalAlerts.length, 0)} non-critical`,
    icon: ShieldAlert,
    tone: insights.criticalAlerts.length ? "red" : "green",
    route: "reports"
  }, {
    label: "Asset Health Index",
    value: `${metrics.assetHealthAverage}%`,
    subtitle: "Overall calculated asset health",
    trend: healthTone === "green" ? "Stable asset base" : "Reliability review needed",
    icon: CheckCircle2,
    tone: healthTone,
    route: "equipment"
  }, {
    label: "Availability %",
    value: `${metrics.availabilityPercent}%`,
    subtitle: "Planned time vs downtime",
    trend: availabilityTone === "green" ? "Above target" : "Below target",
    icon: Gauge,
    tone: availabilityTone,
    route: "reports"
  }];

  return (
    <section aria-label={t("Executive KPI Cards")} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map(card => <ExecutiveKpiCard key={card.label} {...card} language={language} onClick={() => onNavigate?.(card.route)} />)}
    </section>
  );
}

function ExecutiveKpiCard({
  label,
  value,
  subtitle,
  trend,
  icon: Icon,
  tone,
  onClick,
  language
}) {
  const t = text => tr(language, text);
  const style = toneStyles[tone] || toneStyles.blue;
  const TrendIcon = tone === "red" || tone === "orange" ? TrendingDown : TrendingUp;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-h-[190px] rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 ${style.card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-[9rem] text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t(label)}</p>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-5 text-5xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">{t(subtitle)}</p>
      <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${style.chip}`}>
        <TrendIcon className="h-3.5 w-3.5" />
        <span>{t(trend)}</span>
      </div>
    </button>
  );
}

export function QuickActionsPanel({
  openCreate,
  onNavigate,
  language
}) {
  const t = text => tr(language, text);
  const actions = [{
    label: "Add Asset",
    icon: PlusCircle,
    onClick: () => openCreate?.("equipment")
  }, {
    label: "Create Work Order",
    icon: FilePlus2,
    onClick: () => openCreate?.("work-orders")
  }, {
    label: "Create PM Plan",
    icon: CalendarClock,
    onClick: () => openCreate?.("pm-plans")
  }, {
    label: "Report Failure",
    icon: AlertTriangle,
    onClick: () => openCreate?.("work-orders")
  }, {
    label: "Issue Spare Part",
    icon: PackageCheck,
    onClick: () => openCreate?.("inventory")
  }, {
    label: "Add Meter Reading",
    icon: Gauge,
    onClick: () => onNavigate?.("equipment")
  }];

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm" aria-label={t("Quick Actions")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{t("Quick Actions")}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{t("Start the most common maintenance actions quickly.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <Icon className="h-4 w-4" />
                <span>{t(action.label)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MaintenanceOverviewSection({
  metrics,
  insights,
  openCreate,
  language
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <Panel title={tr(language, "Asset Health Trend")} subtitle={tr(language, "Health score movement based on reliability and asset health data.")} className="min-h-[360px]">
        {insights.empty.hasAssetHealthTrend ? <LineChart data={insights.assetHealthTrend} color="#2563eb" /> : <DashboardEmptyState title="No maintenance data available yet." actionLabel="Create First Work Order" onAction={() => openCreate?.("work-orders")} language={language} />}
      </Panel>
      <Panel title={tr(language, "Breakdown Trend")} subtitle={tr(language, "Monthly breakdown incidents during the selected period.")} className="min-h-[360px]">
        {insights.empty.hasBreakdowns ? <LineChart data={metrics.breakdownTrend} color="#dc2626" /> : <DashboardEmptyState title="No breakdown trend data available yet." actionLabel="Report Failure" onAction={() => openCreate?.("work-orders")} language={language} />}
      </Panel>
    </section>
  );
}

export function OperationsKpiSection({
  insights,
  language
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label={tr(language, "Operations KPIs")}>
      {insights.operationKpis.map(item => <OperationKpiCard key={item.key} item={item} language={language} />)}
    </section>
  );
}

function OperationKpiCard({
  item,
  language
}) {
  const style = toneStyles[item.tone] || toneStyles.blue;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{tr(language, item.label)}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{item.value}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${style.chip}`}>{tr(language, item.comparison)}</span>
      </div>
      <SparkTrend data={item.trend} tone={item.tone} />
    </article>
  );
}

function SparkTrend({
  data = [],
  tone = "blue"
}) {
  const values = data.map(row => Number(row.value || 0));
  const max = Math.max(...values, 1);
  const color = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    red: "bg-red-600",
    slate: "bg-slate-500"
  }[tone] || "bg-blue-600";
  return (
    <div className="mt-5 flex h-14 items-end gap-1.5" aria-hidden="true">
      {(data.length ? data : Array.from({ length: 8 }, (_, index) => ({ label: index, value: 0 }))).slice(-8).map((row, index) => (
        <span
          key={`${row.label}-${index}`}
          className={`w-full rounded-t ${Number(row.value || 0) ? color : "bg-slate-100"}`}
          style={{ height: `${Math.max(Number(row.value || 0) / max * 100, Number(row.value || 0) ? 12 : 8)}%` }}
        />
      ))}
    </div>
  );
}

function CriticalItemRow({
  item,
  language
}) {
  const tone = item.priority === "critical" ? "red" : item.priority === "high" ? "orange" : "blue";
  const style = toneStyles[tone] || toneStyles.blue;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.14em] ${style.text}`}>{tr(language, item.type)}</p>
          <h3 className="mt-2 truncate text-base font-black text-slate-950" title={item.title}>{item.title}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${style.chip}`}>{tr(language, item.priority)}</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <p className="font-semibold text-slate-600">
          <span className="font-black text-slate-900">{tr(language, "Reason")}:</span> {tr(language, item.detail)}
        </p>
        {item.requiredAction ? <p className="font-semibold text-slate-600">
            <span className="font-black text-slate-900">{tr(language, "Required Action")}:</span> {tr(language, item.requiredAction)}
          </p> : null}
        <p className="text-xs font-bold text-slate-500">{tr(language, "Asset")}: {item.asset}</p>
      </div>
    </article>
  );
}

function ImmediateAttentionSection({
  items,
  onViewAll,
  language
}) {
  return (
    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/40 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">{tr(language, "Immediate Attention")}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{tr(language, "Critical maintenance items with clear reason and required action.")}</p>
        </div>
        <button type="button" onClick={onViewAll} className="text-sm font-black text-blue-700 hover:text-blue-900">
          {tr(language, "View All")}
        </button>
      </div>
      {items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.slice(0, 4).map(item => <CriticalItemRow key={item.id} item={item} language={language} />)}
        </div>
      ) : <DashboardEmptyState title="No critical maintenance attention required." actionLabel="Review Work Orders" onAction={onViewAll} compact language={language} />}
    </div>
  );
}

export function TopListsSection({
  insights,
  onNavigate,
  language
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-4" aria-label={tr(language, "Top Lists")}>
      {insights.topLists.map(list => <TopListCard key={list.key} list={list} onNavigate={onNavigate} language={language} />)}
    </section>
  );
}

function TopListCard({
  list,
  onNavigate,
  language
}) {
  return (
    <Panel title={tr(language, list.title)} actions={<button type="button" onClick={() => onNavigate?.(list.route)} className="text-xs font-black uppercase tracking-[0.12em] text-blue-700 hover:text-blue-900">{tr(language, "View All")}</button>} className="min-h-[330px]">
      {list.rows.length ? (
        <div className="space-y-3">
          {list.rows.slice(0, 5).map((row, index) => <TopListRow key={`${list.key}-${row.label}`} row={row} index={index} />)}
        </div>
      ) : <DashboardEmptyState title="No data available yet." compact language={language} />}
    </Panel>
  );
}

function TopListRow({
  row,
  index
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-sm font-black text-slate-600 shadow-sm">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-900" title={row.label}>{row.label}</p>
        {row.helper ? <p className="mt-0.5 text-xs font-semibold text-slate-500">{row.helper}</p> : null}
      </div>
      <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-black text-blue-700">{row.value}</span>
    </div>
  );
}

export function NotificationCenter({
  insights,
  openCreate,
  onNavigate,
  language,
  dashboardAlertsOpen,
  setDashboardAlertsOpen
}) {
  const cardRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const notifications = insights.notifications || [];
  const immediateItems = insights.criticalItems || [];
  const criticalCount = notifications.filter(item => item.priority === "critical").length;
  const warningCount = notifications.filter(item => item.priority === "warning").length;
  const infoCount = notifications.length - criticalCount - warningCount;
  const ToggleIcon = visible ? EyeOff : Eye;
  const toggleLabel = visible ? "Hide Notifications" : "Show Notifications";

  useEffect(() => {
    if (!dashboardAlertsOpen) return;
    setVisible(true);
    const frameId = window.requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      setDashboardAlertsOpen?.(false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [dashboardAlertsOpen, setDashboardAlertsOpen]);

  return (
    <div ref={cardRef} id="dashboard-alerts-notifications">
      <Panel
        title={tr(language, "Alerts & Notifications")}
        subtitle={tr(language, "Professional notification center for critical, warning, success, and information messages.")}
        actions={
          <button
            type="button"
            onClick={() => setVisible(current => !current)}
            aria-expanded={visible}
            className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${visible ? "border-blue-200 bg-blue-700 text-white hover:bg-blue-800" : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
            title={tr(language, toggleLabel)}
          >
            <ToggleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{tr(language, visible ? "Hide" : "Show")}</span>
          </button>
        }
      >
      <div className="grid gap-3 md:grid-cols-4">
        <NotificationSummaryCard label="Total Alerts" value={notifications.length} icon={Bell} tone={notifications.length ? "blue" : "green"} language={language} />
        <NotificationSummaryCard label="Critical" value={criticalCount} icon={AlertTriangle} tone={criticalCount ? "red" : "green"} language={language} />
        <NotificationSummaryCard label="Warning" value={warningCount} icon={Bell} tone={warningCount ? "orange" : "green"} language={language} />
        <NotificationSummaryCard label="Information" value={infoCount} icon={Activity} tone={infoCount ? "slate" : "green"} language={language} />
      </div>

      <ImmediateAttentionSection items={immediateItems} onViewAll={() => onNavigate?.("work-orders")} language={language} />

      {visible ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{tr(language, "Notification Details")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{tr(language, "Latest maintenance alerts ordered for fast review.")}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">{notifications.length} {tr(language, "Alerts")}</span>
          </div>
          {notifications.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {notifications.map(item => <NotificationRow key={item.id} item={item} language={language} />)}
            </div>
          ) : <DashboardEmptyState title="No notifications available." actionLabel="Create First Work Order" onAction={() => openCreate?.("work-orders")} language={language} />}
        </div>
      ) : (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-dashed border-blue-100 bg-blue-50/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">{tr(language, "Notifications are hidden")}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{tr(language, "Use the show icon to review the detailed notification list.")}</p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm transition hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-100"
            title={tr(language, "Show Notifications")}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      )}
      </Panel>
    </div>
  );
}

function NotificationSummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  language
}) {
  const style = toneStyles[tone] || toneStyles.blue;
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${style.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{tr(language, label)}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function NotificationRow({
  item,
  language
}) {
  const tone = item.priority === "critical" ? "red" : item.priority === "warning" ? "orange" : item.priority === "success" ? "green" : "blue";
  const style = toneStyles[tone] || toneStyles.blue;
  const Icon = item.priority === "critical" ? AlertTriangle : item.priority === "success" ? CheckCircle2 : item.priority === "warning" ? Bell : Activity;
  return (
    <article className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${style.icon}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${style.chip}`}>{tr(language, item.priority)}</span>
          {item.type ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{tr(language, item.type)}</span> : null}
          <span className="text-xs font-bold text-slate-500">{formatShortDate(item.timestamp) || "--"}</span>
        </div>
        <p className="mt-2 truncate text-sm font-black text-slate-950" title={item.asset}>{item.asset}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
          <span className="font-black text-slate-800">{tr(language, "Reason")}:</span> {tr(language, item.description)}
        </p>
        {item.requiredAction ? <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
            <span className="font-black text-slate-800">{tr(language, "Required Action")}:</span> {tr(language, item.requiredAction)}
          </p> : null}
      </div>
    </article>
  );
}

export function SiteStatusOverviewStrip({
  metrics,
  language
}) {
  const sites = metrics.siteSummary || [];
  if (!sites.length) return null;
  return (
    <section className="grid gap-4 xl:grid-cols-4" aria-label={tr(language, "Site Status Overview")}>
      {sites.slice(0, 4).map(site => {
        const tone = site.operational >= 95 ? "green" : site.operational >= 85 ? "orange" : "red";
        return (
          <article key={site.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-950" title={site.name}>{site.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{site.assets} {tr(language, "assets")} / {site.breakdown} {tr(language, "faults")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${toneStyles[tone].chip}`}>{site.operational}%</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar value={site.operational} tone={tone} />
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function DashboardEmptyState({
  title,
  actionLabel,
  onAction,
  compact = false,
  language
}) {
  return (
    <div className={`grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center ${compact ? "min-h-[180px] p-4" : "min-h-[260px] p-8"}`}>
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="mt-4 text-base font-black text-slate-900">{tr(language, title)}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100">
            {tr(language, actionLabel)}
          </button>
        ) : null}
      </div>
    </div>
  );
}
