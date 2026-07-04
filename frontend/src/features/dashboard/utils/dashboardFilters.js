import { uniqueSorted } from "../../resources/utils/employeeUtils.js";
import { sortEquipmentByName } from "../../schedule/components/MaintenanceFollowUp.jsx";
import { getWorkOrderSavedDate, parseWorkOrderNotes } from "../../work-orders/utils/workOrderForms.js";

export function createDashboardFilters() {
  return {
    year: "all",
    month: "all",
    dateFrom: "",
    dateTo: "",
    category: "all",
    equipment: "all",
    location: "all"
  };
}

export function buildDashboardFilterOptions(data, alerts, language = "en") {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const pmTasks = data["preventive-maintenance"] || [];
  const years = uniqueSorted([...workOrders.map(order => dashboardDateParts(getWorkOrderSavedDate(order)).year), ...pmTasks.map(task => dashboardDateParts(task.next_due_date || task.last_service_date).year), ...alerts.map(alert => dashboardDateParts(alert.next_maintenance_date || alert.created_at).year)]).map(year => ({
    value: String(year),
    label: String(year)
  }));
  const months = Array.from({
    length: 12
  }, (_, index) => {
    const value = String(index + 1);
    const label = new Date(2026, index, 1).toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
      month: "long"
    });
    return {
      value,
      label
    };
  });
  const categories = uniqueSorted([...equipment.map(asset => asset.asset_type || asset.asset_level), ...equipment.map(asset => asset.asset_level)]).map(value => ({
    value,
    label: value
  }));
  const equipmentOptions = sortEquipmentByName(equipment).map(asset => ({
    value: String(asset.id),
    label: asset.name || `Asset ${asset.id}`
  }));
  const locations = uniqueSorted([...(data.customers || []).map(customer => customer.name), ...equipment.map(asset => asset.customer_name || asset.location), ...equipment.map(asset => asset.location), ...workOrders.map(order => order.customer_name), ...alerts.map(alert => alert.location)]).map(value => ({
    value,
    label: value
  }));
  return {
    years,
    months,
    categories,
    equipment: equipmentOptions,
    locations
  };
}

export function applyDashboardFilters(data, alerts, filters) {
  const equipment = data.equipment || [];
  const workOrders = data["work-orders"] || [];
  const equipmentById = new Map(equipment.map(asset => [Number(asset.id), asset]));
  const workOrderFiltered = workOrders.filter(order => dashboardWorkOrderMatches(order, equipmentById.get(Number(order.equipment_id)), filters));
  const filteredEquipmentIds = new Set(workOrderFiltered.map(order => Number(order.equipment_id)).filter(Boolean));
  const orderScoped = filters.year !== "all" || filters.month !== "all" || filters.dateFrom || filters.dateTo || filters.equipment !== "all";
  const equipmentFiltered = equipment.filter(asset => {
    if (!dashboardEquipmentMatches(asset, filters)) return false;
    return orderScoped ? filteredEquipmentIds.has(Number(asset.id)) : true;
  });
  const equipmentScopeIds = new Set(equipmentFiltered.map(asset => Number(asset.id)));
  const locationsInScope = new Set(equipmentFiltered.flatMap(asset => [asset.customer_name, asset.location].filter(Boolean).map(normalizeChoice)));
  return {
    data: {
      ...data,
      customers: (data.customers || []).filter(customer => filters.location === "all" || locationsInScope.has(normalizeChoice(customer.name))),
      engineers: (data.engineers || []).filter(engineer => filters.location === "all" || ["Available for All Sites", engineer.work_location, engineer.location].some(value => matchesFilterValue(value, filters.location))),
      equipment: equipmentFiltered,
      "work-orders": workOrderFiltered,
      inventory: (data.inventory || []).filter(item => filters.location === "all" || matchesFilterValue(item.location, filters.location)),
      "preventive-maintenance": (data["preventive-maintenance"] || []).filter(task => {
        const asset = equipmentById.get(Number(task.equipment_id));
        if (!asset || !equipmentScopeIds.has(Number(asset.id))) return false;
        if (!matchesDashboardDate(task.next_due_date || task.last_service_date, filters)) return false;
        return true;
      })
    },
    alerts: (alerts || []).filter(alert => dashboardAlertMatches(alert, equipmentFiltered, filters))
  };
}

export function dashboardWorkOrderMatches(order, asset, filters) {
  const meta = parseWorkOrderNotes(order.notes);
  if (!matchesDashboardDate(getWorkOrderSavedDate(order) || order.scheduled_date || order.due_date, filters)) return false;
  if (filters.equipment !== "all" && String(order.equipment_id || "") !== String(filters.equipment)) return false;
  if (!matchesAnyFilterValue([asset?.asset_type, asset?.asset_level], filters.category)) return false;
  if (!matchesAnyFilterValue([order.customer_name, asset?.customer_name, asset?.location, meta.location], filters.location)) return false;
  return true;
}

export function dashboardEquipmentMatches(asset, filters) {
  if (filters.equipment !== "all" && String(asset.id || "") !== String(filters.equipment)) return false;
  if (!matchesAnyFilterValue([asset.asset_type, asset.asset_level], filters.category)) return false;
  if (!matchesAnyFilterValue([asset.customer_name, asset.location], filters.location)) return false;
  return true;
}

export function dashboardAlertMatches(alert, filteredEquipment, filters) {
  if (!matchesDashboardDate(alert.next_maintenance_date || alert.created_at, filters)) return false;
  if (!matchesAnyFilterValue([alert.location], filters.location)) return false;
  if (filters.equipment !== "all") {
    const selectedAsset = filteredEquipment.find(asset => String(asset.id) === String(filters.equipment));
    return selectedAsset ? normalizeChoice(selectedAsset.name) === normalizeChoice(alert.equipment_name) : false;
  }
  if (filters.category === "all") return true;
  const alertName = normalizeChoice(alert.equipment_name);
  return filteredEquipment.some(asset => normalizeChoice(asset.name) === alertName);
}

export function matchesDashboardDate(value, filters) {
  const parts = dashboardDateParts(value);
  if (filters.year !== "all" && String(parts.year) !== String(filters.year)) return false;
  if (filters.month !== "all" && String(parts.month) !== String(filters.month)) return false;
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

export function dashboardDateParts(value) {
  const date = dashboardDateValue(value);
  if (!date) return {
    year: "",
    month: ""
  };
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1)
  };
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
