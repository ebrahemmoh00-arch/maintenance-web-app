import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { PriorityBadge, StatusBadge, WorkOrderStatus } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { joinTime12, splitTime12 } from "../utils/workOrderForms.js";
import { normalizeWorkOrderStatus } from "../utils/workOrderStatus.js";
export function WorkOrderLifecyclePanel({
  order,
  engineers,
  draft,
  setDraft,
  onAction,
  canEdit,
  language
}) {
  const t = text => tr(language, text);
  const status = normalizeWorkOrderStatus(order.status);
  const actions = lifecycleActionsForStatus(status);
  const update = (key, value) => setDraft(current => ({
    ...current,
    [key]: value
  }));
  return <Panel title={t("Work Order Lifecycle Engine")} subtitle={t("Production workflow, assignment, review, timeline, and execution control.")} language={language}>
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Current Status")}</p>
                <div className="mt-2"><WorkOrderStatus value={status} priority={order.priority} language={language} /></div>
              </div>
              <PriorityBadge value={order.priority} language={language} />
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <LifecycleInfo label="Assigned At" value={formatLifecycleDate(order.assigned_at)} language={language} />
              <LifecycleInfo label="Accepted At" value={formatLifecycleDate(order.accepted_at)} language={language} />
              <LifecycleInfo label="Started At" value={formatLifecycleDate(order.started_at)} language={language} />
              <LifecycleInfo label="Completed At" value={formatLifecycleDate(order.completed_at)} language={language} />
              <LifecycleInfo label="Approved At" value={formatLifecycleDate(order.approved_at)} language={language} />
              <LifecycleInfo label="Closed At" value={formatLifecycleDate(order.closed_at)} language={language} />
              <LifecycleInfo label="Duration" value={order.work_duration_minutes ? `${order.work_duration_minutes} ${t("min")}` : "-"} language={language} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">{t("Assignment Card")}</h3>
            <label className="mt-3 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Technician / Resource")}</span>
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" value={draft.engineer_id || order.engineer_id || ""} onChange={event => update("engineer_id", event.target.value)}>
                <option value=""></option>
                {engineers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">{t("Execution Details")}</h3>
            <div className="mt-3 grid gap-3">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Runtime Reading")}</span>
                <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" value={draft.runtime_reading} onChange={event => update("runtime_reading", event.target.value)} placeholder={String(order.service_hours || 0)} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Technician Notes")}</span>
                <textarea rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={draft.notes} onChange={event => update("notes", event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Reason")}</span>
                <textarea rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={draft.reason} onChange={event => update("reason", event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Completion Notes")}</span>
                <textarea rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={draft.completion_notes} onChange={event => update("completion_notes", event.target.value)} />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
                <input type="checkbox" checked={draft.checklist_completed} onChange={event => update("checklist_completed", event.target.checked)} />
                {t("Checklist completed")}
              </label>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">{t("Lifecycle Actions")}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{t("Only valid state transitions are enabled.")}</p>
              </div>
              <StatusBadge value={status} language={language} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map(action => <button key={action.key} type="button" disabled={!canEdit} onClick={() => onAction(action.key)} className={`rounded-lg px-3 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${action.tone}`}>
                  {t(action.label)}
                </button>)}
              {!actions.length ? <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">{t("No available actions")}</span> : null}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <LifecycleCard title="Approval Card" rows={[["Approved By", order.approved_by_name || "-"], ["Supervisor Notes", order.supervisor_notes || "-"], ["Review Status", status === "pending_supervisor_review" ? t("Awaiting review") : t(status.replaceAll("_", " "))]]} language={language} />
            <LifecycleCard title="Parts Panel" rows={[["Waiting Reason", order.waiting_parts_reason || "-"], ["Linked Parts", t("Inventory-linked records")], ["Reservation", status === "waiting_for_parts" ? t("Required") : t("Not active")]]} language={language} />
            <LifecycleCard title="Checklist Panel" rows={[["Checklist", order.checklist_completed ? t("Completed") : t("Not completed")], ["Completion Notes", order.completion_notes || "-"], ["Runtime End", order.runtime_reading_end || order.service_hours || "-"]]} language={language} />
            <LifecycleCard title="History Panel" rows={[["Created", formatLifecycleDate(order.created_at)], ["Updated", formatLifecycleDate(order.updated_at)], ["Timeline Events", String(order.timeline?.length || 0)]]} language={language} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">{t("Status Timeline")}</h3>
            <div className="mt-4 space-y-3">
              {(order.timeline || []).map(event => <div key={event.id} className="grid grid-cols-[14px_1fr] gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-950">{t(String(event.event_type || "").replaceAll("_", " "))}</p>
                      <span className="text-xs font-bold text-slate-500">{formatLifecycleDate(event.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{event.description}</p>
                    {event.from_status || event.to_status ? <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">{event.from_status ? t(String(event.from_status).replaceAll("_", " ")) : "-"} {"->"} {event.to_status ? t(String(event.to_status).replaceAll("_", " ")) : "-"}</p> : null}
                  </div>
                </div>)}
              {!order.timeline?.length ? <EmptyState title="No lifecycle events" message="Timeline entries will appear after lifecycle actions." language={language} /> : null}
            </div>
          </div>
        </div>
      </div>
    </Panel>;
}
export function LifecycleInfo({
  label,
  value,
  language
}) {
  const t = text => tr(language, text);
  return <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t(label)}</span>
      <span className="text-right text-xs font-bold text-slate-800">{value || "-"}</span>
    </div>;
}
export function LifecycleCard({
  title,
  rows,
  language
}) {
  const t = text => tr(language, text);
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{t(title)}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => <LifecycleInfo key={label} label={label} value={value} language={language} />)}
      </div>
    </div>;
}
export function lifecycleActionsForStatus(status) {
  const actions = {
    draft: [{
      key: "cancel",
      label: "Cancel",
      tone: "bg-red-600 hover:bg-red-700"
    }],
    new: [{
      key: "assign",
      label: "Assign",
      tone: "bg-blue-700 hover:bg-blue-800"
    }, {
      key: "cancel",
      label: "Cancel",
      tone: "bg-red-600 hover:bg-red-700"
    }],
    pending: [{
      key: "assign",
      label: "Assign",
      tone: "bg-blue-700 hover:bg-blue-800"
    }, {
      key: "cancel",
      label: "Cancel",
      tone: "bg-red-600 hover:bg-red-700"
    }],
    assigned: [{
      key: "accept",
      label: "Accept",
      tone: "bg-emerald-600 hover:bg-emerald-700"
    }, {
      key: "pause",
      label: "On Hold",
      tone: "bg-orange-600 hover:bg-orange-700"
    }],
    accepted: [{
      key: "start",
      label: "Start",
      tone: "bg-blue-700 hover:bg-blue-800"
    }, {
      key: "pause",
      label: "On Hold",
      tone: "bg-orange-600 hover:bg-orange-700"
    }],
    in_progress: [{
      key: "waiting-parts",
      label: "Waiting Parts",
      tone: "bg-orange-600 hover:bg-orange-700"
    }, {
      key: "pause",
      label: "On Hold",
      tone: "bg-slate-700 hover:bg-slate-800"
    }, {
      key: "complete",
      label: "Complete",
      tone: "bg-emerald-600 hover:bg-emerald-700"
    }],
    waiting_for_parts: [{
      key: "resume",
      label: "Resume",
      tone: "bg-blue-700 hover:bg-blue-800"
    }],
    on_hold: [{
      key: "resume",
      label: "Resume",
      tone: "bg-blue-700 hover:bg-blue-800"
    }, {
      key: "cancel",
      label: "Cancel",
      tone: "bg-red-600 hover:bg-red-700"
    }],
    pending_supervisor_review: [{
      key: "approve",
      label: "Approve",
      tone: "bg-emerald-600 hover:bg-emerald-700"
    }, {
      key: "reject",
      label: "Reject",
      tone: "bg-red-600 hover:bg-red-700"
    }],
    approved: [{
      key: "close",
      label: "Close",
      tone: "bg-slate-950 hover:bg-slate-800"
    }]
  };
  return actions[status] || [];
}
export function formatLifecycleDate(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 19);
}
export function DocLabel({
  children
}) {
  return <div className="border-b border-r border-slate-950 bg-white px-2 py-2 text-center font-black">{children}</div>;
}
export function DocStatic({
  children,
  shaded = false
}) {
  return <div className={`min-h-10 border-b border-slate-950 px-2 py-2 text-center font-bold ${shaded ? "bg-slate-300" : "bg-white"}`}>{children}</div>;
}
export function DocSectionLabel({
  children
}) {
  return <div className="border-r-2 border-slate-950 bg-slate-200 px-3 py-2 text-center text-base font-black underline">{children}</div>;
}
export function DocBand({
  children
}) {
  return <div className="border-b border-slate-950 bg-slate-300 px-2 py-1.5 text-sm font-black italic">{children}</div>;
}
export function DocInput({
  value,
  onChange
}) {
  return <input className="h-full min-h-10 w-full border-b border-slate-950 bg-white px-2 text-center font-bold outline-none focus:bg-blue-50" value={value || ""} onChange={event => onChange(event.target.value)} />;
}
export function DocSelect({
  value,
  onChange,
  options
}) {
  return <select className="h-full min-h-10 w-full border-b border-slate-950 bg-white px-2 text-center font-bold outline-none focus:bg-blue-50" value={value || ""} onChange={event => onChange(event.target.value)}>
      <option value=""></option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>;
}
export function DocStackSelect({
  label,
  value,
  onChange,
  options,
  language
}) {
  return <div className="border-b-2 border-slate-950">
      <DocBand>{label}</DocBand>
      <select className="h-12 w-full bg-white px-2 text-center text-sm font-black outline-none focus:bg-blue-50" value={value || ""} onChange={event => onChange(event.target.value)}>
        <option value=""></option>
        {options.map(option => <option key={option} value={option}>{tr(language, option)}</option>)}
      </select>
    </div>;
}
export function DocTextarea({
  value,
  onChange,
  rows = 3,
  center = false
}) {
  return <textarea rows={rows} className={`w-full resize-none border-b border-slate-950 bg-white p-2 text-sm outline-none focus:bg-blue-50 ${center ? "text-center text-lg font-black" : ""}`} value={value || ""} onChange={event => onChange(event.target.value)} />;
}
export function NumberedMembersEditor({
  members,
  onChange,
  onAdd,
  options,
  addLabel
}) {
  return <div className="min-h-20 border-b border-slate-950 bg-white p-2">
      <div className="space-y-2">
        {members.map((member, index) => <div key={index} className="grid grid-cols-[42px_1fr] items-center gap-2">
            <div className="text-center text-sm font-black text-slate-950">{index + 1}.</div>
            <input className="border-b border-slate-200 px-2 py-1 text-sm font-bold text-slate-900 outline-none focus:border-blue-500" list={`appointed-members-${index}`} value={member} onChange={event => onChange(index, event.target.value)} />
            <datalist id={`appointed-members-${index}`}>
              {options.map(option => <option key={option} value={option} />)}
            </datalist>
          </div>)}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
        {addLabel}
      </button>
    </div>;
}
export function DocManualTimeRow({
  label,
  value,
  onChange
}) {
  const time = splitTime12(value);
  const updatePart = patch => onChange(joinTime12({
    ...time,
    ...patch
  }));
  return <div className="grid grid-cols-[110px_1fr] border-b border-slate-950">
      <div className="px-2 py-2 text-center font-black">{label}:</div>
      <div className="grid grid-cols-3 bg-white text-center font-bold">
        <select className="border-l border-slate-200 bg-white px-1 py-2 text-center outline-none focus:bg-blue-50" value={time.hour} onChange={event => updatePart({
        hour: event.target.value
      })}>
          {Array.from({
          length: 12
        }, (_, index) => String(index + 1).padStart(2, "0")).map(hour => <option key={hour} value={hour}>{hour}</option>)}
        </select>
        <select className="border-l border-slate-200 bg-white px-1 py-2 text-center outline-none focus:bg-blue-50" value={time.minute} onChange={event => updatePart({
        minute: event.target.value
      })}>
          {Array.from({
          length: 60
        }, (_, index) => String(index).padStart(2, "0")).map(minute => <option key={minute} value={minute}>{minute}</option>)}
        </select>
        <select className="border-l border-slate-200 bg-white px-1 py-2 text-center outline-none focus:bg-blue-50" value={time.period} onChange={event => updatePart({
        period: event.target.value
      })}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>;
}
export function DocDateRow({
  label,
  value,
  onChange
}) {
  return <div className="grid grid-cols-[110px_1fr] border-b border-slate-950">
      <div className="px-2 py-2 text-center font-black">{label}:</div>
      <input type="date" className="bg-white px-2 text-center font-bold outline-none focus:bg-blue-50" value={value || ""} onChange={event => onChange(event.target.value)} />
    </div>;
}
export function DocField({
  label,
  value,
  onChange,
  options,
  shaded = false
}) {
  return <div className="grid grid-cols-[220px_1fr] border-b border-slate-950">
      <div className={`border-r border-slate-950 px-2 py-2 text-center font-black ${shaded ? "bg-slate-300" : "bg-white"}`}>{label}:</div>
      <DocSelect value={value} onChange={onChange} options={options} />
    </div>;
}
export function DocBox({
  label,
  value,
  onChange,
  wide = false,
  shadedLabel = false
}) {
  return <div className={wide ? "border-b-2 border-slate-950" : "border-b border-slate-950"}>
      <div className={`border-b border-slate-950 px-2 py-1.5 text-sm font-black italic ${shadedLabel ? "bg-slate-300" : "bg-white"}`}>{label}</div>
      <textarea rows={wide ? 3 : 2} className="w-full resize-none bg-white p-2 outline-none focus:bg-blue-50" value={value || ""} onChange={event => onChange(event.target.value)} />
    </div>;
}
export function InventorySpareParts({
  items,
  onChange,
  onAdd,
  labels
}) {
  return <div className="border-b border-slate-950">
      <div className="border-b border-slate-950 bg-slate-300 px-2 py-1.5 text-sm font-black italic">{labels.title}</div>
      <div className="space-y-2 bg-white p-2">
        {items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_76px] gap-2">
            <input className="border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-500" placeholder={labels.part} value={item.name} onChange={event => onChange(index, {
          name: event.target.value
        })} />
            <input className="border border-slate-200 px-2 py-1 text-center text-xs font-bold outline-none focus:border-blue-500" type="number" min="0" placeholder={labels.qty} value={item.qty} onChange={event => onChange(index, {
          qty: Number(event.target.value)
        })} />
          </div>)}
        <button type="button" onClick={onAdd} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
          {labels.add}
        </button>
      </div>
    </div>;
}
