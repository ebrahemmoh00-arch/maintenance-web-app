import { getWorkOrderSavedDate, parseWorkOrderNotes } from "../../work-orders/utils/workOrderForms.js";
import { cleanChartLabel, isReliabilityFaultOrder, technicianWorkloadData, workOrderStatusBucket } from "./reliabilityMetrics.js";

const CLOSED_STATUSES = new Set(["closed", "completed", "cancelled", "rejected"]);
const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4
};

export function buildExecutiveDashboardInsights(data, alerts, metrics, reliability, stats, language = "en") {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const pmTasks = data["preventive-maintenance"] || [];
  const activeWorkOrders = workOrders.filter(isActiveWorkOrder);
  const criticalAlerts = (alerts || []).filter(isCriticalAlert);
  const completionRate = calculateCompletionRate(workOrders);
  const pmCompliance = calculatePmCompliance(pmTasks, metrics.overduePmTasks.length);
  const assetHealthTrend = buildAssetHealthTrend(metrics, reliability);

  return {
    activeWorkOrders,
    criticalAlerts,
    completionRate,
    pmCompliance,
    assetHealthTrend,
    operationKpis: buildOperationKpis(metrics, reliability, stats, completionRate, pmCompliance),
    criticalItems: buildCriticalAttentionItems(workOrders, metrics, alerts).slice(0, 10),
    topLists: buildTopLists(workOrders, metrics, language),
    notifications: buildNotificationItems(workOrders, alerts).slice(0, 8),
    empty: {
      hasAssets: equipment.length > 0,
      hasWorkOrders: workOrders.length > 0,
      hasBreakdowns: hasChartValue(metrics.breakdownTrend),
      hasAssetHealthTrend: hasChartValue(assetHealthTrend)
    }
  };
}

export function isActiveWorkOrder(order) {
  return !CLOSED_STATUSES.has(normalize(order.status));
}

export function isCriticalAlert(alert) {
  return String(alert.alert_level || alert.priority || "").toLowerCase().includes("due now") || String(alert.priority || "").toLowerCase() === "critical";
}

export function hasChartValue(rows = []) {
  return rows.some(row => Number(row.value || 0) > 0);
}

export function calculateCompletionRate(workOrders) {
  if (!workOrders.length) return 0;
  const completed = workOrders.filter(order => ["closed", "completed", "approved"].includes(normalize(order.status))).length;
  return Math.round(completed / workOrders.length * 100);
}

export function calculatePmCompliance(pmTasks, overdueCount) {
  if (!pmTasks.length) return 0;
  return Math.max(0, Math.round((pmTasks.length - overdueCount) / pmTasks.length * 100));
}

export function buildAssetHealthTrend(metrics, reliability) {
  const downtimeSeries = reliability?.downtimeSeries || [];
  const downtimeHasValues = downtimeSeries.some(item => Number(item.value || 0) > 0);
  if (downtimeHasValues) {
    return downtimeSeries.map(item => ({
      label: item.label,
      value: Math.max(0, Math.round(100 - Number(item.value || 0) * 2))
    }));
  }

  return (metrics.assetHealthRanking || []).slice(0, 8).map(asset => ({
    label: asset.name || `Asset ${asset.id}`,
    value: Number(asset.health || 0)
  }));
}

export function buildOperationKpis(metrics, reliability, stats, completionRate, pmCompliance) {
  const breakdownTrend = metrics.breakdownTrend || [];
  const healthTrend = buildAssetHealthTrend(metrics, reliability);
  return [{
    key: "mttr",
    label: "MTTR",
    value: metrics.mttrLabel,
    comparison: Number(metrics.mttrHours || 0) <= 4 ? "Within response target" : "Above response target",
    tone: Number(metrics.mttrHours || 0) <= 4 ? "green" : "orange",
    trend: breakdownTrend
  }, {
    key: "mtbf",
    label: "MTBF",
    value: metrics.mtbfLabel,
    comparison: "Higher value means better reliability",
    tone: Number(metrics.mtbfHours || 0) > 0 ? "green" : "slate",
    trend: healthTrend
  }, {
    key: "pm",
    label: "PM Compliance",
    value: `${pmCompliance}%`,
    comparison: pmCompliance >= 95 ? "On target" : "Needs planning attention",
    tone: pmCompliance >= 95 ? "green" : pmCompliance >= 80 ? "orange" : "red",
    trend: healthTrend
  }, {
    key: "completion",
    label: "Work Order Completion Rate",
    value: `${completionRate}%`,
    comparison: `${stats.closed_today || 0} closed today`,
    tone: completionRate >= 80 ? "green" : completionRate >= 60 ? "orange" : "red",
    trend: breakdownTrend
  }];
}

