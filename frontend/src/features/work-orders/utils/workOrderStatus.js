export function normalizeWorkOrderStatus(value) {
  return String(value || "new").toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}
