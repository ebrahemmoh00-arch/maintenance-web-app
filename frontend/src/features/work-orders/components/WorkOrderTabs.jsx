import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { StatusBadge } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { joinTime12, readFileAsDataUrl, splitTime12 } from "../utils/workOrderForms.js";
import { formatLifecycleDate } from "./WorkOrderDocumentParts.jsx";
import { SignaturePad } from "./WorkOrderMedia.jsx";
import { Trash2, UploadCloud } from "lucide-react";
import { Fragment } from "react";

export function WorkOrderActionButton({
  label,
  onClick,
  disabled,
  primary = false
}) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`h-11 rounded-xl px-4 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${primary ? "bg-blue-700 text-white hover:bg-blue-800" : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"}`}>
      {label}
    </button>;
}

export function WorkOrderQuickInfo({
  fields
}) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">Quick Information</h3>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">CMMS Summary</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {fields.map(([label, value]) => <div key={label} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
            <span className="truncate text-right text-sm font-black text-slate-950">{value}</span>
          </div>)}
      </div>
    </div>;
}

export function WorkOrderKpi({
  label,
  value,
  tone = "blue"
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100"
  };
  return <div className={`rounded-xl p-3 ring-1 ${tones[tone] || tones.blue}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>;
}

export function WorkOrderOverviewTab({
  form,
  update,
  updateStatus,
  status,
  selectedEquipment,
  selectedCustomer,
  photosBefore,
  photosAfter,
  updatePhotos,
  language
}) {
  const t = text => tr(language, text);
  return <div className="grid gap-5 2xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <ModernTextArea label="Work Description" value={form.task_description} onChange={value => update("task_description", value)} rows={5} />
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Current Status</p>
              <div className="mt-2"><StatusBadge value={status} language={language} /></div>
            </div>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-blue-500" value={form.status || ""} onChange={event => updateStatus ? updateStatus(event.target.value) : update("status", event.target.value)}>
              {["pending", "new", "assigned", "accepted", "in_progress", "on_hold", "waiting_for_parts", "completed", "pending_supervisor_review", "approved", "closed", "cancelled", "rejected", "overdue"].map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
            </select>
          </div>
          <div className="mt-5">
            <WorkOrderLifecycleProgress status={status} />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CompactPhotoUploader title={t("Before Maintenance Photos")} photos={photosBefore || []} onChange={photos => updatePhotos("before_photos", photos)} />
          <CompactPhotoUploader title={t("After Maintenance Photos")} photos={photosAfter || []} onChange={photos => updatePhotos("after_photos", photos)} />
        </div>
      </div>
      <div className="space-y-4">
        <label className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Type of maintenance")}</span>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500" value={form.maintenance_type || ""} onChange={event => update("maintenance_type", event.target.value)}>
            <option value="">{t("Select")}</option>
            {["Preventive Maintenance", "Corrective Maintenance", "Condition Based / Predictive", "Periodic / Time based", "Breakdown", "Inspection", "Service"].map(option => <option key={option} value={option}>{t(option)}</option>)}
          </select>
        </label>
        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">Summary</h3>
          <div className="mt-4 space-y-3">
            <SummaryLine label="Asset" value={selectedEquipment?.name || "-"} />
            <SummaryLine label="Location" value={selectedCustomer?.name || selectedEquipment?.location || "-"} />
            <SummaryLine label="Serial Number" value={selectedEquipment?.serial_number || form.serial_number || "-"} />
            <SummaryLine label="Runtime" value={`${Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0).toLocaleString()} h`} />
          </div>
        </div>
      </div>
    </div>;
}

export function WorkOrderLifecycleProgress({
  status
}) {
  const steps = ["new", "assigned", "accepted", "in_progress", "paused", "waiting_for_parts", "completed", "reviewed", "closed"];
  const aliases = {
    pending: "new",
    on_hold: "paused",
    pending_supervisor_review: "reviewed",
    approved: "reviewed"
  };
  const active = aliases[status] || status;
  const activeIndex = Math.max(steps.indexOf(active), 0);
  return <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[760px] items-center">
        {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return <Fragment key={step}>
              <div className="flex flex-col items-center gap-2">
                <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black ${isActive ? "bg-blue-700 text-white shadow-lg shadow-blue-200" : isDone ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {index + 1}
                </div>
                <span className={`whitespace-nowrap text-[11px] font-black uppercase tracking-[0.08em] ${isActive ? "text-blue-700" : "text-slate-500"}`}>{step.replaceAll("_", " ")}</span>
              </div>
              {index < steps.length - 1 ? <div className={`mx-2 h-1 flex-1 rounded-full ${index < activeIndex ? "bg-emerald-500" : "bg-slate-200"}`} /> : null}
            </Fragment>;
      })}
      </div>
    </div>;
}

export function WorkOrderChecklistTab({
  draft,
  setDraft,
  checklistProgress,
  form
}) {
  const update = (key, value) => setDraft(current => ({
    ...current,
    [key]: value
  }));
  const tasks = [form.task_description || "Work description confirmed", form.requirements || "Necessary requirements checked", "Safety and QHSE requirements reviewed", "Photos and completion evidence prepared"];
  return <div className="space-y-5">
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">Checklist Completion</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Work order completion requires 100% checklist confirmation.</p>
          </div>
          <p className="text-3xl font-black text-blue-700">{checklistProgress}%</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-700 transition-all" style={{
          width: `${checklistProgress}%`
        }} />
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map((task, index) => <div key={`${task}-${index}`} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[40px_1fr_180px_1fr]">
            <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300" checked={Boolean(draft.checklist_completed)} onChange={event => update("checklist_completed", event.target.checked)} />
            <p className="text-sm font-black text-slate-950">{task}</p>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" defaultValue="">
              <option value="">Result</option>
              <option>OK</option>
              <option>Needs action</option>
              <option>N/A</option>
            </select>
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Comments" />
          </div>)}
      </div>
    </div>;
}

export function WorkOrderLaborTab({
  form,
  update,
  draft,
  setDraft,
  duration,
  selectedEquipment,
  seniorTeamTechnician
}) {
  const updateDraft = (key, value) => setDraft(current => ({
    ...current,
    [key]: value
  }));
  return <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <ModernField label="Technician" value={seniorTeamTechnician?.name || "-"} readOnly />
        <div className="grid gap-3 sm:grid-cols-2">
          <ModernTimeField label="Start Time" value={form.start_time} onChange={value => update("start_time", value)} />
          <ModernTimeField label="Finish Time" value={form.finished_time} onChange={value => update("finished_time", value)} />
          <ModernDateField label="Start Date" value={form.start_date} onChange={value => update("start_date", value)} />
          <ModernDateField label="Finish Date" value={form.finished_date} onChange={value => update("finished_date", value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <WorkOrderKpi label="Break Time" value="0:00" tone="slate" />
          <WorkOrderKpi label="Working Hours" value={duration} />
          <WorkOrderKpi label="Downtime" value={duration} tone={duration === "0:00" ? "slate" : "red"} />
        </div>
      </div>
      <div className="space-y-4">
        <ModernField label="Runtime Reading" value={draft.runtime_reading} onChange={value => updateDraft("runtime_reading", value)} placeholder={String(selectedEquipment?.current_hours || form.service_hours || 0)} type="number" />
        <ModernTextArea label="Completion Notes" value={draft.completion_notes} onChange={value => updateDraft("completion_notes", value)} rows={4} />
        <ModernTextArea label="Failure Cause" value={draft.reason} onChange={value => updateDraft("reason", value)} rows={3} />
      </div>
    </div>;
}

export function WorkOrderPartsTab({
  items,
  inventory = [],
  onChange,
  onAdd,
  onRemove,
  total
}) {
  function selectedInventoryItem(item) {
    return inventory.find(part => Number(part.id) === Number(item.inventory_item_id)) || inventory.find(part => String(part.name || "").trim().toLowerCase() === String(item.name || "").trim().toLowerCase());
  }

  function chooseInventoryPart(index, itemId) {
    const part = inventory.find(row => Number(row.id) === Number(itemId));
    if (!part) {
      onChange(index, {
        inventory_item_id: "",
        name: "",
        part_number: "",
        code: "",
        warehouse: "",
        available: 0,
        unit: "",
        unit_cost: 0,
        total: 0
      });
      return;
    }
    onChange(index, {
      inventory_item_id: part.id,
      name: part.name,
      part_number: part.part_number || "",
      code: part.part_number || "",
      warehouse: part.location || "Inventory",
      available: Number(part.stock_quantity || 0),
      reserved: part.linked_work_order_title || "",
      unit: part.unit || "pcs",
      unit_cost: Number(part.unit_cost || part.cost || 0),
      qty: Math.max(Number(items[index]?.qty || 1), 1),
      total: Math.max(Number(items[index]?.qty || 1), 1) * Number(part.unit_cost || part.cost || 0)
    });
  }

  function updateQuantity(index, value) {
    const quantity = Math.max(Number(value || 0), 0);
    const item = items[index] || {};
    onChange(index, {
      qty: quantity,
      total: quantity * Number(item.unit_cost || item.cost || 0)
    });
  }

  return <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {["Part", "Code", "Warehouse", "Available", "Reserved", "Quantity Used", "Unit Cost", "Total", ""].map(header => <th key={header || "actions"} className="px-4 py-3">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => {
                const inventoryItem = selectedInventoryItem(item) || {};
                const available = Number(inventoryItem.stock_quantity ?? item.available ?? 0);
                const unitCost = Number(item.unit_cost || item.cost || 0);
                const rowTotal = Number(item.total || Number(item.qty || 0) * unitCost);
                return <tr key={index} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <select className="w-full min-w-[240px] rounded-lg border border-slate-200 px-3 py-2 font-bold outline-none focus:border-blue-500" value={item.inventory_item_id || inventoryItem.id || ""} onChange={event => chooseInventoryPart(index, event.target.value)}>
                      <option value="">Select spare part</option>
                      {inventory.map(part => <option key={part.id} value={part.id}>{part.name} ({Number(part.stock_quantity || 0)} {part.unit || "pcs"})</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.part_number || item.code || inventoryItem.part_number || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.warehouse || inventoryItem.location || "Inventory"}</td>
                  <td className={`px-4 py-3 font-black ${available <= 0 ? "text-red-600" : available <= Number(inventoryItem.minimum_quantity || 0) ? "text-orange-600" : "text-emerald-700"}`}>{available}</td>
                  <td className="px-4 py-3 text-slate-500">{item.reserved || inventoryItem.linked_work_order_title || "-"}</td>
                  <td className="px-4 py-3"><input type="number" min="0" max={available || undefined} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center font-black outline-none focus:border-blue-500" value={item.qty || 0} onChange={event => updateQuantity(index, event.target.value)} /></td>
                  <td className="px-4 py-3 text-slate-500">{unitCost.toLocaleString()}</td>
                  <td className="px-4 py-3 font-black text-slate-950">{rowTotal.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onRemove?.(index)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50" title="Remove part from work order">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>;
              })}
              {!items.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">No spare parts selected.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onAdd} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">Add Part</button>
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-950">Total Parts Cost: {total.toLocaleString()} EGP</div>
      </div>
      <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">Inventory integration status: linked to spare parts workflow.</div>
    </div>;
}

export function WorkOrderAttachmentsTab({
  form,
  updateSignature,
  labels
}) {
  const cards = ["PDF", "Excel", "Photos", "Manuals", "Videos", "Inspection Reports"];
  return <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => <div key={card} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">{card}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Attachment card</p>
              </div>
              <UploadCloud className="h-5 w-5 text-blue-700" />
            </div>
          </div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SignaturePad title="Technician Signature" value={form.signature_executor} onChange={value => updateSignature("signature_executor", value)} labels={labels} />
        <SignaturePad title="Supervisor Signature" value={form.signature_shift_engineer} onChange={value => updateSignature("signature_shift_engineer", value)} labels={labels} />
        <SignaturePad title="Manager Signature" value={form.signature_manager} onChange={value => updateSignature("signature_manager", value)} labels={labels} />
      </div>
    </div>;
}

export function WorkOrderHistoryTab({
  order
}) {
  const timeline = order?.timeline || [];
  const fallback = [["Created", order?.created_at], ["Assigned", order?.assigned_at], ["Accepted", order?.accepted_at], ["Started", order?.started_at], ["Paused", order?.paused_at], ["Waiting Parts", order?.waiting_parts_reason], ["Completed", order?.completed_at], ["Reviewed", order?.approved_at], ["Closed", order?.closed_at]].filter(([, value]) => value);
  const rows = timeline.length ? timeline.map(event => [event.event_type, event.created_at, event.actor_name, event.description]) : fallback.map(([label, value]) => [label, value, "", label]);
  return <div className="space-y-3">
      {rows.map(([label, date, user, description], index) => <div key={`${label}-${index}`} className="grid grid-cols-[16px_1fr] gap-3">
          <span className="mt-2 h-3 w-3 rounded-full bg-blue-700 shadow-[0_0_0_5px_rgba(37,99,235,0.12)]" />
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-950">{label}</p>
              <span className="text-xs font-bold text-slate-500">{formatLifecycleDate(date)}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{description || "Action recorded"}</p>
            {user ? <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-blue-700">{user}</p> : null}
          </div>
        </div>)}
      {!rows.length ? <EmptyState title="No history yet" message="Actions will appear here after the work order is saved and progressed." /> : null}
    </div>;
}

export function WorkOrderNotesTab({
  form,
  update,
  selectedEngineer
}) {
  const notes = [form.recommendation ? ["Recommendation", form.recommendation] : null, form.qhse_instructions ? ["QHSE", form.qhse_instructions] : null, form.site_preparation ? ["Site Preparation", form.site_preparation] : null].filter(Boolean);
  return <div className="space-y-5">
      <ModernTextArea label="Recommendation / Comment" value={form.recommendation} onChange={value => update("recommendation", value)} rows={4} />
      <div className="space-y-3">
        {notes.map(([title, comment], index) => <div key={`${title}-${index}`} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">{(selectedEngineer?.name || title).slice(0, 1)}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-slate-950">{selectedEngineer?.name || "System User"}</p>
                <span className="text-xs font-bold text-slate-400">Now</span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{comment}</p>
            </div>
          </div>)}
        {!notes.length ? <EmptyState title="No comments" message="Write a note above to document field observations." /> : null}
      </div>
    </div>;
}

export function CompactPhotoUploader({
  title,
  photos,
  onChange
}) {
  async function handleFiles(files) {
    const next = await Promise.all(Array.from(files).map(readFileAsDataUrl));
    onChange([...photos, ...next].slice(0, 6));
  }
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{photos.length} images</p>
        </div>
        <label className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
          Upload
          <input type="file" accept="image/*" multiple className="hidden" onChange={event => handleFiles(event.target.files || [])} />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {photos.map((photo, index) => <button key={index} type="button" onClick={() => window.open(photo, "_blank")} className="relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <img src={photo} alt="" className="h-20 w-full object-cover" />
            <span className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-slate-700">{index + 1}</span>
          </button>)}
        {!photos.length ? <div className="col-span-4 rounded-xl border border-dashed border-slate-300 bg-white py-5 text-center text-xs font-bold text-slate-500">Drag & drop area / no photos</div> : null}
      </div>
    </div>;
}

export function ModernField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  readOnly = false
}) {
  return <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input type={type} readOnly={readOnly} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 read-only:bg-slate-50" value={value || ""} placeholder={placeholder} onChange={event => onChange?.(event.target.value)} />
    </label>;
}

export function ModernTextArea({
  label,
  value,
  onChange,
  rows = 3
}) {
  return <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <textarea rows={rows} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-blue-500" value={value || ""} onChange={event => onChange(event.target.value)} />
    </label>;
}

export function ModernDateField({
  label,
  value,
  onChange
}) {
  return <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input type="date" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500" value={value || ""} onChange={event => onChange(event.target.value)} />
    </label>;
}

export function ModernTimeField({
  label,
  value,
  onChange
}) {
  const time = splitTime12(value);
  const updatePart = patch => onChange(joinTime12({
    ...time,
    ...patch
  }));
  return <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <select className="px-2 py-3 text-center text-sm font-bold outline-none" value={time.hour} onChange={event => updatePart({
        hour: event.target.value
      })}>
          {Array.from({
          length: 12
        }, (_, index) => String(index + 1).padStart(2, "0")).map(hour => <option key={hour} value={hour}>{hour}</option>)}
        </select>
        <select className="border-x border-slate-200 px-2 py-3 text-center text-sm font-bold outline-none" value={time.minute} onChange={event => updatePart({
        minute: event.target.value
      })}>
          {Array.from({
          length: 60
        }, (_, index) => String(index).padStart(2, "0")).map(minute => <option key={minute} value={minute}>{minute}</option>)}
        </select>
        <select className="px-2 py-3 text-center text-sm font-bold outline-none" value={time.period} onChange={event => updatePart({
        period: event.target.value
      })}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </label>;
}

export function SummaryLine({
  label,
  value
}) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <span className="truncate text-right text-sm font-black text-slate-950">{value}</span>
    </div>;
}
