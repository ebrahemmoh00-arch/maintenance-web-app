import { BarChart, LineChart } from "../../../shared/components/Charts.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { IndustrialStatusBadge, PmStat, ProgressBar } from "../../../shared/components/StatusPrimitives.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { formatCurrency } from "../utils/maintenanceMetrics.jsx";
import { healthTone } from "../utils/reliabilityMetrics.js";
import { TimerReset, Wrench } from "lucide-react";

export function DashboardBottomRow({
  metrics,
  language
}) {
  return <div className="grid gap-6 xl:grid-cols-2">
      <OverduePmTasksPanel rows={metrics.overduePmTasks} language={language} />
      <TopDowntimeAssetsPanel rows={metrics.topDowntimeAssets} />
      <AssetHealthRankingPanel rows={metrics.assetHealthRanking} average={metrics.assetHealthAverage} />
    </div>;
}

export function CostRanking({
  title,
  rows
}) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="space-y-2">
        {rows.slice(0, 3).map(row => <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-bold text-slate-700">{row.label}</span>
            <span className="shrink-0 font-black text-slate-950">{formatCurrency(row.value)}</span>
          </div>)}
        {!rows.length ? <p className="text-sm font-semibold text-slate-400">No cost records</p> : null}
      </div>
    </div>;
}

export function CriticalEquipmentStatusPanel({
  rows,
  siteSummary
}) {
  return <Panel title="Critical Equipment Status" subtitle="Critical assets grouped by running, maintenance, breakdown, and out-of-service states.">
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {siteSummary.slice(0, 4).map(site => <div key={site.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="truncate text-sm font-black text-slate-950">{site.name}</p>
            <p className="text-xs font-semibold text-slate-500">{site.running}/{site.assets} running / {site.breakdown} breakdown</p>
          </div>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.slice(0, 8).map(asset => <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{asset.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{asset.customer_name || asset.location || "Unassigned site"}</p>
              </div>
              <IndustrialStatusBadge status={asset.statusLabel} />
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar value={asset.health} tone={healthTone(asset.health)} />
              <span className="w-12 text-right text-sm font-black text-slate-800">{asset.health}%</span>
            </div>
          </div>)}
        {!rows.length ? <EmptyState title="No critical equipment" message="Mark assets as High or Critical to monitor operational status." /> : null}
      </div>
    </Panel>;
}

export function OverduePmTasksPanel({
  rows,
  language
}) {
  const t = text => tr(language, text);
  return <Panel title="Overdue Preventive Maintenance Tasks" subtitle="Tasks that passed due date or exceeded scheduled service hours.">
      {rows.length ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          Critical Alert: {rows.length} preventive maintenance tasks are overdue.
        </div> : null}
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">PM Number</th>
              <th className="px-3 py-3 text-left">Asset</th>
              <th className="px-3 py-3 text-left">Required Maintenance</th>
              <th className="px-3 py-3 text-left">Site</th>
              <th className="px-3 py-3 text-left">Due Date</th>
              <th className="px-3 py-3 text-left">Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map(task => <tr key={task.id} className="bg-red-50">
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">PM-{String(task.id).padStart(4, "0")}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-700">{task.equipment_name || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{task.task_name || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-700">{task.site || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-700">{task.dueLabel}</td>
                <td className="border-t border-slate-200 px-3 py-3 font-black text-red-700">{task.daysOverdue}</td>
              </tr>)}
            {!rows.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">{t("No data")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>;
}

export function TopDowntimeAssetsPanel({
  rows
}) {
  return <Panel title="Top 10 Assets by Downtime" subtitle="Equipment with the highest downtime exposure in the selected period.">
      <BarChart data={rows.slice(0, 10).map(asset => ({
      label: asset.name,
      value: Math.round(asset.downtimeHours),
      color: "bg-red-600"
    }))} layout="horizontal" />
    </Panel>;
}

export function AssetHealthRankingPanel({
  rows,
  average
}) {
  return <Panel title="Asset Health Ranking" subtitle="Calculated health score based on breakdown frequency, MTTR, MTBF, availability, and PM exposure.">
      <div className="mb-5 flex flex-wrap items-center gap-5">
        <GaugeChart value={average} />
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Health Categories</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">90-100 Excellent / 75-89 Good / 60-74 Fair / Below 60 Poor</p>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Asset</th>
              <th className="px-3 py-3 text-left">Site</th>
              <th className="px-3 py-3 text-left">Health</th>
              <th className="px-3 py-3 text-left">Category</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map(asset => <tr key={asset.id} className="bg-white hover:bg-slate-50">
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{asset.name}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{asset.site || "-"}</td>
                <td className="border-t border-slate-200 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <ProgressBar value={asset.health} tone={healthTone(asset.health)} />
                    <span className="w-12 text-right font-black">{asset.health}%</span>
                  </div>
                </td>
                <td className="border-t border-slate-200 px-3 py-3 font-bold text-slate-700">{asset.category}</td>
              </tr>)}
            {!rows.length ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No asset health records.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>;
}

export function GaugeChart({
  value
}) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  const dash = `${safe} ${100 - safe}`;
  const stroke = safe < 60 ? "#dc2626" : safe < 75 ? "#f97316" : safe < 90 ? "#2563eb" : "#10b981";
  return <svg viewBox="0 0 42 42" className="h-32 w-32 shrink-0">
      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={stroke} strokeWidth="5" strokeDasharray={dash} strokeDashoffset="25" strokeLinecap="round" />
      <text x="21" y="20" textAnchor="middle" className="fill-slate-900 text-[0.42rem] font-black">{Math.round(safe)}%</text>
      <text x="21" y="25" textAnchor="middle" className="fill-slate-500 text-[0.18rem] uppercase">Health</text>
    </svg>;
}

export function AssetReliabilityPanel({
  reliability,
  language
}) {
  const t = text => tr(language, text);
  return <Panel title="Asset Reliability" subtitle="Bad actors, downtime tracking, MTTR, and MTBF indicators for production reliability.">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <PmStat label="Bad Actors" value={reliability.badActors.length} tone={reliability.badActors.length ? "orange" : "green"} />
        <PmStat label="Downtime Hours" value={reliability.downtimeLabel} tone={reliability.totalDowntimeHours > 0 ? "red" : "green"} />
        <PmStat label="MTTR" value={reliability.mttrLabel} tone={reliability.mttrHours > 4 ? "orange" : "green"} />
        <PmStat label="MTBF" value={reliability.mtbfLabel} tone={reliability.mtbfHours < 100 && reliability.mtbfHours > 0 ? "orange" : "blue"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">Bad Actors</h3>
              <p className="text-xs font-semibold text-slate-500">Top 5 assets causing production downtime.</p>
            </div>
            <Wrench className="h-5 w-5 text-orange-500" />
          </div>
          <div className="space-y-2">
            {reliability.badActors.map((asset, index) => <div key={asset.id || asset.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">{index + 1}. {asset.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{asset.faults} faults / {asset.downtimeLabel} downtime</p>
                  </div>
                  <span className="rounded bg-red-50 px-2 py-1 text-xs font-black text-red-700">{asset.impactScore}</span>
                </div>
              </div>)}
            {!reliability.badActors.length ? <EmptyState title={t("No data")} message="No breakdown-related work orders found." /> : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">Downtime Tracking</h3>
              <p className="text-xs font-semibold text-slate-500">Production line downtime hours by date.</p>
            </div>
            <TimerReset className="h-5 w-5 text-blue-600" />
          </div>
          <LineChart data={reliability.downtimeSeries} color="#dc2626" />
        </div>
      </div>
    </Panel>;
}
