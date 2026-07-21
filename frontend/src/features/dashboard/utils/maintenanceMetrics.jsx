import { tr } from "../../../shared/config/appConfig.jsx";
import { buildUnifiedPmRows } from "../../../shared/utils/pmPlanSchedule.js";
import { formatShortDate, getWorkOrderSavedDate, parseWorkOrderNotes } from "../../work-orders/utils/workOrderForms.js";
import { addChartValue, assetHealthCategory, buildAssetReliabilityRows, buildBreakdownTrend, buildSiteSummary, buildTopDowntimeAssets, buildWorkOrderStatusPie, equipmentIndustrialStatus, formatReliabilityHours, isPmOverdue, isReliabilityFaultOrder } from "./reliabilityMetrics.js";
import { clampPercent, createMonthBuckets, monthLabel, toMonthKey } from "./dashboardDateUtils.js";

export function SkeletonDashboard() {
  return <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
        {Array.from({
        length: 5
      }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-white shadow-sm" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-white shadow-sm" />
    </div>;
}

export function trendData(workOrders) {
  const buckets = {};
  for (const order of workOrders) {
    const label = order.scheduled_date ? order.scheduled_date.slice(5) : "N/A";
    buckets[label] = (buckets[label] || 0) + 1;
  }
  const data = Object.entries(buckets).slice(-6).map(([label, value]) => ({
    label,
    value
  }));
  return data.length ? data : [{
    label: "No data",
    value: 0
  }];
}

export function plannedBreakdownData(data, alerts, language = "en") {
  const breakdownOrders = data["work-orders"].filter(item => ["high", "critical"].includes(item.priority)).length + alerts.filter(item => item.alert_level === "DUE NOW").length;
  const plannedOrders = Math.max(data["work-orders"].length - breakdownOrders, 0);
  return [{
    label: tr(language, "Planned"),
    value: plannedOrders,
    color: "bg-blue-600"
  }, {
    label: tr(language, "Breakdown"),
    value: breakdownOrders,
    color: "bg-red-600"
  }];
}

export function buildMaintenanceDashboardMetrics(data, alerts, reliability, language = "en") {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const pmTasks = data["preventive-maintenance"] || [];
  const pmPlans = data["pm-plans"] || [];
  const unifiedPmTasks = buildUnifiedPmRows(pmTasks, pmPlans, equipment);
  const inventory = data.inventory || [];
  const customers = data.customers || [];
  const equipmentById = new Map(equipment.map(asset => [Number(asset.id), asset]));
  const faultOrders = workOrders.filter(isReliabilityFaultOrder);
  const totalDowntimeHours = Number(reliability?.totalDowntimeHours || 0);
  const plannedHours = calculatePlannedOperatingHours(equipment, workOrders);
  const availabilityPercent = plannedHours ? clampPercent((plannedHours - totalDowntimeHours) / plannedHours * 100) : 100;
  const failureCount = Number(reliability?.failureCount ?? faultOrders.length);
  const averageDowntimeHours = Number(reliability?.averageDowntimeHours ?? (failureCount ? totalDowntimeHours / failureCount : 0));
  const mttrHours = Number(reliability?.mttrHours || 0);
  const mtbfHours = Number(reliability?.mtbfHours || 0);
  const breakdownEquipment = equipment.filter(asset => equipmentIndustrialStatus(asset) === "Breakdown").length;
  const breakdownCount = Number(reliability?.failureCount ?? faultOrders.length + breakdownEquipment + alerts.filter(alert => alert.alert_level === "DUE NOW").length);
  const overduePmTasks = buildOverduePmRows(unifiedPmTasks, equipmentById);
  const cost = buildMaintenanceCostMetrics(workOrders, equipmentById, language);
  const assetReliabilityRows = buildAssetReliabilityRows(workOrders, equipment, unifiedPmTasks);
  const assetHealthRanking = assetReliabilityRows.map(row => ({
    ...row,
    category: assetHealthCategory(row.health)
  })).sort((first, second) => first.health - second.health || first.name.localeCompare(second.name));
  const assetHealthAverage = assetHealthRanking.length ? Math.round(assetHealthRanking.reduce((sum, asset) => sum + asset.health, 0) / assetHealthRanking.length) : 0;
  const criticalEquipment = assetReliabilityRows.filter(asset => ["critical", "high"].includes(String(asset.criticality || "").toLowerCase()) || ["Breakdown", "Under Maintenance", "Offline"].includes(asset.statusLabel)).sort((first, second) => first.health - second.health || first.name.localeCompare(second.name));
  return {
    availabilityPercent,
    averageDowntimeHours,
    averageDowntimeLabel: formatReliabilityHours(averageDowntimeHours),
    mttrHours,
    mttrLabel: reliability?.mttrLabel || "0h",
    mtbfHours,
    mtbfLabel: reliability?.mtbfLabel || "N/A",
    breakdownCount,
    pmTasks: unifiedPmTasks,
    overduePmTasks,
    cost,
    assetHealthAverage,
    criticalEquipment,
    siteSummary: buildSiteSummary(customers, equipment, alerts),
    topDowntimeAssets: (reliability?.topFailureAssets?.length ? reliability.topFailureAssets : buildTopDowntimeAssets(workOrders, equipment)).slice(0, 10),
    assetHealthRanking,
    breakdownTrend: reliability?.failureTrend?.length ? reliability.failureTrend : buildBreakdownTrend(workOrders, equipment),
    workOrderStatusPie: buildWorkOrderStatusPie(workOrders, language)
  };
}

export function availabilityTone(value) {
  if (Number(value) > 95) return "green";
  if (Number(value) >= 90) return "orange";
  return "red";
}

export function calculatePlannedOperatingHours(equipment, workOrders) {
  const currentHoursTotal = equipment.reduce((sum, asset) => sum + Number(asset.current_hours || 0), 0);
  if (currentHoursTotal > 0) return currentHoursTotal;
  const serviceHoursTotal = workOrders.reduce((sum, order) => sum + Number(order.service_hours || 0), 0);
  if (serviceHoursTotal > 0) return serviceHoursTotal;
  return Math.max(equipment.length, 1) * 720;
}

export function buildOverduePmRows(pmTasks, equipmentById) {
  return pmTasks.filter(isPmOverdue).map(task => {
    const asset = equipmentById.get(Number(task.equipment_id));
    const dueDate = task.next_due_date || task.last_service_date || "";
    return {
      ...task,
      equipment_name: task.equipment_name || asset?.name || "-",
      site: asset?.customer_name || asset?.location || "-",
      dueLabel: dueDate ? formatShortDate(dueDate) : "Hours exceeded",
      daysOverdue: calculateDaysOverdue(task)
    };
  }).sort((first, second) => Number(second.daysOverdue || 0) - Number(first.daysOverdue || 0));
}

export function calculateDaysOverdue(task) {
  const dateValue = task.next_due_date || task.last_service_date;
  const dueDate = dateValue ? new Date(dateValue) : null;
  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / 86400000));
  }
  const overdueHours = Math.abs(Math.min(Number(task.hours_until_due || 0), 0));
  return overdueHours ? Math.ceil(overdueHours / 24) : 0;
}

