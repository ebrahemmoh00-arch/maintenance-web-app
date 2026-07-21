const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_HOURS_THRESHOLD = 500;
const UPCOMING_DAYS_THRESHOLD = 7;

export function normalizeMaintenanceName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function maintenanceIdentityKey(equipmentId, name) {
  return `${Number(equipmentId) || 0}::${normalizeMaintenanceName(name)}`;
}

export function buildUnifiedPmRows(pmTasks = [], pmPlans = [], equipment = []) {
  const equipmentById = new Map(equipment.map(asset => [Number(asset.id), asset]));
  const planRows = pmPlans.map(plan => pmPlanToFollowUpTask(plan, equipmentById.get(Number(plan.equipment_id))));
  const planKeys = new Set(planRows.map(row => maintenanceIdentityKey(row.equipment_id, row.task_name)));
  const manualRows = pmTasks.filter(task => {
    const key = maintenanceIdentityKey(task.equipment_id, task.task_name);
    return !planKeys.has(key);
  }).map(task => ({
    ...task,
    source: "manual",
    source_label: "Maintenance Follow-up"
  }));
  return [...planRows, ...manualRows].sort((first, second) => normalizeMaintenanceName(first.task_name).localeCompare(normalizeMaintenanceName(second.task_name)));
}

export function pmPlanToFollowUpTask(plan, asset = null) {
  const due = calculatePmPlanDue(plan, asset);
  return {
    ...plan,
    id: `pm-plan-${plan.id}`,
    pm_plan_id: plan.id,
    source: "pm-plan",
    source_label: "PM Plan",
    task_name: plan.name,
    equipment_id: plan.equipment_id,
    equipment_name: plan.equipment_name || asset?.name || "",
    customer_name: plan.customer_name || asset?.customer_name || "",
    current_hours: due.current_hours,
    interval_hours: due.isRuntime ? due.interval_value : 0,
    interval_days: due.isRuntime ? 0 : due.interval_value,
    last_service_hours: due.last_runtime,
    last_service_date: plan.last_service_date || "",
    next_due_date: due.next_due_date,
    next_due_runtime: due.next_due_runtime,
    hours_until_due: due.hours_until_due,
    days_until_due: due.days_until_due,
    pm_alert: due.pm_alert,
    required_maintenance: plan.name,
    maintenance_type: plan.description || plan.name,
    previous_records: Array.isArray(plan.previous_records) ? plan.previous_records : []
  };
}

export function calculatePmPlanDue(plan, asset = null) {
  const recurrence = String(plan.recurrence_type || "Runtime Hours");
  const isRuntime = recurrence.toLowerCase() === "runtime hours";
  const intervalValue = Math.max(Number(plan.interval_value || 0), 0);
  const currentHours = Number(plan.current_hours ?? asset?.current_hours ?? 0);
  const lastRuntime = Number(plan.last_runtime || 0);
  const status = String(plan.status || "active").toLowerCase();

  if (isRuntime) {
    const nextDueRuntime = Number(plan.next_due_runtime || 0) || lastRuntime + intervalValue;
    const hoursUntilDue = nextDueRuntime - currentHours;
    return {
      recurrence_type: recurrence,
      interval_value: intervalValue,
      isRuntime,
      current_hours: currentHours,
      last_runtime: lastRuntime,
      next_due_runtime: nextDueRuntime,
      next_due_date: "",
      hours_until_due: hoursUntilDue,
      days_until_due: null,
      pm_alert: status === "active" ? alertFromRemaining(hoursUntilDue, UPCOMING_HOURS_THRESHOLD) : "OK"
    };
  }

  const nextDueDate = plan.next_due_date || calculateCalendarNextDueDate(plan.start_date, intervalValue, recurrence);
  const daysUntilDue = daysUntilDate(nextDueDate);
  return {
    recurrence_type: recurrence,
    interval_value: intervalValue,
    isRuntime,
    current_hours: currentHours,
    last_runtime: lastRuntime,
    next_due_runtime: 0,
    next_due_date: nextDueDate,
    hours_until_due: null,
    days_until_due: daysUntilDue,
    pm_alert: status === "active" ? alertFromRemaining(daysUntilDue, UPCOMING_DAYS_THRESHOLD) : "OK"
  };
}

export function calculateCalendarNextDueDate(startDate, intervalValue, recurrenceType) {
  const base = parseIsoDate(startDate);
  if (!base) return "";
  const interval = Math.max(Number(intervalValue || 0), 0);
  const recurrence = String(recurrenceType || "Daily").toLowerCase();
  if (recurrence === "weekly") base.setUTCDate(base.getUTCDate() + interval * 7);
  else if (recurrence === "monthly") base.setUTCMonth(base.getUTCMonth() + interval);
  else base.setUTCDate(base.getUTCDate() + interval);
  return base.toISOString().slice(0, 10);
}

export function daysUntilDate(value) {
  const dueDate = parseIsoDate(value);
  if (!dueDate) return null;
  return Math.ceil((dueDate.getTime() - todayUtc().getTime()) / DAY_MS);
}

function alertFromRemaining(remaining, threshold) {
  if (remaining === null || remaining === undefined || Number.isNaN(Number(remaining))) return "OK";
  const value = Number(remaining);
  if (value <= 0) return "DUE NOW";
  if (value <= threshold) return "UPCOMING";
  return "OK";
}

function parseIsoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
