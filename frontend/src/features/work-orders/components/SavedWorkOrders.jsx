import { StatusBadge, valueLabel } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { formatDate } from "../../../shared/i18n/index.js";
import { calculateDuration, getWorkOrderSavedDate, parseWorkOrderNotes } from "../utils/workOrderForms.js";

export function SavedWorkOrderFilters({
  equipment,
  dates,
  value,
  onChange,
  language
}) {
  const t = text => tr(language, text);
  return <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-950">{t("Saved Work Orders")}</h3>
        <p className="text-xs font-semibold text-slate-500">{t("Filter by equipment then date to reach a saved work order faster.")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Equipment")}</span>
          <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" value={value.equipmentId} onChange={event => onChange({
          equipmentId: event.target.value
        })}>
            <option value="">{t("All Equipment")}</option>
            {equipment.map(item => <option key={item.id} value={item.id}>
                {[item.customer_name, item.name].filter(Boolean).join(" / ")}
              </option>)}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Date")}</span>
          <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400" value={value.date} onChange={event => onChange({
          date: event.target.value
        })} disabled={!value.equipmentId}>
            <option value="">{value.equipmentId ? t("All Dates") : t("Select equipment first")}</option>
            {dates.map(date => <option key={date} value={date}>{formatDate(date, language)}</option>)}
          </select>
        </label>
      </div>
    </div>;
}

export function SavedWorkOrdersTable({
  rows,
  selectedId,
  setSelectedId,
  onOpen,
  language
}) {
  const t = text => tr(language, text);
  return <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="overflow-auto">
        <table className="min-w-[1220px] w-full border-collapse text-xs">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="w-10 border border-slate-600 px-2 py-2"></th>
              <th className="border border-slate-600 px-2 py-2">{t("Date")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("W.O.")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("Asset")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("Task Description")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("Type of maintenance")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("Shift Engineer")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("Techn.")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("R.H")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("Duration")}</th>
              <th className="border border-slate-600 px-2 py-2">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
            const meta = parseWorkOrderNotes(row.notes);
            const reference = meta.wo_reference || `${row.customer_name || ""} ${row.equipment_name || ""}`.trim();
            const savedDate = getWorkOrderSavedDate(row);
            const shiftEngineer = meta.assigned_to || meta.shift_engineer_name || row.engineer_name || "-";
            const technicians = teamMembersLabel(meta);
            return <tr key={row.id} onClick={() => setSelectedId(row.id)} onDoubleClick={() => onOpen?.(row.id)} className={`cursor-pointer ${Number(row.id) === Number(selectedId) ? "bg-blue-50" : "odd:bg-white even:bg-slate-50"} hover:bg-cyan-50`}>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    <input type="radio" checked={Number(row.id) === Number(selectedId)} onChange={() => setSelectedId(row.id)} />
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-semibold">{formatDate(savedDate, language)}</td>
                  <td className="border border-slate-300 px-2 py-2 font-semibold">{reference}</td>
                  <td className="border border-slate-300 px-2 py-2">{row.customer_name} {row.equipment_name}</td>
                  <td className="border border-slate-300 px-2 py-2">{row.description}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{meta.maintenance_type || valueLabel(row.priority, language)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{shiftEngineer}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{technicians}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-black">{row.service_hours}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-black">{meta.duration || calculateDuration(meta.start_time, meta.finished_time)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center"><StatusBadge value={row.status} language={language} /></td>
                </tr>;
          })}
            {!rows.length ? <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500">{t("No records found.")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>;
}

function teamMembersLabel(meta) {
  const members = Array.isArray(meta.appointed_members_list)
    ? meta.appointed_members_list
    : String(meta.appointed_members || "").split(/\r?\n|,/);
  const cleaned = members.map(member => String(member || "").trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(" / ") : "-";
}
