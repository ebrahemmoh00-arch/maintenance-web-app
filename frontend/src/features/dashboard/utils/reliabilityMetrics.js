import { tr } from "../../../shared/config/appConfig.jsx";
import { uniqueSorted } from "../../resources/utils/employeeUtils.js";
import { formatScheduleCell } from "../../schedule/components/MaintenanceFollowUp.jsx";
import { calculateDuration, formatShortDate, getWorkOrderSavedDate, parseWorkOrderNotes, todayIso } from "../../work-orders/utils/workOrderForms.js";
import { clampPercent, createMonthBuckets, monthLabel, toMonthKey } from "./dashboardDateUtils.js";
import { matchesAnyFilterValue, matchesFilterValue } from "./dashboardFilters.js";

export function buildAssetReliabilityRows(workOrders, equipment, pmTasks) {
  const assetStats = buildAssetFaultStats(workOrders, equipment);
  return equipment.map(asset => {
    const stats = assetStats.get(Number(asset.id)) || {
      faults: 0,
      downtimeHours: 0,
      mttrHours: 0,
      mtbfHours: 0
    };
    const overduePmCount = pmTasks.filter(task => Number(task.equipment_id) === Number(asset.id) && isPmOverdue(task)).length;
    const availability = assetAvailabilityPercent(asset, stats.downtimeHours);
    const health = calculateAssetHealthScore(asset, stats, overduePmCount, availability);
    return {
      ...asset,
      site: asset.customer_name || asset.location || "-",
      statusLabel: equipmentIndustrialStatus(asset),
      health,
      availability,
      faults: stats.faults,
      downtimeHours: stats.downtimeHours,
      downtimeLabel: formatReliabilityHours(stats.downtimeHours),
      mttrHours: stats.mttrHours,
      mtbfHours: stats.mtbfHours
    };
  });
}

export function buildAssetFaultStats(workOrders, equipment) {
  const stats = new Map();
  const equipmentById = new Map(equipment.map(asset => [Number(asset.id), asset]));
  for (const order of workOrders.filter(isReliabilityFaultOrder)) {
    const asset = equipmentById.get(Number(order.equipment_id));
    const key = Number(order.equipment_id);
    if (!key && !asset) continue;
    const duration = workOrderDurationMinutes(order) / 60;
    const current = stats.get(key) || {
      faults: 0,
      downtimeHours: 0,
      orders: []
    };
    current.faults += 1;
    current.downtimeHours += duration;
    current.orders.push(order);
    stats.set(key, current);
  }
  for (const [key, value] of stats.entries()) {
    value.mttrHours = value.faults ? value.downtimeHours / value.faults : 0;
    value.mtbfHours = calculateMtbfHours(value.orders, equipment);
    stats.set(key, value);
  }
  return stats;
}

export function assetAvailabilityPercent(asset, downtimeHours) {
  const planned = Math.max(Number(asset.current_hours || asset.maintenance_interval_hours || 720), 1);
  return clampPercent((planned - Number(downtimeHours || 0)) / planned * 100);
}

export function calculateAssetHealthScore(asset, stats, overduePmCount, availability) {
  const base = equipmentHealthPercent(asset);
  const mttrPenalty = Math.min(Number(stats.mttrHours || 0) * 2, 15);
  const mtbfBoost = Number(stats.mtbfHours || 0) >= 500 ? 5 : 0;
  const score = base - Number(stats.faults || 0) * 5 - Number(stats.downtimeHours || 0) * 1.5 - overduePmCount * 8 - (100 - availability) * 0.35 - mttrPenalty + mtbfBoost;
  return clampPercent(score);
}

export function assetHealthCategory(value) {
  if (value >= 90) return "Excellent";
  if (value >= 75) return "Good";
  if (value >= 60) return "Fair";
  return "Poor";
}

export function buildSiteSummary(customers, equipment, alerts) {
  const siteNames = uniqueSorted([...customers.map(customer => customer.name), ...equipment.map(asset => asset.customer_name || asset.location), ...alerts.map(alert => alert.location)]);
  return siteNames.map(name => {
    const siteAssets = equipment.filter(asset => matchesAnyFilterValue([asset.customer_name, asset.location], name));
    const breakdown = siteAssets.filter(asset => ["Breakdown", "Offline"].includes(equipmentIndustrialStatus(asset))).length;
    return {
      name,
      assets: siteAssets.length,
      running: siteAssets.filter(asset => equipmentIndustrialStatus(asset) === "Running").length,
      breakdown,
      operational: siteOperationalPercent(siteAssets, alerts.filter(alert => matchesFilterValue(alert.location, name) && alert.alert_level === "DUE NOW").length + breakdown)
    };
  }).filter(site => site.assets || alerts.some(alert => matchesFilterValue(alert.location, site.name)));
}

