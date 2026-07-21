import { useState } from "react";

export function formatInterval(task) {
  if (task.source === "pm-plan") {
    const recurrence = String(task.recurrence_type || "Runtime Hours");
    const value = formatScheduleCell(task.interval_value);
    if (recurrence === "Runtime Hours") return `${value} HR`;
    if (recurrence === "Daily") return `${value} Days`;
    if (recurrence === "Weekly") return `${value} Weeks`;
    if (recurrence === "Monthly") return `${value} Months`;
    return `${value} ${recurrence}`;
  }
  const parts = [];
  if (Number(task.interval_hours || 0)) parts.push(`${formatScheduleCell(task.interval_hours)} HR`);
  if (Number(task.interval_days || 0)) parts.push(`${formatScheduleCell(task.interval_days)} Days`);
  return parts.join(" / ") || "-";
}

export function PreviousRecordsTable({
  records,
  canManage = false,
  onUpdateRecord
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    hours: "",
    date: ""
  });
  const [savingId, setSavingId] = useState(null);
  const startEdit = record => {
    setEditingId(record.id);
    setDraft({
      hours: record.hours ?? "",
      date: record.date || ""
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft({
      hours: "",
      date: ""
    });
  };
  const saveEdit = async record => {
    if (!record.id || !onUpdateRecord) return;
    setSavingId(record.id);
    await onUpdateRecord(record.id, {
      service_hours: Number(draft.hours || 0),
      service_date: draft.date || ""
    });
    setSavingId(null);
    cancelEdit();
  };
  return <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-[640px] w-full border-collapse text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="border border-slate-300 px-3 py-2 text-left">Maintenance Count</th>
            <th className="border border-slate-300 px-3 py-2 text-left">Previous Records</th>
            <th className="border border-slate-300 px-3 py-2 text-left">Date</th>
            {canManage ? <th className="border border-slate-300 px-3 py-2 text-left">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {records.map(record => {
          const editing = record.id && Number(editingId) === Number(record.id);
          return <tr key={`${record.id || record.count}-${record.hours}-${record.date}`}>
                <td className="border border-slate-300 px-3 py-2">{record.count}</td>
                <td className="border border-slate-300 px-3 py-2 font-black text-slate-950">
                  {editing ? <input type="number" min="0" value={draft.hours} onChange={event => setDraft({
                ...draft,
                hours: event.target.value
              })} className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /> : formatScheduleCell(record.hours)}
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {editing ? <input type="date" value={draft.date} onChange={event => setDraft({
                ...draft,
                date: event.target.value
              })} className="rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /> : record.date || "-"}
                </td>
                {canManage ? <td className="border border-slate-300 px-3 py-2">
                    {editing ? <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveEdit(record)} disabled={savingId === record.id} className="rounded-md bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-60">
                          {savingId === record.id ? "Saving" : "Save"}
                        </button>
                        <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:border-slate-300">
                          Cancel
                        </button>
                      </div> : record.id ? <button type="button" onClick={() => startEdit(record)} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        Edit
                      </button> : "-"}
                  </td> : null}
              </tr>;
        })}
          {!records.length ? <tr>
              <td colSpan={canManage ? 4 : 3} className="border border-slate-300 px-3 py-6 text-center text-slate-500">No previous readings recorded.</td>
            </tr> : null}
        </tbody>
      </table>
    </div>;
}

export function buildScheduleCategories(equipment) {
  const categories = equipment.reduce((acc, asset) => {
    const category = equipmentCategory(asset);
    const current = acc.get(category.key) || {
      ...category,
      count: 0
    };
    current.count += 1;
    acc.set(category.key, current);
    return acc;
  }, new Map());
  return [...categories.values()].sort((first, second) => equipmentTypeSortKey(first.label) - equipmentTypeSortKey(second.label) || first.label.localeCompare(second.label, undefined, {
    numeric: true,
    sensitivity: "base"
  }));
}

export function sortEquipmentByName(equipment) {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base"
  });
  return [...equipment].sort((first, second) => collator.compare(assetSortKey(first), assetSortKey(second)));
}

export function assetSortKey(asset) {
  return `${asset.name || ""} ${asset.asset_code || ""}`.replace(/\bM(\d+)\b/gi, (_, number) => `M${String(number).padStart(3, "0")}`);
}

