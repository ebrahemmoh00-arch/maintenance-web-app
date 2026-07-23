const EVENT_TYPES = [
  "",
  "Asset Created",
  "Preventive Maintenance",
  "Corrective Maintenance",
  "Inspection",
  "Work Order Created",
  "Work Order Assigned",
  "Work Started",
  "Work Completed",
  "Work Approved",
  "Failure Recorded",
  "Downtime Started",
  "Downtime Ended",
  "Spare Parts Issued",
  "Meter Reading",
  "Photo Added",
  "Document Uploaded",
  "Status Changed",
  "Warranty Event"
];

export function HistoryFilters({ filters, onChange, technicians = [], language }) {
  const t = text => tr(language, text);
  function update(key, value) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-6">
      <HistoryFilterField label="From" language={language}>
        <input type="date" value={filters.date_from || ""} onChange={event => update("date_from", event.target.value)} className="history-filter-input" />
      </HistoryFilterField>
      <HistoryFilterField label="To" language={language}>
        <input type="date" value={filters.date_to || ""} onChange={event => update("date_to", event.target.value)} className="history-filter-input" />
      </HistoryFilterField>
      <HistoryFilterField label="Event Type" language={language}>
        <select value={filters.event_type || ""} onChange={event => update("event_type", event.target.value)} className="history-filter-input">
          {EVENT_TYPES.map(value => <option key={value || "all"} value={value}>{t(value || "All")}</option>)}
        </select>
      </HistoryFilterField>
      <HistoryFilterField label="Technician" language={language}>
        <select value={filters.technician || ""} onChange={event => update("technician", event.target.value)} className="history-filter-input">
          <option value="">{t("All")}</option>
          {technicians.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </HistoryFilterField>
      <HistoryFilterField label="Status" language={language}>
        <select value={filters.status || ""} onChange={event => update("status", event.target.value)} className="history-filter-input">
          {["", "open", "closed", "completed", "approved", "active", "issued"].map(value => <option key={value || "all"} value={value}>{t(value || "All")}</option>)}
        </select>
      </HistoryFilterField>
      <HistoryFilterField label="PM / CM" language={language}>
        <select value={filters.pm_cm || ""} onChange={event => update("pm_cm", event.target.value)} className="history-filter-input">
          <option value="">{t("All")}</option>
          <option value="PM">PM</option>
          <option value="CM">CM</option>
        </select>
      </HistoryFilterField>
    </div>
  );
}

function HistoryFilterField({ label, children, language }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{tr(language, label)}</span>
      {children}
    </label>
  );
}
import { tr } from "../../../../shared/config/appConfig.jsx";