export function buildTopDowntimeAssets(workOrders, equipment) {
  const stats = buildAssetFaultStats(workOrders, equipment);
  const rows = equipment.map(asset => {
    const item = stats.get(Number(asset.id)) || {
      faults: 0,
      downtimeHours: 0
    };
    return {
      id: asset.id,
      name: asset.name || `Asset ${asset.id}`,
      site: asset.customer_name || asset.location || "-",
      faults: item.faults || 0,
      downtimeHours: item.downtimeHours || 0,
      downtimeLabel: formatReliabilityHours(item.downtimeHours || 0)
    };
  });
  return rows.sort((first, second) => second.downtimeHours - first.downtimeHours || second.faults - first.faults || first.name.localeCompare(second.name));
}

export function buildBreakdownTrend(workOrders, equipment) {
  const buckets = createMonthBuckets();
  for (const order of workOrders.filter(isBreakdownTrendOrder)) {
    const key = toMonthKey(getWorkOrderOperationalDate(order));
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }
  const currentKey = toMonthKey(new Date());
  const activeBreakdowns = equipment.filter(asset => equipmentIndustrialStatus(asset) === "Breakdown").length;
  if (activeBreakdowns && buckets.has(currentKey)) buckets.set(currentKey, buckets.get(currentKey) + activeBreakdowns);
  return [...buckets.entries()].map(([key, value]) => ({
    label: monthLabel(key),
    value
  }));
}

export function getWorkOrderOperationalDate(order) {
  const meta = parseWorkOrderNotes(order.notes);
  return meta.start_date || order.scheduled_date || order.due_date || "";
}

export function isBreakdownTrendOrder(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const status = String(order.status || "").toLowerCase();
  const maintenanceType = String(meta.maintenance_type || order.type || "").toLowerCase();
  const text = `${order.title || ""} ${order.description || ""}`.toLowerCase();
  return ["breakdown", "fault", "down"].some(keyword => maintenanceType.includes(keyword) || status.includes(keyword) || text.includes(keyword));
}

export function buildWorkOrderStatusPie(workOrders, language = "en") {
  const buckets = new Map([["New", 0], ["Assigned", 0], ["In Progress", 0], ["Waiting for Parts", 0], ["Waiting for Approval", 0], ["Completed", 0]]);
  for (const order of workOrders) {
    const bucket = workOrderStatusBucket(order);
    if (!buckets.has(bucket)) continue;
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }
  const colors = {
    New: "#64748b",
    Assigned: "#2563eb",
    "In Progress": "#0ea5e9",
    "Waiting for Parts": "#f97316",
    "Waiting for Approval": "#8b5cf6",
    Completed: "#16a34a"
  };
  return [...buckets.entries()].map(([label, value]) => ({
    label: tr(language, label),
    value,
    color: colors[label]
  }));
}

export function workOrderStatusBucket(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const status = String(order.status || "").toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
  const text = `${status} ${order.title || ""} ${order.description || ""} ${meta.spare_parts || ""}`.toLowerCase();
  if (["closed", "completed", "approved"].includes(status)) return "Completed";
  if (["waiting_for_parts"].includes(status)) return "Waiting for Parts";
  if (["pending_supervisor_review"].includes(status)) return "Waiting for Approval";
  if (["in_progress", "on_hold", "overdue"].includes(status)) return "In Progress";
  if (["assigned", "accepted"].includes(status)) return "Assigned";
  if (["new", "pending", "draft"].includes(status)) return "New";
  if (text.includes("approval")) return "Waiting for Approval";
  if (text.includes("part") || text.includes("spare")) return "Waiting for Parts";
  if (text.includes("progress")) return "In Progress";
  if (order.engineer_id || meta.shift_engineer_name || meta.executor_name || meta.assigned_to) return "Assigned";
  return "New";
}

export function engineerWorkloadData(workOrders, language = "en", limit = 6) {
  const counts = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const name = cleanChartLabel(meta.assigned_to || meta.shift_engineer_name || order.engineer_name || "") || tr(language, "Unassigned");
    addChartValue(counts, name, 1);
  }
  return chartRowsFromMap(counts, "bg-blue-600", language, limit);
}

