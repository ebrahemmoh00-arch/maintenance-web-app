export function HistoryDetailsDialog({ event, onClose }) {
  if (!event) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Asset History Event</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{event.event_type}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{event.summary}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Detail label="Date & Time" value={event.event_time} />
          <Detail label="User / Technician" value={event.technician || event.user_name} />
          <Detail label="Work Order" value={event.work_order_number} />
          <Detail label="PM Plan" value={event.pm_plan} />
          <Detail label="Failure Code" value={event.failure_code} />
          <Detail label="Downtime Duration" value={event.downtime_duration} />
          <Detail label="Status" value={event.status} />
          <Detail label="Reference" value={[event.reference_type, event.reference_id].filter(Boolean).join(" #")} />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-black text-slate-950">Description</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">{event.description || event.summary || "-"}</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <JsonBlock title="Details" value={event.details} />
          <JsonBlock title="Metadata" value={event.metadata} />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{formatValue(value)}</p>
    </div>
  );
}

function JsonBlock({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-black text-slate-950">{title}</h4>
      <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-xs font-semibold leading-5 text-slate-100">{formatValue(value)}</pre>
    </div>
  );
}

function formatValue(value) {
  if (!value) return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
