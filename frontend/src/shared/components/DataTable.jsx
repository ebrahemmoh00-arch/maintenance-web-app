import { ArrowDownUp, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function DataTable({ columns, rows, onEdit, onDelete, emptyMessage = "No records found.", labels = {} }) {
  const hasActions = Boolean(onEdit || onDelete);
  const [sort, setSort] = useState({ key: columns[0]?.key, direction: "asc" });

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    return [...rows].sort((a, b) => {
      const left = a[sort.key] ?? "";
      const right = b[sort.key] ?? "";
      const result = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort]);

  function toggleSort(key, sortable = true) {
    if (!sortable) return;
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left font-bold">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key, column.sortable !== false)}
                    className="inline-flex items-center gap-2 hover:text-slate-900"
                  >
                    {column.label}
                    {column.sortable === false ? null : <ArrowDownUp className="h-3 w-3" />}
                  </button>
                </th>
              ))}
              {hasActions ? <th className="px-4 py-3 text-right font-bold">{labels.actions || "Actions"}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedRows.map((row) => (
              <tr key={row.id} className="transition hover:bg-cyan-50/60">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {hasActions ? (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {onEdit ? (
                      <button className="mr-2 inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-500 hover:text-cyan-700" onClick={() => onEdit(row)}>
                        <Pencil className="h-3 w-3" />
                        {labels.edit || "Edit"}
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => onDelete(row.id)}>
                        <Trash2 className="h-3 w-3" />
                        {labels.delete || "Delete"}
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
            {!sortedRows.length && (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500" colSpan={columns.length + (hasActions ? 1 : 0)}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
