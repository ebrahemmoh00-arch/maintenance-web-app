import { Panel } from "../../../shared/components/Panel.jsx";
import { uniqueSorted } from "../../resources/utils/employeeUtils.js";
import { Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function WorkOrderParticipationPanel({
  title,
  subtitle,
  filterTitle,
  data,
  color
}) {
  const rows = useMemo(() => data.filter(item => item.value > 0 && item.label !== "No data"), [data]);
  const [selectedNames, setSelectedNames] = useState([]);
  const visibleRows = selectedNames.length ? rows.filter(item => selectedNames.includes(item.label)) : rows;
  useEffect(() => {
    setSelectedNames(current => current.filter(name => rows.some(item => item.label === name)));
  }, [rows]);
  return <Panel title={title} subtitle={subtitle} actions={<ParticipantFilterList title={filterTitle} rows={rows} selectedNames={selectedNames} setSelectedNames={setSelectedNames} />}>
      <ParticipationBarChart rows={visibleRows} color={color} />
    </Panel>;
}

export function ParticipantFilterList({
  title,
  rows,
  selectedNames,
  setSelectedNames
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selectedNames.length === 0;
  const label = allSelected ? "All" : `${selectedNames.length} selected`;
  function toggleName(name) {
    setSelectedNames(current => {
      if (!current.length) return [name];
      return current.includes(name) ? current.filter(item => item !== name) : uniqueSorted([...current, name]);
    });
  }
  return <div className="relative z-30 ml-auto">
      <button type="button" onClick={() => setOpen(current => !current)} className="inline-flex w-44 max-w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700" title={title}>
        <span className="inline-flex min-w-0 items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </span>
      </button>

      {open ? <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
            <button type="button" onClick={() => {
          setSelectedNames([]);
          setOpen(false);
        }} className={`rounded-md px-2 py-1 text-xs font-black ${allSelected ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>
              All
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {rows.map(row => {
          const checked = allSelected || selectedNames.includes(row.label);
          return <label key={row.label} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${checked ? "border-blue-200 bg-blue-50 text-slate-950" : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleName(row.label)} className="h-4 w-4 rounded border-slate-300 text-blue-700" />
                  <span className="min-w-0 flex-1 text-right font-bold leading-snug" title={row.label}>{row.label}</span>
                  <span className="rounded bg-white px-2 py-0.5 text-xs font-black text-slate-700">{row.value}</span>
                </label>;
        })}
            {!rows.length ? <p className="py-8 text-center text-sm font-semibold text-slate-400">No data</p> : null}
          </div>
        </div> : null}
    </div>;
}

export function ParticipationBarChart({
  rows,
  color
}) {
  const maxValue = Math.max(...rows.map(item => Number(item.value || 0)), 1);
  const topTick = Math.max(1, Math.ceil(maxValue / 2) * 2);
  const ticks = Array.from({
    length: 5
  }, (_, index) => Math.round(topTick / 4 * (4 - index)));
  const barColor = color === "cyan" ? "bg-cyan-600" : "bg-blue-700";
  const rowCount = Math.max(rows.length, 1);
  const columnWidth = rowCount <= 6 ? 92 : rowCount <= 10 ? 78 : rowCount <= 16 ? 66 : 56;
  const columnMinWidth = Math.max(columnWidth - 10, 46);
  const barMaxWidth = rowCount <= 8 ? 44 : rowCount <= 16 ? 34 : 26;
  const axisWidth = 76;
  const chartWidth = Math.max(640, rowCount * columnWidth + axisWidth + 96);
  const columnTemplate = `repeat(${rowCount}, minmax(${columnMinWidth}px, 1fr))`;
  const columnGap = rowCount <= 8 ? "1rem" : rowCount <= 16 ? "0.65rem" : "0.4rem";
  const labelFontSize = rowCount > 16 ? "10px" : "11px";
  return <div className="min-h-80 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">Work Orders Count</p>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Name vs Work Orders</p>
      </div>
      {rows.length ? <div className="overflow-x-auto pb-2">
          <div className="grid gap-4" style={{
        gridTemplateColumns: `${axisWidth}px 1fr`,
        minWidth: `${chartWidth}px`
      }}>
            <div className="relative h-72">
              {ticks.map((tick, index) => <span key={`${tick}-${index}`} className="absolute right-1 -translate-y-1/2 text-xs font-bold text-slate-500" style={{
            bottom: `${tick / topTick * 100}%`
          }}>
                  {tick}
                </span>)}
              <span className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs font-black text-slate-600">Work Orders</span>
            </div>

            <div className="min-w-0">
              <div className="relative h-72 border-b border-l border-slate-300">
                {ticks.map((tick, index) => <span key={`${tick}-grid-${index}`} className="absolute left-0 right-0 border-t border-slate-200" style={{
              bottom: `${tick / topTick * 100}%`
            }} />)}
                <div className="absolute inset-x-3 bottom-0 top-0 grid items-end" style={{
              gridTemplateColumns: columnTemplate,
              columnGap
            }}>
                  {rows.map(row => {
                const height = `${Math.max(Number(row.value || 0) / topTick * 100, row.value ? 8 : 0)}%`;
                return <div key={row.label} className="flex h-full flex-col items-center justify-end">
                        <span className="mb-2 text-sm font-black text-slate-900">{row.value}</span>
                        <div className={`w-full rounded-t-md ${barColor} shadow-sm`} style={{
                    height,
                    maxWidth: `${barMaxWidth}px`
                  }} title={`${row.label}: ${row.value}`} />
                      </div>;
              })}
                </div>
              </div>

              <div className="mt-3 grid px-3" style={{
            gridTemplateColumns: columnTemplate,
            columnGap
          }}>
                {rows.map(row => <p key={row.label} className="w-full break-words text-center font-black leading-snug text-slate-800" style={{
              fontSize: labelFontSize,
              minHeight: rowCount > 14 ? "64px" : "48px",
              overflowWrap: "anywhere"
            }} title={row.label}>
                    {row.label}
                  </p>)}
              </div>
              <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500">Name</p>
            </div>
          </div>
        </div> : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
          No selected names
        </div>}
    </div>;
}
