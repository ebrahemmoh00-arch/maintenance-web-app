import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { todayIso } from "../../work-orders/utils/workOrderForms.js";
import { buildAssetBreadcrumb } from "../utils/assetHierarchy.js";
import { AssetMeasurementManager } from "./AssetMeasurementManager.jsx";
import { HistoryTimeline } from "./history/HistoryTimeline.jsx";
import { GitBranch, Trash2 } from "lucide-react";
import { useState } from "react";

export function AssetDetailsPanel({
  asset,
  rows,
  departments,
  workOrders,
  pmTasks,
  inventory,
  onEdit,
  onDelete,
  canManage,
  canEdit = canManage,
  canDelete = canManage,
  lifecycle = {},
  lifecycleLoading = false,
  lifecycleError = "",
  historyFilters = {},
  onHistoryFiltersChange,
  onHistoryPageChange,
  onHistoryRefresh,
  historyTechnicians = [],
  onAddLifecycleItem,
  canDeleteTimeline = false,
  onDeleteTimelineEntry,
  measurementTemplates = [],
  canManageMeasurementTemplates = false,
  canCreateMeasurementTemplate = false,
  canEditMeasurementTemplate = false,
  canDeleteMeasurementTemplate = false,
  onSaveMeasurementTemplate,
  onDeleteMeasurementTemplate,
  language
}) {
  const t = text => tr(language, text);
  const [activeTab, setActiveTab] = useState("overview");
  if (!asset) {
    return <Panel title="Asset Details" language={language}><EmptyState title="No equipment" message="Select an asset from the tree." language={language} /></Panel>;
  }
  const parent = rows.find(item => Number(item.id) === Number(asset.parent_id));
  const children = rows.filter(item => Number(item.parent_id) === Number(asset.id));
  const customer = departments.find(item => Number(item.id) === Number(asset.customer_id));
  const linkedOrders = workOrders.filter(item => Number(item.equipment_id) === Number(asset.id));
  const linkedPm = pmTasks.filter(item => Number(item.equipment_id) === Number(asset.id));
  const linkedParts = inventory.filter(item => String(item.location || "").toLowerCase().includes(String(asset.name || "").toLowerCase()) || Number(item.linked_work_order_id) && linkedOrders.some(order => Number(order.id) === Number(item.linked_work_order_id)));
  const breadcrumb = buildAssetBreadcrumb(asset, rows);
  const health = lifecycle.health || {};
  const healthScore = Number(health.health_score ?? 100);
  const costTotal = Number(health.maintenance_cost ?? Number(asset.total_maintenance_cost || 0) + Number(asset.spare_parts_cost || 0) + Number(asset.labor_cost || 0) + Number(asset.contractor_cost || 0));
  const timelineRows = lifecycle.timeline?.length ? lifecycle.timeline : lifecycle.history?.items || [];
  const statusText = health.health_status || asset.current_condition || "Excellent";
  return <Panel title="Asset Details" subtitle={breadcrumb.map(item => item.name).join(" / ")} language={language} actions={canManage ? <div className="flex gap-2">
          {canEdit ? <button type="button" onClick={() => onEdit(asset)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">{t("Edit Asset")}</button> : null}
          {canDelete ? <button type="button" onClick={() => onDelete(asset.id)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">{t("Delete")}</button> : null}
        </div> : null}>
      <div className="grid gap-4 lg:grid-cols-3">
        <AssetInfoTile label="Asset Code" value={asset.asset_code || `AST-${asset.id}`} language={language} />
        <AssetInfoTile label="Level" value={t(asset.asset_level || "Equipment")} language={language} />
        <AssetInfoTile label="Status" value={t(asset.status || "Active")} badge={<AssetHealthDot value={asset.status} />} language={language} />
        <AssetInfoTile label="Parent" value={parent?.name || (asset.asset_level === "Site" ? t("Root Site") : t("Not assigned"))} language={language} />
        <AssetInfoTile label="Location" value={asset.location || customer?.name || t("Not configured")} language={language} />
        <AssetInfoTile label="Criticality" value={t(asset.criticality || "Medium")} language={language} />
      </div>

      {lifecycleError ? <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
          {lifecycleError}
        </div> : null}

      <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {[{
      key: "overview",
      label: "Overview"
    }, {
      key: "measurements",
      label: "Measurements"
    }, {
      key: "history",
      label: "History"
    }].map(tab => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeTab === tab.key ? "bg-slate-950 text-white shadow-sm" : "bg-white text-slate-600 hover:text-slate-950"}`}>
            {t(tab.label)}
          </button>)}
      </div>

      {activeTab === "history" ? <div className="mt-5">
          <HistoryTimeline history={lifecycle.history} filters={historyFilters} onFiltersChange={onHistoryFiltersChange || (() => {})} onPageChange={onHistoryPageChange || (() => {})} onRefresh={onHistoryRefresh || (() => {})} technicians={historyTechnicians} loading={lifecycleLoading} language={language} />
        </div> : activeTab === "measurements" ? <div className="mt-5">
          <AssetMeasurementManager measurements={lifecycle.measurements || []} templates={measurementTemplates} onSaveMeasurement={onAddLifecycleItem ? payload => onAddLifecycleItem("measurement", payload) : null} onSaveTemplate={onSaveMeasurementTemplate} onDeleteTemplate={onDeleteMeasurementTemplate} canAddMeasurement={canEdit && Boolean(onAddLifecycleItem)} canManageTemplates={canManageMeasurementTemplates} canCreateTemplate={canCreateMeasurementTemplate} canEditTemplate={canEditMeasurementTemplate} canDeleteTemplate={canDeleteMeasurementTemplate} language={language} />
        </div> : <>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("Asset Health Score")}</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-black text-slate-950">{healthScore}</span>
                <span className="pb-2 text-sm font-black uppercase text-slate-500">/ 100</span>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${healthScore >= 80 ? "bg-emerald-50 text-emerald-700" : healthScore >= 60 ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"}`}>
              {statusText}
            </span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${healthScore >= 80 ? "bg-emerald-500" : healthScore >= 60 ? "bg-orange-500" : "bg-red-500"}`} style={{
            width: `${Math.max(Math.min(healthScore, 100), 0)}%`
          }} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AssetMiniMetric label="Availability" value={`${Number(health.availability ?? 100).toFixed(1)}%`} language={language} />
            <AssetMiniMetric label="MTBF" value={`${Number(health.mtbf ?? 0).toLocaleString()}h`} language={language} />
            <AssetMiniMetric label="MTTR" value={`${Number(health.mttr ?? 0).toLocaleString()}h`} language={language} />
            <AssetMiniMetric label="Downtime" value={`${Number(health.total_downtime_hours ?? 0).toLocaleString()}h`} language={language} />
            <AssetMiniMetric label="PM Compliance" value={`${Number(health.pm_compliance ?? 100).toFixed(0)}%`} language={language} />
            <AssetMiniMetric label="Open W.O." value={Number(health.open_work_orders ?? linkedOrders.length).toLocaleString()} language={language} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("Lifecycle Profile")}</p>
          <div className="mt-4 grid gap-3">
            <AssetDetailLine label="Manufacturer" value={asset.manufacturer} language={language} />
            <AssetDetailLine label="Model" value={asset.model} language={language} />
            <AssetDetailLine label="Serial Number" value={asset.serial_number} language={language} />
            <AssetDetailLine label="Category" value={asset.category || asset.asset_type} language={language} />
            <AssetDetailLine label="Site / Department" value={[asset.site || customer?.name, asset.department].filter(Boolean).join(" / ")} language={language} />
            <AssetDetailLine label="QR / Barcode" value={[asset.qr_code, asset.barcode].filter(Boolean).join(" / ")} language={language} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <AssetRelationList title="Lifecycle Dates" rows={[`${t("Installed")}: ${asset.installation_date || "-"}`, `${t("Commissioned")}: ${asset.commission_date || "-"}`, `${t("Warranty")}: ${asset.warranty_start || "-"} ${t("to")} ${asset.warranty_end || "-"}`, `${t("Expected Life")}: ${asset.expected_life_years || 0} ${t("years")}`]} empty="No lifecycle dates" language={language} />
        <AssetRelationList title="Operational Readings" rows={[`${t("Runtime Hours")}: ${Number(asset.current_hours || 0).toLocaleString()} ${t("hrs")}`, `${t("Last Reading")}: ${Number(asset.last_reading || 0).toLocaleString()}`, `${t("Current Reading")}: ${Number(asset.current_reading || 0).toLocaleString()}`, `${t("Last PM")}: ${asset.last_pm_date || asset.last_maintenance_date || "-"}`]} empty="No readings" language={language} />
        <AssetRelationList title="Cost Summary" rows={[`${t("Purchase Cost")}: ${Number(asset.purchase_cost || 0).toLocaleString()} EGP`, `${t("Replacement Cost")}: ${Number(asset.replacement_cost || 0).toLocaleString()} EGP`, `${t("Maintenance Cost")}: ${costTotal.toLocaleString()} EGP`, `${t("Parts / Labor / Contractors")}: ${Number(asset.spare_parts_cost || 0).toLocaleString()} / ${Number(asset.labor_cost || 0).toLocaleString()} / ${Number(asset.contractor_cost || 0).toLocaleString()} EGP`]} empty="No cost data" language={language} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <AssetRelationList title="Children" rows={children.map(item => `${item.asset_code || `AST-${item.id}`} - ${item.name}`)} empty="No child assets" language={language} />
        <AssetRelationList title="Linked Work Orders" rows={linkedOrders.map(item => `${item.title} (${t(item.status)})`)} empty="No linked work orders" language={language} />
        <AssetRelationList title="Preventive Maintenance" rows={linkedPm.map(item => `${item.task_name} - ${t(item.pm_alert || item.status)}`)} empty="No PM tasks" language={language} />
        <AssetRelationList title="Spare Parts" rows={linkedParts.map(item => `${item.part_number || "PART"} - ${item.name} (${item.stock_quantity} ${item.unit || t("pcs")})`)} empty="No linked spare parts" language={language} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AssetTimeline rows={timelineRows} loading={lifecycleLoading} canDelete={canDeleteTimeline} onDelete={onDeleteTimelineEntry} language={language} />
        <div className="space-y-4">
          <AssetRelationList title="Asset Events" rows={(lifecycle.events || []).map(item => `${t(item.event_type)} - ${t(item.severity)} - ${t(item.status)}`)} empty="No asset events" language={language} />
          <AssetRelationList title="Failure History" rows={(lifecycle.failures || []).map(item => `${item.failure_id} - ${t(item.severity)} - ${t(item.status)}`)} empty="No failure events" language={language} />
          <AssetRelationList title="Downtime History" rows={(lifecycle.downtime || []).map(item => `${item.start_time} - ${Number(item.total_downtime_minutes || 0)} ${t("min")} - ${t(item.downtime_category || "Downtime")}`)} empty="No downtime events" language={language} />
          <AssetRelationList title="Documents" rows={(lifecycle.documents || []).map(item => `${t(item.document_type)} - ${item.title}${item.file_url ? ` (${item.file_url})` : ""}`)} empty="No documents" language={language} />
          <AssetRelationList title="Photos" rows={(lifecycle.photos || []).map(item => `${t(item.photo_type)} - ${item.title}${item.file_url ? ` (${item.file_url})` : ""}`)} empty="No photos" language={language} />
        </div>
      </div>

      {canEdit && onAddLifecycleItem ? <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <AssetLifecycleForm type="document" title="Add Document" onSubmit={payload => onAddLifecycleItem("document", payload)} language={language} />
          <AssetLifecycleForm type="photo" title="Add Photo" onSubmit={payload => onAddLifecycleItem("photo", payload)} language={language} />
        </div> : null}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
          <GitBranch className="h-4 w-4 text-blue-700" />
          {t("Roll-up Logic")}
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {t("Component failures roll up to parent Equipment, then System. Reports can aggregate work orders, downtime, and PM exposure through this parent-child path.")}
        </p>
      </div>
      </>}
    </Panel>;
}

export function AssetMiniSelect({
  value,
  onChange,
  options,
  label,
  language
}) {
  const t = text => tr(language, text);
  return <label>
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{t(label)}</span>
      <select className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option || "all"} value={option}>{t(option || "All")}</option>)}
      </select>
    </label>;
}

export function AssetInfoTile({
  label,
  value,
  badge,
  language
}) {
  const t = text => tr(language, text);
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t(label)}</p>
      <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-950">{badge}{value || "-"}</div>
    </div>;
}

export function AssetRelationList({
  title,
  rows,
  empty,
  language
}) {
  const t = text => tr(language, text);
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{t(title)}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((item, index) => <div key={index} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{item}</div>)}
        {!rows.length ? <p className="text-sm font-semibold text-slate-400">{t(empty)}</p> : null}
      </div>
    </div>;
}

export function AssetMiniMetric({
  label,
  value,
  language
}) {
  const t = text => tr(language, text);
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{t(label)}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>;
}

export function AssetDetailLine({
  label,
  value,
  language
}) {
  const t = text => tr(language, text);
  return <div className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{t(label)}</span>
      <span className="max-w-[58%] text-right text-sm font-bold text-slate-800">{value || "-"}</span>
    </div>;
}

export function AssetTimeline({
  rows = [],
  loading = false,
  canDelete = false,
  onDelete,
  language
}) {
  const t = text => tr(language, text);
  const [deletingId, setDeletingId] = useState(null);

  async function deleteEntry(entryId) {
    if (!onDelete || !entryId) return;
    setDeletingId(entryId);
    await onDelete(entryId);
    setDeletingId(null);
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">{t("Asset Timeline")}</h3>
        {loading ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">{t("Loading")}</span> : null}
      </div>
      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
        {rows.map(item => <div key={`${item.id}-${item.created_at}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-950">{item.title || item.event_type}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.description || item.source_module || t("Asset lifecycle event")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">{t(item.event_type || "Event")}</span>
                {canDelete ? <button type="button" onClick={() => deleteEntry(item.id)} disabled={deletingId === item.id} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" title="Delete timeline entry">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button> : null}
              </div>
            </div>
            <p className="mt-2 text-xs font-bold text-blue-700">{item.created_at}</p>
          </div>)}
        {!rows.length ? <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400">{t("No timeline entries recorded yet.")}</p> : null}
      </div>
    </div>;
}

export function AssetLifecycleForm({
  type,
  title,
  onSubmit,
  language
}) {
  const t = text => tr(language, text);
  const initial = type === "measurement" ? {
    measurement_type: "Runtime Hours",
    value: "",
    unit: "hrs",
    reading_date: todayIso(),
    notes: ""
  } : type === "document" ? {
    document_type: "Manual",
    title: "",
    file_name: "",
    file_url: "",
    description: ""
  } : {
    photo_type: "Current Photo",
    title: "",
    file_name: "",
    file_url: "",
    description: ""
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  function update(key, value) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }
  async function submit(event) {
    event.preventDefault();
    if (type === "measurement" && (form.value === "" || Number(form.value) < 0)) return;
    if (type !== "measurement" && !String(form.title || "").trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        value: type === "measurement" ? Number(form.value) : form.value
      });
      setForm(initial);
    } finally {
      setSaving(false);
    }
  }
  return <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{t(title)}</h3>
      <div className="mt-3 space-y-2">
        {type === "measurement" ? <>
            <AssetFormInput label="Type" value={form.measurement_type} onChange={value => update("measurement_type", value)} language={language} />
            <AssetFormInput label="Value" type="number" value={form.value} onChange={value => update("value", value)} language={language} />
            <AssetFormInput label="Unit" value={form.unit} onChange={value => update("unit", value)} language={language} />
            <AssetFormInput label="Reading Date" type="date" value={form.reading_date} onChange={value => update("reading_date", value)} language={language} />
            <AssetFormInput label="Notes" value={form.notes} onChange={value => update("notes", value)} language={language} />
          </> : <>
            <AssetFormInput label={type === "document" ? "Document Type" : "Photo Type"} value={type === "document" ? form.document_type : form.photo_type} onChange={value => update(type === "document" ? "document_type" : "photo_type", value)} language={language} />
            <AssetFormInput label="Title" value={form.title} onChange={value => update("title", value)} language={language} />
            <AssetFormInput label="File Name" value={form.file_name} onChange={value => update("file_name", value)} language={language} />
            <AssetFormInput label="File URL" value={form.file_url} onChange={value => update("file_url", value)} language={language} />
            <AssetFormInput label="Description" value={form.description} onChange={value => update("description", value)} language={language} />
          </>}
      </div>
      <button type="submit" disabled={saving} className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-60">
        {saving ? t("Saving...") : t("Save")}
      </button>
    </form>;
}

export function AssetFormInput({
  label,
  value,
  onChange,
  type = "text",
  language
}) {
  const t = text => tr(language, text);
  return <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{t(label)}</span>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white" />
    </label>;
}

export function AssetHealthDot({
  value
}) {
  const status = String(value || "Active").toLowerCase();
  const color = status.includes("down") ? "bg-red-500" : status.includes("maintenance") || status.includes("warning") ? "bg-orange-500" : "bg-emerald-500";
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} title={value || "Active"} />;
}