export function buildCriticalAttentionItems(workOrders, metrics, alerts) {
  const items = [];

  for (const task of metrics.overduePmTasks || []) {
    items.push({
      id: `pm-${task.id}`,
      type: "Overdue PM",
      title: task.task_name || task.equipment_name || "Preventive maintenance task",
      asset: task.equipment_name || "-",
      detail: task.required_maintenance || task.maintenance_type || task.dueLabel || "Maintenance required",
      priority: "critical"
    });
  }

  for (const asset of metrics.criticalEquipment || []) {
    items.push({
      id: `asset-${asset.id}`,
      type: "Critical Asset",
      title: asset.name || `Asset ${asset.id}`,
      asset: asset.site || "-",
      detail: `${asset.statusLabel || "Critical"} / Health ${asset.health || 0}%`,
      priority: Number(asset.health || 0) < 60 ? "critical" : "high"
    });
  }

  for (const order of workOrders.filter(order => isActiveWorkOrder(order) && isReliabilityFaultOrder(order))) {
    items.push({
      id: `breakdown-${order.id}`,
      type: "Active Breakdown",
      title: order.title || order.equipment_name || `WO ${order.id}`,
      asset: order.equipment_name || order.customer_name || "-",
      detail: workOrderStatusBucket(order),
      priority: normalize(order.priority) || "high"
    });
  }

  for (const order of workOrders.filter(order => isActiveWorkOrder(order) && workOrderStatusBucket(order) === "Waiting for Approval")) {
    items.push({
      id: `approval-${order.id}`,
      type: "Waiting for Approval",
      title: order.title || `WO ${order.id}`,
      asset: order.equipment_name || "-",
      detail: order.customer_name || "Supervisor review required",
      priority: "medium"
    });
  }

  for (const order of workOrders.filter(order => isActiveWorkOrder(order) && workOrderStatusBucket(order) === "Waiting for Parts")) {
    items.push({
      id: `parts-${order.id}`,
      type: "Waiting for Spare Parts",
      title: order.title || `WO ${order.id}`,
      asset: order.equipment_name || "-",
      detail: order.customer_name || "Inventory action required",
      priority: "high"
    });
  }

  for (const alert of alerts || []) {
    if (!isCriticalAlert(alert)) continue;
    items.push({
      id: alert.alert_key || `alert-${alert.equipment_name}`,
      type: "Critical Alarm",
      title: alert.equipment_name || "Maintenance alert",
      asset: alert.location || "-",
      detail: alert.message || alert.alert_type || "Immediate attention required",
      priority: "critical"
    });
  }

  return dedupeById(items).sort(prioritySort);
}

export function buildTopLists(workOrders, metrics, language = "en") {
  return [{
    key: "downtime",
    title: "Top Assets by Downtime",
    route: "equipment",
    rows: (metrics.topDowntimeAssets || []).slice(0, 5).map(asset => ({
      label: asset.name,
      value: asset.downtimeLabel || `${Math.round(Number(asset.downtimeHours || 0))}h`,
      helper: `${asset.faults || 0} faults`
    }))
  }, {
    key: "failure-codes",
    title: "Top Failure Codes",
    route: "reports",
    rows: buildFailureCodeRows(workOrders)
  }, {
    key: "technicians",
    title: "Top Technicians",
    route: "engineers",
    rows: technicianWorkloadData(workOrders, language, 5).filter(row => row.value > 0).map(row => ({
      label: row.label,
      value: row.value,
      helper: "work orders"
    }))
  }, {
    key: "backlog",
    title: "Top Work Order Backlog",
    route: "work-orders",
    rows: buildBacklogRows(workOrders)
  }];
}

export function buildFailureCodeRows(workOrders) {
  const counter = new Map();
  for (const order of workOrders.filter(isReliabilityFaultOrder)) {
    const meta = parseWorkOrderNotes(order.notes);
    const label = cleanChartLabel(meta.failure_code || meta.failure_cause || meta.root_cause || meta.maintenance_type || order.failure_code || "") || "Unclassified Failure";
    counter.set(label, (counter.get(label) || 0) + 1);
  }
  return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([label, value]) => ({
    label,
    value,
    helper: "incidents"
  }));
}

export function buildBacklogRows(workOrders) {
  const counter = new Map();
  for (const order of workOrders.filter(isActiveWorkOrder)) {
    const label = cleanChartLabel(order.equipment_name || order.title || "") || workOrderStatusBucket(order);
    counter.set(label, (counter.get(label) || 0) + 1);
  }
  return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([label, value]) => ({
    label,
    value,
    helper: "open items"
  }));
}

export function buildNotificationItems(workOrders, alerts) {
  const notifications = [];

  for (const alert of alerts || []) {
    const critical = isCriticalAlert(alert);
    notifications.push({
      id: alert.alert_key || `alert-${alert.equipment_name}-${alert.alert_level}`,
      priority: critical ? "critical" : "warning",
      timestamp: alert.next_maintenance_date || alert.created_at || "",
      asset: alert.equipment_name || alert.location || "-",
      description: alert.message || alert.alert_type || "Maintenance notification"
    });
  }

  for (const order of workOrders.filter(order => isActiveWorkOrder(order) && ["Waiting for Parts", "Waiting for Approval"].includes(workOrderStatusBucket(order)))) {
    const bucket = workOrderStatusBucket(order);
    notifications.push({
      id: `wo-${bucket}-${order.id}`,
      priority: bucket === "Waiting for Parts" ? "warning" : "info",
      timestamp: getWorkOrderSavedDate(order) || order.created_at || order.due_date || "",
      asset: order.equipment_name || order.customer_name || "-",
      description: `${order.title || `WO ${order.id}`} is ${bucket.toLowerCase()}`
    });
  }

  for (const order of workOrders.filter(order => ["closed", "completed"].includes(normalize(order.status))).slice(0, 3)) {
    notifications.push({
      id: `success-${order.id}`,
      priority: "success",
      timestamp: getWorkOrderSavedDate(order) || order.created_at || "",
      asset: order.equipment_name || "-",
      description: `${order.title || `WO ${order.id}`} completed successfully`
    });
  }

  return dedupeById(notifications).sort((first, second) => {
    const priorityDiff = PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return dateMs(second.timestamp) - dateMs(first.timestamp);
  });
}

function prioritySort(first, second) {
  const priorityDiff = (PRIORITY_ORDER[normalize(first.priority)] ?? 4) - (PRIORITY_ORDER[normalize(second.priority)] ?? 4);
  if (priorityDiff !== 0) return priorityDiff;
  return first.title.localeCompare(second.title);
}

function dedupeById(rows) {
  const seen = new Set();
  return rows.filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function dateMs(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}