export function buildMaintenanceCostMetrics(workOrders, equipmentById, language = "en") {
  const categoryTotals = {
    Labor: 0,
    "Spare Parts": 0,
    Contractors: 0,
    Tools: 0,
    Miscellaneous: 0
  };
  const monthlyBuckets = createMonthBuckets();
  const siteTotals = new Map();
  const equipmentTotals = new Map();
  const now = new Date();
  const currentMonthKey = toMonthKey(now);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = toMonthKey(previousMonth);
  for (const order of workOrders) {
    const asset = equipmentById.get(Number(order.equipment_id));
    const orderCosts = extractWorkOrderCosts(order);
    const total = Object.values(orderCosts).reduce((sum, value) => sum + value, 0);
    for (const [key, value] of Object.entries(orderCosts)) categoryTotals[key] += value;
    const key = toMonthKey(getWorkOrderSavedDate(order) || order.scheduled_date || order.due_date || order.created_at);
    if (monthlyBuckets.has(key)) monthlyBuckets.set(key, monthlyBuckets.get(key) + total);
    addChartValue(siteTotals, order.customer_name || asset?.customer_name || asset?.location || tr(language, "Unassigned"), total);
    addChartValue(equipmentTotals, order.equipment_name || asset?.name || tr(language, "Unassigned"), total);
  }
  const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
  const categories = Object.entries(categoryTotals).map(([label, value]) => ({
    label,
    value
  }));
  return {
    total,
    totalLabel: formatCurrency(total),
    currentMonth: monthlyBuckets.get(currentMonthKey) || 0,
    previousMonth: monthlyBuckets.get(previousMonthKey) || 0,
    monthlyTrend: [...monthlyBuckets.entries()].map(([key, value]) => ({
      label: monthLabel(key),
      value: Math.round(value)
    })),
    categories,
    bySite: chartCostRows(siteTotals),
    byEquipment: chartCostRows(equipmentTotals)
  };
}

export function extractWorkOrderCosts(order) {
  const meta = parseWorkOrderNotes(order.notes);
  const sparePartItems = Array.isArray(meta.spare_parts_items) ? meta.spare_parts_items : [];
  const sparePartTotal = sparePartItems.reduce((sum, item) => sum + Number(item.total_cost || item.cost || item.unit_cost || 0) * Math.max(Number(item.qty || item.quantity || 1), 1), 0);
  return {
    Labor: numberFromAny(meta.labor_cost, meta.cost_labor, order.labor_cost),
    "Spare Parts": numberFromAny(meta.spare_parts_cost, meta.cost_spare_parts, sparePartTotal, order.spare_parts_cost),
    Contractors: numberFromAny(meta.contractors_cost, meta.contractor_cost, order.contractors_cost),
    Tools: numberFromAny(meta.tools_cost, order.tools_cost),
    Miscellaneous: numberFromAny(meta.miscellaneous_cost, meta.misc_cost, order.cost)
  };
}

export function numberFromAny(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

export function chartCostRows(counter) {
  return [...counter.entries()].filter(([, value]) => Number(value) > 0).sort(([firstLabel, firstValue], [secondLabel, secondValue]) => secondValue - firstValue || firstLabel.localeCompare(secondLabel)).slice(0, 6).map(([label, value]) => ({
    label,
    value: Math.round(value)
  }));
}

export function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString()} EGP`;
}