export function technicianWorkloadData(workOrders, language = "en", limit = 6) {
  const counts = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const names = extractTechnicianNames(meta, order);
    const uniqueNames = [...new Set(names)];
    for (const name of uniqueNames) addChartValue(counts, name, 1);
  }
  return chartRowsFromMap(counts, "bg-cyan-600", language, limit);
}

export function equipmentMaintenanceTimeData(workOrders, language = "en") {
  const totals = new Map();
  for (const order of workOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const name = cleanChartLabel(order.equipment_name || meta.equipment_name || meta.asset_name || order.title || "") || tr(language, "Unassigned");
    addChartValue(totals, name, workOrderDurationMinutes(order));
  }
  return chartRowsFromMap(totals, "bg-orange-500", language);
}

export function extractTechnicianNames(meta, order = {}) {
  const teamMembers = [
    meta.appointed_members,
    ...(Array.isArray(meta.appointed_members_list) ? meta.appointed_members_list : [])
  ].flatMap(splitChartNames).filter(Boolean);
  const legacyMembers = teamMembers.length ? [] : [meta.executor_name, meta.holder_name].flatMap(splitChartNames).filter(Boolean);
  const engineerNames = new Set([meta.assigned_to, meta.shift_engineer_name, order.engineer_name].flatMap(splitChartNames).map(normalizeChartName).filter(Boolean));
  return [...teamMembers, ...legacyMembers].filter(name => !engineerNames.has(normalizeChartName(name)));
}

function normalizeChartName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function splitChartNames(value) {
  return String(value || "").split(/\/+|,|\r?\n/).map(cleanChartLabel).filter(Boolean);
}

export function cleanChartLabel(value) {
  const normalized = String(value || "").replace(/\s*\/+\s*/g, " / ").replace(/\s+/g, " ").trim();
  return normalized.split(" / ").map(part => part.trim()).filter(Boolean)[0] || "";
}

export function addChartValue(counter, label, value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  counter.set(label, (counter.get(label) || 0) + safeValue);
}

export function chartRowsFromMap(counter, color, language = "en", limit = 6) {
  const rows = [...counter.entries()].sort(([firstLabel, firstValue], [secondLabel, secondValue]) => secondValue - firstValue || firstLabel.localeCompare(secondLabel)).slice(0, limit).map(([label, value]) => ({
    label,
    value: Math.round(value),
    color
  }));
  return rows.length ? rows : [{
    label: tr(language, "No data"),
    value: 0,
    color
  }];
}

export function workOrderDurationMinutes(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const savedDuration = durationTextToMinutes(meta.duration);
  if (savedDuration > 0) return savedDuration;
  const calculatedDuration = durationTextToMinutes(calculateDuration(meta.start_time, meta.finished_time));
  return calculatedDuration;
}

