import { useState } from "react";

export function formatInterval(task) {
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
  const order = ["generators", "compressors", "boilers", "chillers", "fans", "other"];
  const counts = equipment.reduce((acc, asset) => {
    const category = equipmentCategory(asset);
    acc[category.key] = (acc[category.key] || 0) + 1;
    return acc;
  }, {});
  return order.filter(key => counts[key]).map(key => ({
    key,
    label: scheduleCategoryLabel(key),
    count: counts[key]
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
