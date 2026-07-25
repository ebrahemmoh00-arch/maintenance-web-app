export const EMPTY_TABLE_DESIGN = {
  columns: [],
  rows: []
};

export function parseMeasurementTableDesign(value) {
  const parsed = safeJson(value, value);
  return normalizeMeasurementTableDesign(parsed);
}

export function normalizeMeasurementTableDesign(value) {
  const source = Array.isArray(value) ? { columns: value, rows: [] } : value && typeof value === "object" ? value : EMPTY_TABLE_DESIGN;
  const columns = normalizeColumns(source.columns);
  const rows = normalizeRowsForColumns(source.rows, columns);
  return { columns, rows };
}

export function serializeMeasurementTableDesign(value) {
  return JSON.stringify(normalizeMeasurementTableDesign(value));
}

export function normalizeRowsForColumns(rows, columns) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  return sourceRows.map(row => {
    if (Array.isArray(row)) {
      return columns.reduce((nextRow, column, index) => ({
        ...nextRow,
        [column.key]: row[index] ?? ""
      }), {});
    }
    return columns.reduce((nextRow, column) => ({
      ...nextRow,
      [column.key]: row?.[column.key] ?? ""
    }), {});
  });
}

export function emptyTableRow(columns) {
  return columns.reduce((row, column) => ({ ...row, [column.key]: "" }), {});
}

export function createMeasurementColumn(index, label = "") {
  const columnLabel = String(label || `Column ${index + 1}`).trim();
  return {
    key: `col_${index + 1}_${slug(columnLabel)}`,
    label: columnLabel,
    type: "text"
  };
}

function normalizeColumns(columns) {
  const usedKeys = new Set();
  return (Array.isArray(columns) ? columns : []).map((column, index) => {
    const rawLabel = typeof column === "string" ? column : column && Object.prototype.hasOwnProperty.call(column, "label") ? column.label : column?.name ?? `Column ${index + 1}`;
    const label = String(rawLabel ?? "").trim();
    const baseKey = String(typeof column === "object" && column?.key ? column.key : `col_${index + 1}_${slug(label)}`).trim() || `col_${index + 1}`;
    let key = baseKey;
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);
    return {
      key,
      label,
      type: typeof column === "object" && column?.type ? column.type : "text"
    };
  });
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function slug(value) {
  return String(value || "value").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "value";
}