export function buildAssetReliability(workOrders, equipment, language = "en") {
  const equipmentById = new Map(equipment.map(asset => [Number(asset.id), asset]));
  const faultOrders = workOrders.filter(isReliabilityFaultOrder);
  const byAsset = new Map();
  const downtimeByDate = new Map();
  let totalDowntimeMinutes = 0;
  for (const order of faultOrders) {
    const meta = parseWorkOrderNotes(order.notes);
    const asset = equipmentById.get(Number(order.equipment_id));
    const assetKey = Number(order.equipment_id) || `order-${order.id || order.title}`;
    const assetName = cleanChartLabel(order.equipment_name || asset?.name || meta.equipment_name || meta.asset_name || order.title || "") || tr(language, "Unassigned");
    const downtimeMinutes = workOrderDurationMinutes(order);
    const downtimeHours = downtimeMinutes / 60;
    totalDowntimeMinutes += downtimeMinutes;
    const current = byAsset.get(assetKey) || {
      id: assetKey,
      name: assetName,
      faults: 0,
      downtimeHours: 0,
      impactScore: 0
    };
    current.faults += 1;
    current.downtimeHours += downtimeHours;
    current.impactScore = Math.round(current.faults * 10 + current.downtimeHours * 2);
    byAsset.set(assetKey, current);
    const dateKey = getWorkOrderSavedDate(order) || todayIso();
    downtimeByDate.set(dateKey, (downtimeByDate.get(dateKey) || 0) + downtimeHours);
  }
  for (const asset of equipment.filter(item => equipmentIndustrialStatus(item) === "Breakdown")) {
    const key = Number(asset.id);
    if (byAsset.has(key)) continue;
    byAsset.set(key, {
      id: key,
      name: asset.name || `Asset ${asset.id}`,
      faults: 1,
      downtimeHours: 0,
      impactScore: 10
    });
  }
  const badActors = [...byAsset.values()].sort((first, second) => second.downtimeHours - first.downtimeHours || second.faults - first.faults || first.name.localeCompare(second.name)).slice(0, 5).map(asset => ({
    ...asset,
    downtimeLabel: formatReliabilityHours(asset.downtimeHours)
  }));
  const downtimeSeries = [...downtimeByDate.entries()].sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate)).slice(-8).map(([date, hours]) => ({
    label: formatShortDate(date) || date,
    value: Number(hours.toFixed(1))
  }));
  const mttrHours = faultOrders.length ? totalDowntimeMinutes / faultOrders.length / 60 : 0;
  const mtbfHours = calculateMtbfHours(faultOrders, equipment);
  const totalDowntimeHours = totalDowntimeMinutes / 60;
  const incidentCount = [...byAsset.values()].reduce((sum, asset) => sum + asset.faults, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - incidentCount * 3 - totalDowntimeHours * 1.2)));
  return {
    badActors,
    downtimeSeries: downtimeSeries.length ? downtimeSeries : [{
      label: tr(language, "No data"),
      value: 0
    }],
    totalDowntimeHours,
    downtimeLabel: formatReliabilityHours(totalDowntimeHours),
    mttrHours,
    mttrLabel: faultOrders.length ? formatReliabilityHours(mttrHours) : "0h",
    mtbfHours,
    mtbfLabel: mtbfHours ? formatReliabilityHours(mtbfHours) : "N/A",
    score
  };
}

export function isReliabilityFaultOrder(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const priority = String(order.priority || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  const maintenanceType = String(meta.maintenance_type || order.type || "").toLowerCase();
  const text = `${order.title || ""} ${order.description || ""}`.toLowerCase();
  return ["critical", "high"].includes(priority) || ["breakdown", "fault", "down"].some(keyword => maintenanceType.includes(keyword) || status.includes(keyword) || text.includes(keyword));
}

export function calculateMtbfHours(faultOrders, equipment) {
  const intervals = [];
  const grouped = new Map();
  for (const order of faultOrders) {
    const key = Number(order.equipment_id) || order.equipment_name || "unassigned";
    grouped.set(key, [...(grouped.get(key) || []), order]);
  }
  for (const orders of grouped.values()) {
    const sorted = orders.slice().sort((first, second) => {
      const firstHours = Number(first.service_hours || 0);
      const secondHours = Number(second.service_hours || 0);
      if (firstHours && secondHours && firstHours !== secondHours) return firstHours - secondHours;
      return workOrderDateMs(first) - workOrderDateMs(second);
    });
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousHours = Number(previous.service_hours || 0);
      const currentHours = Number(current.service_hours || 0);
      if (currentHours > previousHours) {
        intervals.push(currentHours - previousHours);
        continue;
      }
      const diffHours = (workOrderDateMs(current) - workOrderDateMs(previous)) / 36e5;
      if (diffHours > 0) intervals.push(diffHours);
    }
  }
  if (intervals.length) return intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  if (!faultOrders.length) return 0;
  const totalRunningHours = equipment.reduce((sum, asset) => sum + Number(asset.current_hours || 0), 0);
  return totalRunningHours > 0 ? totalRunningHours / faultOrders.length : 0;
}

