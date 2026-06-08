export function percent(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total)) * 100);
}

export function availabilityPercent(plannedHours, downtimeHours) {
  if (!plannedHours) return 100;
  return Math.max(0, Math.round(((plannedHours - downtimeHours) / plannedHours) * 100));
}
