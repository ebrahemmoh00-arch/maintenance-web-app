import { tr } from "../../../shared/config/appConfig.jsx";
import { createMeasurementColumn, emptyTableRow, normalizeMeasurementTableDesign, normalizeRowsForColumns } from "../utils/measurementTables.js";
import { Plus, Trash2 } from "lucide-react";

const MAX_COLUMNS = 30;
const MAX_ROWS = 100;

export function MeasurementTableDesigner({ value, onChange, language }) {
  const t = text => tr(language, text);
  const design = normalizeMeasurementTableDesign(value);
  const { columns, rows } = design;

  function emit(nextDesign) {
    onChange(normalizeMeasurementTableDesign(nextDesign));
  }

  function setColumnCount(nextValue) {
    const count = clampCount(nextValue, MAX_COLUMNS);
    const nextColumns = [...columns];
    if (count > nextColumns.length) {
      for (let index = nextColumns.length; index < count; index += 1) {
        nextColumns.push(createMeasurementColumn(index));
      }
    }
    emit({
      columns: nextColumns.slice(0, count),
      rows
    });
  }

  function setRowCount(nextValue) {
    const count = clampCount(nextValue, MAX_ROWS);
    const nextRows = [...rows];
    if (count > nextRows.length) {
      for (let index = nextRows.length; index < count; index += 1) {
        nextRows.push(emptyTableRow(columns));
      }
    }
    emit({
      columns,
      rows: nextRows.slice(0, count)
    });
  }

  function addColumn() {
    setColumnCount(columns.length + 1);
  }

  function addRow() {
    setRowCount(rows.length + 1);
  }

  function clearTable() {
    emit({ columns: [], rows: [] });
  }

  function updateColumn(index, nextLabel) {
    emit({
      columns: columns.map((column, columnIndex) => columnIndex === index ? { ...column, label: nextLabel } : column),
      rows
    });
  }

  function removeColumn(index) {
    const nextColumns = columns.filter((_, columnIndex) => columnIndex !== index);
    emit({
      columns: nextColumns,
      rows: normalizeRowsForColumns(rows, nextColumns)
    });
  }

  function updateCell(rowIndex, columnKey, nextValue) {
    emit({
      columns,
      rows: rows.map((row, index) => index === rowIndex ? { ...row, [columnKey]: nextValue } : row)
    });
  }

  function removeRow(rowIndex) {
    emit({
      columns,
      rows: rows.filter((_, index) => index !== rowIndex)
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Design Table")}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">{t("Set table size, edit column names, and enter default cell values before saving.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addColumn} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-black text-white">
            <Plus className="h-3.5 w-3.5" />
            {t("Add Column")}
          </button>
          <button type="button" onClick={addRow} disabled={!columns.length} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" />
            {t("Add Row")}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <CountInput label={t("Columns")} value={columns.length} max={MAX_COLUMNS} onChange={setColumnCount} />
        <CountInput label={t("Rows")} value={rows.length} max={MAX_ROWS} onChange={setRowCount} disabled={!columns.length} />
        <button type="button" onClick={clearTable} className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">
          {t("Clear Table")}
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-16 border-b border-slate-200 px-2 py-2 text-left font-black text-slate-500">{t("Row")}</th>
              {columns.map((column, index) => (
                <th key={column.key} className="min-w-40 border-b border-slate-200 px-2 py-2 text-left align-top">
                  <div className="flex items-center gap-2">
                    <input value={column.label} onChange={event => updateColumn(index, event.target.value)} placeholder={t("Column Name")} className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500" />
                    <button type="button" onClick={() => removeColumn(index)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-100 bg-white text-red-600 hover:bg-red-50" title={t("Remove Column")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-20 border-b border-slate-200 px-2 py-2 text-right font-black text-slate-500">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border-b border-slate-100 bg-slate-50 px-2 py-2 font-black text-slate-500">{rowIndex + 1}</td>
                {columns.map(column => (
                  <td key={column.key} className="border-b border-slate-100 px-2 py-2">
                    <input value={row[column.key] || ""} onChange={event => updateCell(rowIndex, column.key, event.target.value)} placeholder={t("Cell Value")} className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white" />
                  </td>
                ))}
                <td className="border-b border-slate-100 px-2 py-2 text-right">
                  <button type="button" onClick={() => removeRow(rowIndex)} className="rounded-md border border-red-100 px-2 py-1 font-black text-red-600 hover:bg-red-50">{t("Delete")}</button>
                </td>
              </tr>
            ))}
            {!columns.length || !rows.length ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-8 text-center font-bold text-slate-400">
                  {columns.length ? t("Set row count or add rows to start entering table data.") : t("Set column count or add columns to start designing the table.")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CountInput({ label, value, max, onChange, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input type="number" min="0" max={max} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" />
    </label>
  );
}

function clampCount(value, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(number, max);
}