export function workOrderDateMs(order) {
  const value = getWorkOrderSavedDate(order) || order.created_at || order.due_date || "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function formatReliabilityHours(value) {
  const hours = Number(value || 0);
  if (!Number.isFinite(hours) || hours <= 0) return "0h";
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours).toLocaleString()}h`;
}

export function durationTextToMinutes(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Math.max(0, value);
  const text = String(value).trim().toLowerCase();
  const timeMatch = text.match(/^(\d+):(\d{1,2})$/);
  if (timeMatch) return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  const hourMatch = text.match(/([\d.]+)\s*(h|hr|hrs|hour|hours)\b/);
  const minuteMatch = text.match(/([\d.]+)\s*(m|min|mins|minute|minutes)\b/);
  if (hourMatch || minuteMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) * 60 : 0;
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
    return Math.max(0, Math.round(hours + minutes));
  }
  const numeric = Number(text);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

export function downtimeDistribution(equipment, language = "en") {
  const normal = equipment.filter(item => loadPercent(item) < 80).length;
  const warning = equipment.filter(item => loadPercent(item) >= 80 && loadPercent(item) < 100).length;
  const critical = equipment.filter(item => loadPercent(item) >= 100 || item.status === "down").length;
  return [{
    label: tr(language, "Normal"),
    value: normal,
    color: "#10b981"
  }, {
    label: tr(language, "Warning"),
    value: warning,
    color: "#f97316"
  }, {
    label: tr(language, "Critical"),
    value: critical,
    color: "#dc2626"
  }];
}

export function loadPercent(item) {
  return Math.round(Number(item.current_hours || 0) / Math.max(Number(item.maintenance_interval_hours || 1), 1) * 100);
}

export function equipmentHealthPercent(asset) {
  const status = equipmentIndustrialStatus(asset);
  if (status === "Breakdown") return 12;
  if (status === "Offline") return 25;
  if (status === "Under Maintenance") return 58;
  const exposure = Math.min(loadPercent(asset), 120);
  const alertPenalty = asset.maintenance_alert === "DUE NOW" ? 24 : asset.maintenance_alert === "UPCOMING" ? 12 : 0;
  const criticality = String(asset.criticality || "").toLowerCase();
  const criticalityPenalty = criticality === "critical" ? 10 : criticality === "high" ? 6 : 0;
  const idlePenalty = status === "Idle" ? 8 : 0;
  return Math.max(5, Math.min(100, Math.round(100 - exposure * 0.42 - alertPenalty - criticalityPenalty - idlePenalty)));
}

export function equipmentIndustrialStatus(asset) {
  const raw = String(asset.status || "").toLowerCase();
  if (["down", "breakdown", "failed"].includes(raw)) return "Breakdown";
  if (["offline", "inactive", "off"].includes(raw)) return "Offline";
  if (["maintenance", "under maintenance", "paused"].includes(raw)) return "Under Maintenance";
  if (Number(asset.current_hours || 0) <= 0 || raw === "idle") return "Idle";
  return "Running";
}

export function healthTone(value) {
  if (value < 45) return "red";
  if (value < 70) return "orange";
  return "green";
}

export function assetLastMaintenance(asset, pmTasks) {
  const related = pmTasks.filter(task => Number(task.equipment_id) === Number(asset.id));
  const dates = related.flatMap(task => [task.last_service_date, ...(Array.isArray(task.previous_records) ? task.previous_records.map(record => record.service_date) : [])]).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : asset.last_maintenance_date || "Not configured";
}

export function assetNextMaintenance(asset, pmTasks) {
  const related = pmTasks.filter(task => Number(task.equipment_id) === Number(asset.id)).sort((first, second) => Number(first.hours_until_due ?? 999999) - Number(second.hours_until_due ?? 999999));
  const nextTask = related[0];
  if (nextTask) {
    const hourText = Number.isFinite(Number(nextTask.hours_until_due)) ? `${formatScheduleCell(nextTask.hours_until_due)} hrs` : "Hours-based";
    return `${nextTask.task_name}: ${nextTask.next_due_date || hourText}`;
  }
  return asset.next_maintenance_date || "Not configured";
}

export function siteOperationalPercent(assets, activeFaults) {
  if (!assets.length) return 0;
  const available = assets.filter(asset => !["Breakdown", "Offline"].includes(equipmentIndustrialStatus(asset))).length;
  return Math.max(0, Math.min(100, Math.round((available - activeFaults * 0.35) / assets.length * 100)));
}

export function findAssetForAlert(alert, equipment) {
  return equipment.find(asset => Number(asset.id) === Number(alert.equipment_id)) || equipment.find(asset => asset.name === alert.equipment_name) || equipment.find(asset => String(asset.name || "").toLowerCase() === String(alert.equipment_name || "").toLowerCase());
}

export function isPmOverdue(task) {
  return task.pm_alert === "DUE NOW" || Number(task.hours_until_due) <= 0;
}

export function alarmDowntime(alarm) {
  const hoursUntil = Number(alarm.hours_until_maintenance ?? alarm.hours_until_due);
  if (Number.isFinite(hoursUntil) && hoursUntil < 0) return `${formatScheduleCell(Math.abs(hoursUntil))} hrs`;
  if (alarm.priority === "critical") return "Live";
  return "0 hrs";
}