export function equipmentCategory(asset) {
  const label = equipmentTypeLabel(asset);
  return {
    key: scheduleCategoryKey(label),
    label
  };
  const text = `${asset.name || ""} ${asset.asset_type || ""} ${asset.model || ""}`.toLowerCase();
  if (/(generator|genset|m0\d|\bm\d\b)/.test(text)) return {
    key: "generators",
    label: scheduleCategoryLabel("generators")
  };
  if (/(compressor|comp\b|air comp)/.test(text)) return {
    key: "compressors",
    label: scheduleCategoryLabel("compressors")
  };
  if (/(boiler|steam|غلا)/.test(text)) return {
    key: "boilers",
    label: scheduleCategoryLabel("boilers")
  };
  if (/(chiller|cooler|cooling|مبرد)/.test(text)) return {
    key: "chillers",
    label: scheduleCategoryLabel("chillers")
  };
  if (/(fan|blower|مروحة|مراوح)/.test(text)) return {
    key: "fans",
    label: scheduleCategoryLabel("fans")
  };
  return {
    key: "other",
    label: scheduleCategoryLabel("other")
  };
}

export function scheduleCategoryLabel(key) {
  const knownLabel = DEFAULT_EQUIPMENT_TYPE_ORDER.find(label => scheduleCategoryKey(label) === key);
  if (knownLabel) return knownLabel;
  if (String(key || "").startsWith("asset-type-")) return titleFromCategoryKey(key);
  const labels = {
    generators: "Generators / مولدات",
    compressors: "Compressors / كباسات",
    boilers: "Boilers / غلايات",
    chillers: "Chillers / مبردات",
    fans: "Fans / مراوح",
    other: "Other Equipment"
  };
  return labels[key] || labels.other;
}

function equipmentTypeLabel(asset) {
  const explicitType = String(asset.asset_type || "").trim();
  if (explicitType && !GENERIC_ASSET_TYPES.has(explicitType.toLowerCase())) {
    return canonicalEquipmentType(explicitType);
  }
  return canonicalEquipmentType(`${asset.name || ""} ${asset.model || ""} ${asset.category || ""}`);
}

function canonicalEquipmentType(value) {
  const text = String(value || "").trim();
  const normalized = text.toLowerCase();
  if (/(generator|genset|مولد|m0\d|\bm\d\b)/i.test(text)) return "Generator";
  if (/(compressor|comp\b|air comp|كباس)/i.test(text)) return "Compressor";
  if (/(pump|مضخ)/i.test(text)) return "Pump";
  if (/(engine|motor|محرك)/i.test(text)) return "Engine";
  if (/(chiller|cooler|cooling|مبرد)/i.test(text)) return "Chiller";
  if (/(boiler|steam|غلا)/i.test(text)) return "Boiler";
  if (/(fan|blower|مروحة|مراوح)/i.test(text)) return "Fan";
  return text && !GENERIC_ASSET_TYPES.has(normalized) ? text : "Other Equipment";
}

function scheduleCategoryKey(label) {
  return `asset-type-${String(label || "Other Equipment").trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function titleFromCategoryKey(key) {
  return String(key || "").replace(/^asset-type-/, "").split("-").filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function equipmentTypeSortKey(label) {
  const index = DEFAULT_EQUIPMENT_TYPE_ORDER.findIndex(item => item.toLowerCase() === String(label || "").toLowerCase());
  return index >= 0 ? index : DEFAULT_EQUIPMENT_TYPE_ORDER.length;
}

const DEFAULT_EQUIPMENT_TYPE_ORDER = ["Generator", "Engine", "Compressor", "Pump", "Chiller", "Boiler", "Fan", "Other Equipment"];
const GENERIC_ASSET_TYPES = new Set(["", "asset", "equipment", "component", "system", "site", "area / department"]);

export function previousRecordsForTask(task) {
  const records = Array.isArray(task.previous_records) ? task.previous_records : [];
  if (records.length) {
    return records.slice().sort((first, second) => {
      const firstKey = `${first.created_at || first.service_date || ""}-${first.id || ""}`;
      const secondKey = `${second.created_at || second.service_date || ""}-${second.id || ""}`;
      return firstKey.localeCompare(secondKey);
    }).map((record, index) => ({
      id: record.id,
      date: record.service_date || record.created_at?.slice(0, 10) || "",
      type: record.task_name || task.task_name,
      hours: record.service_hours,
      count: index + 1,
      source: "Previous Records"
    }));
  }
  if (Number(task.last_service_hours || 0)) {
    return [{
      date: task.last_service_date || "",
      type: task.task_name,
      hours: task.last_service_hours,
      count: 1,
      source: "PM Last Service"
    }];
  }
  return [];
}

export function buildMaintenanceHistory(asset, pmTasks, workOrders) {
  const pmLogs = pmTasks.flatMap(previousRecordsForTask);
  const orderLogs = workOrders.filter(order => order.status === "completed" || order.service_hours).map(order => ({
    date: order.due_date || order.scheduled_date || order.created_at?.slice(0, 10) || "",
    type: order.description || order.title,
    hours: order.service_hours || asset.current_hours,
    count: "",
    source: "Work Order"
  }));
  return [...pmLogs, ...orderLogs].sort((first, second) => String(second.date).localeCompare(String(first.date))).slice(0, 12);
}

export function formatScheduleCell(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : value;
}
