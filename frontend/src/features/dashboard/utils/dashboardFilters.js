import { uniqueSorted } from "../../resources/utils/employeeUtils.js";
import { sortEquipmentByName } from "../../schedule/components/MaintenanceFollowUp.jsx";
import { getWorkOrderSavedDate, parseWorkOrderNotes } from "../../work-orders/utils/workOrderForms.js";

export function createDashboardFilters() {
  return {
    dateFrom: "",
    dateTo: "",
    category: "all",
    equipment: "all",
    location: "all"
  };
}

export function buildDashboardFilterOptions(data, alerts = []) {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const customerNameById = buildCustomerNameById(data.customers || []);
  const categories = uniqueSorted([...equipment.map(asset => asset.asset_type || asset.asset_level), ...equipment.map(asset => asset.asset_level)]).map(value => ({
    value,
    label: value
  }));
  const equipmentOptions = sortEquipmentByName(equipment).map(asset => ({
    value: String(asset.id),
    label: asset.name || `Asset ${asset.id}`,
    locations: assetLocationValues(asset, customerNameById).map(normalizeChoice),
    categories: [asset.asset_type, asset.asset_level].filter(Boolean).map(normalizeChoice)
  }));
  const locations = uniqueSorted([...(data.customers || []).map(customer => customer.name), ...equipment.flatMap(asset => assetLocationValues(asset, customerNameById)), ...workOrders.map(order => order.customer_name), ...alerts.map(alert => alert.location)]).map(value => ({
    value,
    label: value
  }));
  return {
    categories,
    equipment: equipmentOptions,
    locations
  };
}

export function applyDashboardFilters(data, alerts, filters) {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const customerNameById = buildCustomerNameById(data.customers || []);
  const equipmentById = new Map(equipment.map(asset => [Number(asset.id), asset]));
  const equipmentFiltered = equipment.filter(asset => dashboardEquipmentMatches(asset, filters, customerNameById));
  const equipmentScopeIds = new Set(equipmentFiltered.map(asset => Number(asset.id)));
  const workOrderFiltered = workOrders.filter(order => dashboardWorkOrderMatches(order, equipmentById.get(Number(order.equipment_id)), filters, customerNameById));
  return {
    data: {
      ...data,
      customers: (data.customers || []).filter(customer => matchesFilterValue(customer.name, filters.location)),
      engineers: (data.engineers || []).filter(engineer => filters.location === "all" || ["Available for All Sites", engineer.work_location, engineer.location].some(value => matchesFilterValue(value, filters.location))),
      equipment: equipmentFiltered,
      "work-orders": workOrderFiltered,
      inventory: (data.inventory || []).filter(item => filters.location === "all" || matchesFilterValue(item.location, filters.location)),
      "preventive-maintenance": (data["preventive-maintenance"] || []).filter(task => {
        const asset = equipmentById.get(Number(task.equipment_id));
        if (asset) {
          if (!equipmentScopeIds.has(Number(asset.id))) return false;
        } else if (filters.location !== "all" || filters.category !== "all" || filters.equipment !== "all") {
          return false;
        }
        if (!matchesDashboardDate(task.next_due_date || task.last_service_date, filters)) return false;
        return true;
      })
    },
    alerts: (alerts || []).filter(alert => dashboardAlertMatches(alert, equipmentFiltered, filters))
  };
}

export function dashboardWorkOrderMatches(order, asset, filters, customerNameById = new Map()) {
  const meta = parseWorkOrderNotes(order.notes);
  if (!matchesDashboardDate(getWorkOrderSavedDate(order) || order.scheduled_date || order.due_date, filters)) return false;
  if (filters.equipment !== "all" && String(order.equipment_id || "") !== String(filters.equipment)) return false;
  if (!matchesAnyFilterValue([asset?.asset_type, asset?.asset_level], filters.category)) return false;
  if (!matchesAnyFilterValue([order.customer_name, order.location, meta.location, ...assetLocationValues(asset, customerNameById)], filters.location)) return false;
  return true;
}

export function dashboardEquipmentMatches(asset, filters, customerNameById = new Map()) {
  if (!asset) return false;
  if (filters.equipment !== "all" && String(asset.id || "") !== String(filters.equipment)) return false;
  if (!matchesAnyFilterValue([asset.asset_type, asset.asset_level], filters.category)) return false;
  if (!matchesAnyFilterValue(assetLocationValues(asset, customerNameById), filters.location)) return false;
  return true;
}

export function dashboardAlertMatches(alert, filteredEquipment, filters) {
  if (!matchesDashboardDate(alert.next_maintenance_date || alert.created_at, filters)) return false;
  const relatedAsset = findAlertAsset(alert, filteredEquipment);
  if (filters.location !== "all" && !matchesAnyFilterValue([alert.location], filters.location) && !relatedAsset) return false;
  if (filters.equipment !== "all") {
    return relatedAsset ? String(relatedAsset.id) === String(filters.equipment) : false;
  }
  if (filters.category !== "all" && !relatedAsset) return false;
  return true;
}

export function matchesDashboardDate(value, filters) {
  const date = dashboardDateValue(value);
  if (filters.dateFrom) {
    const from = dashboardDateValue(filters.dateFrom);
    if (!date || !from || date < from) return false;
  }
  if (filters.dateTo) {
    const to = dashboardDateValue(filters.dateTo);
    if (!date || !to || date > to) return false;
  }
  return true;
}

export function dashboardDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function matchesAnyFilterValue(values, selected) {
  if (selected === "all") return true;
  return values.some(value => matchesFilterValue(value, selected));
}

export function matchesFilterValue(value, selected) {
  if (selected === "all") return true;
  return normalizeChoice(value) === normalizeChoice(selected);
}

export function normalizeChoice(value) {
  return String(value || "").replace(/_/g, " ").trim().toLowerCase();
}

export function buildCustomerNameById(customers = []) {
  return new Map(customers.map(customer => [Number(customer.id), customer.name]).filter(([id, name]) => Number.isFinite(id) && name));
}

export function assetLocationValues(asset, customerNameById = new Map()) {
  if (!asset) return [];
  return [
    asset.customer_name,
    customerNameById.get(Number(asset.customer_id)),
    asset.site,
    asset.location
  ].filter(Boolean);
}

function findAlertAsset(alert, filteredEquipment) {
  const alertId = String(alert.equipment_id || alert.asset_id || "").trim();
  const alertName = normalizeChoice(alert.equipment_name || alert.asset_name || alert.name);
  return filteredEquipment.find(asset => {
    if (alertId && String(asset.id || "") === alertId) return true;
    const assetName = normalizeChoice(asset.name);
    if (!alertName || !assetName) return false;
    return alertName === assetName || alertName.includes(assetName) || assetName.includes(alertName);
  });
}
