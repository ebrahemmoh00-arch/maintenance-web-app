import { BarChart } from "../../../shared/components/Charts.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { MaintenanceBadge, PriorityBadge, StockBadge } from "../../../shared/components/StatusBadges.jsx";
import { CriticalityBadge, IndustrialStatusBadge, PmStat, ProgressBar, SiteMiniStat } from "../../../shared/components/StatusPrimitives.jsx";
import { getAlertKey } from "../../../shared/config/appConfig.jsx";
import { formatScheduleCell } from "../../schedule/components/MaintenanceFollowUp.jsx";
import { alarmDowntime, assetLastMaintenance, assetNextMaintenance, equipmentHealthPercent, equipmentIndustrialStatus, findAssetForAlert, healthTone, isPmOverdue, siteOperationalPercent } from "../utils/reliabilityMetrics.js";

export function EquipmentHealthMonitoring({
  equipment,
  pmTasks,
  language
}) {
  const rows = equipment.slice().sort((first, second) => equipmentHealthPercent(first) - equipmentHealthPercent(second)).slice(0, 12);
  return <Panel title="Equipment Health Monitoring" subtitle="Live asset condition, running exposure, criticality, and maintenance readiness.">
      <div className="overflow-auto">
        <table className="min-w-[1080px] w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="border border-slate-200 px-3 py-3 text-left">Asset Name</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Asset ID</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Current Status</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Health Percentage</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Running Hours</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Last Maintenance</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Next Maintenance</th>
              <th className="border border-slate-200 px-3 py-3 text-left">Criticality Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(asset => {
            const health = equipmentHealthPercent(asset);
            return <tr key={asset.id} className="bg-white hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-3 font-black text-slate-950">{asset.name}</td>
                  <td className="border border-slate-200 px-3 py-3 font-semibold text-slate-600">{asset.asset_code || `AST-${asset.id}`}</td>
                  <td className="border border-slate-200 px-3 py-3"><IndustrialStatusBadge status={equipmentIndustrialStatus(asset)} /></td>
                  <td className="border border-slate-200 px-3 py-3">
                    <div className="flex min-w-44 items-center gap-3">
                      <ProgressBar value={health} tone={healthTone(health)} />
                      <span className={`w-12 text-right font-black ${health < 45 ? "text-red-600" : health < 70 ? "text-orange-600" : "text-emerald-700"}`}>{health}%</span>
                    </div>
                  </td>
                  <td className="border border-slate-200 px-3 py-3 font-semibold text-slate-700">{formatScheduleCell(asset.current_hours)}</td>
                  <td className="border border-slate-200 px-3 py-3 text-slate-600">{assetLastMaintenance(asset, pmTasks)}</td>
                  <td className="border border-slate-200 px-3 py-3 text-slate-600">{assetNextMaintenance(asset, pmTasks)}</td>
                  <td className="border border-slate-200 px-3 py-3"><CriticalityBadge value={asset.criticality} /></td>
                </tr>;
          })}
            {!rows.length ? <tr><td colSpan={8} className="border border-slate-200 px-3 py-8 text-center text-slate-500">No assets available for health monitoring.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>;
}

