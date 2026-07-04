export function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function createMonthBuckets() {
  const buckets = new Map();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(start.getFullYear(), start.getMonth() - index, 1);
    buckets.set(toMonthKey(date), 0);
  }
  return buckets;
}

export function toMonthKey(value) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key) {
  const [year, month] = String(key || "").split("-").map(Number);
  if (!year || !month) return "N/A";
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit"
  });
}