export function SiteStatusOverview({
  customers,
  equipment,
  engineers,
  alerts,
  language
}) {
  const activeTechnicians = engineers.filter(item => item.status === "active");
  const sites = customers.filter(customer => equipment.some(asset => Number(asset.customer_id) === Number(customer.id)));
  return <Panel title="Site Status Overview" subtitle="Company sites, asset concentration, active faults, online technicians, and operational percentage.">
      <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
        {sites.map(site => {
        const siteAssets = equipment.filter(asset => Number(asset.customer_id) === Number(site.id));
        const siteAlerts = alerts.filter(alert => {
          const asset = findAssetForAlert(alert, equipment);
          return asset ? Number(asset.customer_id) === Number(site.id) : String(alert.location || "").toLowerCase().includes(String(site.name || "").toLowerCase());
        });
        const downAssets = siteAssets.filter(asset => ["down", "breakdown", "offline"].includes(String(asset.status || "").toLowerCase())).length;
        const activeFaults = siteAlerts.filter(alert => alert.alert_level === "DUE NOW").length + downAssets;
        const operational = siteOperationalPercent(siteAssets, activeFaults);
        const tone = operational < 60 ? "red" : operational < 85 ? "orange" : "green";
        return <div key={site.id} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Site</p>
                  <h3 className="mt-2 text-lg font-black text-slate-950">{site.name}</h3>
                </div>
                <span className={`h-3 w-3 rounded-full ${tone === "red" ? "bg-red-600" : tone === "orange" ? "bg-orange-500" : "bg-emerald-500"} shadow-sm`} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <SiteMiniStat label="Assets" value={siteAssets.length} />
                <SiteMiniStat label="Faults" value={activeFaults} danger={activeFaults > 0} />
                <SiteMiniStat label="Techs" value={activeTechnicians.length} />
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <span>Operational</span>
                  <span className={tone === "red" ? "text-red-600" : tone === "orange" ? "text-orange-600" : "text-emerald-700"}>{operational}%</span>
                </div>
                <ProgressBar value={operational} tone={tone} />
              </div>
              <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Mini hierarchy</p>
                <div className="space-y-1">
                  {siteAssets.slice(0, 4).map(asset => <div key={asset.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      <span className="truncate">{asset.asset_level || "Equipment"} / {asset.name}</span>
                    </div>)}
                  {!siteAssets.length ? <p className="text-xs text-slate-500">No linked assets.</p> : null}
                </div>
              </div>
            </div>;
      })}
        {!sites.length ? <EmptyState title="No sites" message="Add customers / sites and link assets to display site status." /> : null}
      </div>
    </Panel>;
}

export function PreventiveMaintenanceDashboard({
  pmTasks,
  workOrders,
  language
}) {
  const overdue = pmTasks.filter(task => isPmOverdue(task));
  const upcoming = pmTasks.filter(task => !isPmOverdue(task) && (task.pm_alert === "UPCOMING" || Number(task.hours_until_due) <= 250));
  const completed = pmTasks.filter(task => task.status === "completed").length;
  const completionRate = pmTasks.length ? Math.round(completed / pmTasks.length * 100) : 0;
  const plannedCount = pmTasks.length + workOrders.filter(order => !["critical", "high"].includes(order.priority)).length;
  const unplannedCount = overdue.length + workOrders.filter(order => ["critical", "high"].includes(order.priority)).length;
  const calendarRows = [...pmTasks].sort((first, second) => Number(first.hours_until_due ?? 999999) - Number(second.hours_until_due ?? 999999)).slice(0, 7);
  return <Panel title="Preventive Maintenance Section" subtitle="Upcoming PM tasks, overdue work, completion rate, calendar planning, and planned vs unplanned load.">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <PmStat label="Upcoming PM Tasks" value={upcoming.length} tone="blue" />
            <PmStat label="Overdue PMs" value={overdue.length} tone={overdue.length ? "red" : "green"} />
            <PmStat label="PM Completion Rate" value={`${completionRate}%`} tone="green" />
          </div>
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">PM Task</th>
                  <th className="px-3 py-3 text-left">Asset</th>
                  <th className="px-3 py-3 text-left">Remaining Hours</th>
                  <th className="px-3 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...overdue, ...upcoming].slice(0, 8).map(task => <tr key={task.id} className={isPmOverdue(task) ? "bg-red-50" : "bg-white"}>
                    <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{task.task_name}</td>
                    <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{task.equipment_name}</td>
                    <td className={`border-t border-slate-200 px-3 py-3 font-black ${isPmOverdue(task) ? "text-red-600" : "text-orange-600"}`}>{formatScheduleCell(task.hours_until_due)}</td>
                    <td className="border-t border-slate-200 px-3 py-3"><MaintenanceBadge value={task.pm_alert} language={language} /></td>
                  </tr>)}
                {!pmTasks.length ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No PM tasks configured.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Calendar View</p>
            <div className="space-y-2">
              {calendarRows.map(task => <div key={task.id} className={`rounded-lg border px-3 py-2 ${isPmOverdue(task) ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-950">{task.task_name}</p>
                    <span className="text-xs font-bold text-slate-500">{task.next_due_date || "Hours-based"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{task.equipment_name} / {formatScheduleCell(task.hours_until_due)} hrs</p>
                </div>)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Planned vs Unplanned</p>
            <BarChart data={[{
            label: "Planned",
            value: plannedCount,
            color: "bg-blue-600"
          }, {
            label: "Unplanned",
            value: unplannedCount,
            color: "bg-red-600"
          }]} />
          </div>
        </div>
      </div>
    </Panel>;
}

export function AlertsAlarmsSection({
  alerts,
  equipment,
  workOrders,
  language
}) {
  const criticalAlarms = alerts.filter(alert => alert.alert_level === "DUE NOW");
  const alarmRows = alerts.length ? alerts : workOrders.filter(order => ["critical", "high"].includes(order.priority)).slice(0, 6);
  return <Panel title="Alerts & Alarms Section" subtitle="Real-time industrial alarm panel with critical indicators, downtime exposure, and affected equipment.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <PmStat label="Critical Alarms" value={criticalAlarms.length} tone={criticalAlarms.length ? "red" : "green"} />
        <PmStat label="Total Alarms" value={alerts.length} tone={alerts.length ? "orange" : "green"} />
        <PmStat label="Priority Work Orders" value={workOrders.filter(order => ["critical", "high"].includes(order.priority)).length} tone="blue" />
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Priority</th>
              <th className="px-3 py-3 text-left">Fault Type</th>
              <th className="px-3 py-3 text-left">Timestamp</th>
              <th className="px-3 py-3 text-left">Affected Equipment</th>
              <th className="px-3 py-3 text-left">Current Downtime</th>
            </tr>
          </thead>
          <tbody>
            {alarmRows.map((alarm, index) => {
            const isAlert = Boolean(alarm.alert_level);
            const asset = isAlert ? findAssetForAlert(alarm, equipment) : equipment.find(item => Number(item.id) === Number(alarm.equipment_id));
            const critical = isAlert ? alarm.alert_level === "DUE NOW" : alarm.priority === "critical";
            return <tr key={isAlert ? getAlertKey(alarm) : `work-order-${alarm.id || index}`} className={critical ? "bg-red-50" : "bg-white"}>
                  <td className="border-t border-slate-200 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${critical ? "animate-pulse bg-red-600" : "bg-orange-500"}`} />
                      {isAlert ? <MaintenanceBadge value={alarm.alert_level} language={language} /> : <PriorityBadge value={alarm.priority} language={language} />}
                    </div>
                  </td>
                  <td className="border-t border-slate-200 px-3 py-3 font-semibold text-slate-700">{isAlert ? alarm.reason : alarm.title}</td>
                  <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{alarm.created_at?.slice(0, 16) || alarm.next_maintenance_date || alarm.due_date || "Live"}</td>
                  <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-950">{asset?.name || alarm.equipment_name || "Unassigned"}</td>
                  <td className="border-t border-slate-200 px-3 py-3 font-black text-red-600">{alarmDowntime(alarm)}</td>
                </tr>;
          })}
            {!alarmRows.length ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No active alarms.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>;
}

export function InventoryMonitoringSection({
  inventory,
  language
}) {
  const lowStock = inventory.filter(item => item.stock_alert === "LOW STOCK" || item.stock_alert === "OUT OF STOCK" || Number(item.stock_quantity || 0) <= Number(item.minimum_quantity || 0));
  const criticalParts = lowStock.filter(item => item.stock_alert === "OUT OF STOCK" || Number(item.stock_quantity || 0) === 0);
  const mostUsed = inventory.slice().sort((first, second) => Number(Boolean(second.linked_work_order_id)) - Number(Boolean(first.linked_work_order_id)) || Number(first.stock_quantity || 0) - Number(second.stock_quantity || 0)).slice(0, 5);
  return <Panel title="Inventory & Spare Parts" subtitle="Stock health, critical spares, purchase pressure, and spare-part usage indicators.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <PmStat label="Low Stock Items" value={lowStock.length} tone={lowStock.length ? "orange" : "green"} />
        <PmStat label="Critical Spare Parts" value={criticalParts.length} tone={criticalParts.length ? "red" : "green"} />
        <PmStat label="Purchase Requests" value={lowStock.length} tone="blue" />
      </div>
      <div className="space-y-4">
        {mostUsed.map(part => {
        const stock = Number(part.stock_quantity || 0);
        const min = Math.max(Number(part.minimum_quantity || 1), 1);
        const percent = Math.min(Math.round(stock / (min * 2) * 100), 100);
        const tone = stock <= min ? stock === 0 ? "red" : "orange" : "green";
        return <div key={part.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{part.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{part.part_number || "No part no."} / {part.category || "General"}</p>
                </div>
                <StockBadge value={part.stock_alert} language={language} />
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar value={percent} tone={tone} />
                <span className="w-20 text-right text-sm font-black text-slate-700">{stock} {part.unit || "pcs"}</span>
              </div>
            </div>;
      })}
        {!inventory.length ? <EmptyState title="No inventory" message="Add spare parts to monitor stock and purchase requests." /> : null}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Inventory Chart</p>
        <BarChart data={[{
        label: "OK",
        value: Math.max(inventory.length - lowStock.length, 0),
        color: "bg-emerald-500"
      }, {
        label: "Low",
        value: lowStock.length - criticalParts.length,
        color: "bg-orange-500"
      }, {
        label: "Critical",
        value: criticalParts.length,
        color: "bg-red-600"
      }]} />
      </div>
    </Panel>;
}

export function TechnicianPerformanceSection({
  engineers,
  workOrders,
  language
}) {
  const activeTechnicians = engineers.filter(engineer => engineer.status === "active");
  const rankings = engineers.map(engineer => {
    const assigned = workOrders.filter(order => Number(order.engineer_id) === Number(engineer.id));
    const completed = assigned.filter(order => order.status === "completed").length;
    const efficiency = assigned.length ? Math.round(completed / assigned.length * 100) : engineer.status === "active" ? 82 : 0;
    return {
      ...engineer,
      assigned: assigned.length,
      completed,
      response: `${Math.max(12, 55 - completed * 4)} min`,
      repair: `${Math.max(1.1, 4.5 - completed * 0.2).toFixed(1)}h`,
      efficiency
    };
  }).sort((first, second) => second.efficiency - first.efficiency).slice(0, 6);
  return <Panel title="Technician Performance" subtitle="Active resources, completion throughput, response speed, repair duration, and efficiency ranking.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <PmStat label="Active Technicians" value={activeTechnicians.length} tone="green" />
        <PmStat label="Tasks Completed" value={workOrders.filter(order => order.status === "completed").length} tone="blue" />
        <PmStat label="Avg Response Time" value={`${Math.max(15, 48 - activeTechnicians.length * 3)} min`} tone="orange" />
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Rank</th>
              <th className="px-3 py-3 text-left">Technician</th>
              <th className="px-3 py-3 text-left">Tasks Completed</th>
              <th className="px-3 py-3 text-left">Response Time</th>
              <th className="px-3 py-3 text-left">Avg Repair Duration</th>
              <th className="px-3 py-3 text-left">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((engineer, index) => <tr key={engineer.id} className="bg-white hover:bg-slate-50">
                <td className="border-t border-slate-200 px-3 py-3 font-black text-slate-500">#{index + 1}</td>
                <td className="border-t border-slate-200 px-3 py-3">
                  <p className="font-black text-slate-950">{engineer.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{engineer.specialty || "Maintenance"}</p>
                </td>
                <td className="border-t border-slate-200 px-3 py-3 font-semibold text-slate-700">{engineer.completed}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{engineer.response}</td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-600">{engineer.repair}</td>
                <td className="border-t border-slate-200 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <ProgressBar value={engineer.efficiency} tone={engineer.efficiency < 60 ? "red" : engineer.efficiency < 80 ? "orange" : "green"} />
                    <span className="w-12 text-right font-black text-slate-800">{engineer.efficiency}%</span>
                  </div>
                </td>
              </tr>)}
            {!rankings.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No technicians available.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Performance Chart</p>
        <BarChart data={rankings.slice(0, 4).map(engineer => ({
        label: engineer.name.split(" ")[0] || "Tech",
        value: engineer.efficiency,
        color: "bg-blue-600"
      }))} />
      </div>
    </Panel>;
}
