import { formatDate } from "../../../shared/i18n/index.js";
import { tr } from "../../../shared/config/appConfig.jsx";
import { MeasurementTableDesigner } from "./MeasurementTableDesigner.jsx";
import { formatGuidanceFileSize, parseGuidanceFiles } from "../utils/guidanceFiles.js";
import { parseMeasurementTableDesign } from "../utils/measurementTables.js";
import { jsPDF } from "jspdf";
import { BookOpen, Download, FileText, Pencil, Save, Trash2 } from "lucide-react";

export function MeasurementPanelCard({ active, icon, title, meta, description, disabled = false, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${active ? "bg-blue-700 text-white" : "bg-white text-blue-700"}`}>{icon}</span>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{meta}</span>
      </div>
      <h4 className="mt-3 text-sm font-black text-slate-950">{title}</h4>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </button>
  );
}

export function MeasurementRecordsPanel({
  groups,
  selectedGroup,
  selectedTypeKey,
  activeReadingPanel,
  onReadingPanelChange,
  onSelect,
  form,
  selectedTemplate,
  templateColumns,
  tableRows,
  savingMeasurement,
  canAddMeasurement,
  canDeleteMeasurement,
  canEditTemplate,
  onSubmit,
  onFormChange,
  onCellChange,
  onRemoveRow,
  onDeleteMeasurement,
  onEditTemplate,
  language
}) {
  const t = text => tr(language, text);
  const guidanceFiles = parseGuidanceFiles(selectedTemplate);
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Available Measurement Types")}</p>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">{groups.length}</span>
        </div>
        <div className="grid gap-2">
          {groups.map(group => (
            <button key={group.key} type="button" onClick={() => onSelect(group.key)} className={`rounded-xl border px-3 py-3 text-left transition ${selectedTypeKey === group.key ? "border-blue-300 bg-white shadow-sm" : "border-slate-200 bg-white/70 hover:border-blue-200 hover:bg-white"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">{group.name}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{group.template ? t("Template") : t("Custom Measurement")}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{group.measurements.length} {t("Records")}</span>
              </div>
            </button>
          ))}
          {!groups.length ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm font-bold text-slate-400">
              {t("No measurement types recorded yet.")}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {selectedGroup ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Selected Measurement Type")}</p>
                  <h4 className="mt-1 text-lg font-black text-slate-950">{selectedGroup.name}</h4>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{selectedGroup.measurements.length} {t("Records")}</span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <MeasurementActionCard active={activeReadingPanel === "add"} title={t("Add New Reading")} meta={canAddMeasurement ? t("Available") : t("View Only")} description={t("Open the entry form to record a new reading.")} disabled={!canAddMeasurement} onClick={() => onReadingPanelChange("add")} />
                <MeasurementActionCard active={activeReadingPanel === "old"} title={t("Old Readings")} meta={`${selectedGroup.measurements.length} ${t("Records")}`} description={t("Show previous registered readings for this measurement type.")} onClick={() => onReadingPanelChange("old")} />
                <MeasurementActionCard active={activeReadingPanel === "guidance"} title={t("Guidance Files")} meta={`${guidanceFiles.length} ${t("Files")}`} description={t("Open guidance files for this measurement type.")} disabled={!guidanceFiles.length} onClick={() => onReadingPanelChange("guidance")} />
              </div>
            </div>

            {activeReadingPanel === "guidance" ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Guidance Files")}</p>
                    <h4 className="mt-1 text-base font-black text-slate-950">{selectedGroup.name}</h4>
                  </div>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{guidanceFiles.length} {t("Files")}</span>
                </div>
                <GuidanceFilesList files={guidanceFiles} language={language} />
              </div>
            ) : null}

            {activeReadingPanel === "old" ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Old Readings")}</p>
                    <h4 className="mt-1 text-base font-black text-slate-950">{selectedGroup.name}</h4>
                  </div>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{selectedGroup.measurements.length} {t("Records")}</span>
                </div>
                <MeasurementHistory measurements={selectedGroup.measurements} canDeleteMeasurement={canDeleteMeasurement} onDeleteMeasurement={onDeleteMeasurement} language={language} />
              </div>
            ) : null}

            {activeReadingPanel === "add" && canAddMeasurement ? (
              <form onSubmit={onSubmit} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Add New Reading")}</p>
                {selectedTemplate ? (
                  <TemplateGuidance template={selectedTemplate} language={language} />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{t("Measurement Type")}</span>
                      <p className="text-xs font-black text-slate-950">{form.measurement_type || selectedGroup.name}</p>
                    </div>
                    <AssetMeasureInput label={t("Unit")} value={form.unit} onChange={value => onFormChange("unit", value)} />
                  </div>
                )}

                {selectedTemplate && templateColumns.length ? (
                  <div className="mt-3">
                    <MeasurementEntryTable columns={templateColumns} rows={tableRows} onCellChange={onCellChange} onRemoveRow={onRemoveRow} canEditTemplate={canEditTemplate} onEditTemplate={onEditTemplate} language={language} />
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <AssetMeasureInput label={t("Primary Reading")} type="number" value={form.value} onChange={value => onFormChange("value", value)} />
                  <AssetMeasureInput label={t("Reading Date")} type="date" value={form.reading_date} onChange={value => onFormChange("reading_date", value)} />
                  <AssetMeasureTextarea label={t("Notes")} value={form.notes} onChange={value => onFormChange("notes", value)} />
                </div>
                <button type="submit" disabled={savingMeasurement} className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-60">
                  {savingMeasurement ? t("Saving...") : t("Save Measurement")}
                </button>
              </form>
            ) : null}

            {!activeReadingPanel ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-400">
                {t("Choose Old Readings or Add New Reading to continue.")}
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
            {groups.length ? t("Select a measurement type to continue.") : t("Create measurement types first, then select them from records.")}
          </div>
        )}
      </div>
    </div>
  );
}

function MeasurementActionCard({ active, title, meta, description, disabled = false, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h5 className="text-sm font-black text-slate-950">{title}</h5>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">{meta}</span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </button>
  );
}

export function MeasurementTemplateBuilder({
  templates,
  templateDraft,
  tableDesign,
  savingTemplate,
  canCreateTemplate,
  canEditTemplate,
  canDeleteTemplate,
  onSubmit,
  onDraftChange,
  onTableDesignChange,
  onGuidanceFile,
  onRemoveGuidanceFile,
  onNew,
  onEdit,
  onDelete,
  language
}) {
  const t = text => tr(language, text);
  const guidanceFiles = parseGuidanceFiles(templateDraft);
  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Create New Measurement")}</p>
        {templateDraft.id ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">ID {templateDraft.id}</span> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <AssetMeasureInput label={t("Measurement Type Name")} value={templateDraft.name} onChange={value => onDraftChange("name", value)} required />
        <AssetMeasureInput label={t("Default Unit")} value={templateDraft.unit} onChange={value => onDraftChange("unit", value)} />
        <AssetMeasureInput label={t("Category")} value={templateDraft.category} onChange={value => onDraftChange("category", value)} />
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{t("Status")}</span>
          <select value={templateDraft.status} onChange={event => onDraftChange("status", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500">
            <option value="active">{t("Active")}</option>
            <option value="inactive">{t("Inactive")}</option>
          </select>
        </label>
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Measurement Definition")}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{t("Describe the measurement, design its table, and attach the guidance file in one place.")}</p>
          </div>
          {guidanceFiles.length ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{guidanceFiles.length} {t("Files")}</span> : null}
        </div>
        <div className="grid gap-3 xl:grid-cols-[1fr_1.15fr]">
          <div className="space-y-3">
            <AssetMeasureTextarea label={t("Description")} value={templateDraft.description} onChange={value => onDraftChange("description", value)} placeholder={t("Describe measurement purpose and how it is used.")} />
            <AssetMeasureTextarea label={t("Ideal Values / Manual Reference")} value={templateDraft.ideal_values} onChange={value => onDraftChange("ideal_values", value)} />
            <AssetMeasureTextarea label={t("Guidance Notes")} value={templateDraft.guidance_notes} onChange={value => onDraftChange("guidance_notes", value)} />
            <AssetMeasureInput label={t("Guidance Title")} value={templateDraft.guidance_title} onChange={value => onDraftChange("guidance_title", value)} />
            <label className="block rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-700" />{t("Upload Guidance Files")}</span>
              <input type="file" multiple className="mt-2 block w-full text-xs" onChange={event => {
                onGuidanceFile(event.target.files);
                event.target.value = "";
              }} />
            </label>
            <GuidanceFilesList files={guidanceFiles} onRemove={onRemoveGuidanceFile} language={language} />
          </div>
          <MeasurementTableDesigner value={tableDesign} onChange={onTableDesignChange} language={language} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={savingTemplate || (!templateDraft.id && !canCreateTemplate) || (templateDraft.id && !canEditTemplate)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Save className="h-4 w-4" />
          {savingTemplate ? t("Saving...") : t("Save Measurement Type")}
        </button>
        <button type="button" onClick={onNew} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:text-slate-950">
          {t("New Type")}
        </button>
      </div>

      {templates.length ? (
        <div className="mt-4 grid gap-2">
          {templates.map(template => (
            <div key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
              <div>
                <p className="text-xs font-black text-slate-950">{template.name}</p>
                <p className="text-[11px] font-semibold text-slate-500">{template.category || t("No category")} / {template.unit || t("No unit")}</p>
              </div>
              <div className="flex gap-2">
                {canEditTemplate ? <button type="button" onClick={() => onEdit(template)} className="rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50" title={t("Edit")}><Pencil className="h-4 w-4" /></button> : null}
                {canDeleteTemplate ? <button type="button" onClick={() => onDelete(template.id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title={t("Delete")}><Trash2 className="h-4 w-4" /></button> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}

export function MeasurementTemplateImportPanel({ templates = [], importingTemplateId = "", onImport, language }) {
  const t = text => tr(language, text);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Import Template")}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{t("Select a measurement template from another asset and copy it to this asset.")}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">{templates.length} {t("Available")}</span>
      </div>
      {templates.length ? (
        <div className="grid gap-2">
          {templates.map(template => (
            <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-950">{template.name}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  {template.category || t("No category")} / {template.unit || t("No unit")} / {template.source_asset_name || t("Unassigned asset")}
                </p>
              </div>
              <button type="button" disabled={String(importingTemplateId) === String(template.id)} onClick={() => onImport(template)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                <Download className="h-4 w-4" />
                {String(importingTemplateId) === String(template.id) ? t("Importing...") : t("Import")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-bold text-slate-400">
          {t("No templates available for import.")}
        </div>
      )}
    </div>
  );
}

function TemplateGuidance({ template, language }) {
  const t = text => tr(language, text);
  const guidanceFiles = parseGuidanceFiles(template);
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 text-emerald-700" />
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-950">{template.guidance_title || template.name}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{template.guidance_notes || template.description || t("No guidance notes configured.")}</p>
          {template.ideal_values ? <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700">{template.ideal_values}</p> : null}
          {guidanceFiles.length ? <p className="mt-2 text-[11px] font-black text-emerald-700">{guidanceFiles.length} {t("Guidance Files")}</p> : null}
        </div>
      </div>
    </div>
  );
}

function GuidanceFilesList({ files, onRemove, language }) {
  const t = text => tr(language, text);
  if (!files.length) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400">
        {t("No guidance files attached.")}
      </div>
    );
  }
  return (
    <div className="mt-3 grid gap-2">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-950">{file.name}</p>
              <p className="text-[11px] font-bold text-slate-500">{formatGuidanceFileSize(file.size) || file.type || t("Guidance File")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openGuidanceFile(file, language)} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700 hover:bg-blue-100">
              {t("Open File")}
            </button>
            {onRemove ? (
              <button type="button" onClick={() => onRemove(index)} className="rounded-lg border border-red-100 bg-white px-3 py-2 text-[11px] font-black text-red-600 hover:bg-red-50">
                {t("Remove File")}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function openGuidanceFile(file, language) {
  const tab = window.open("", "_blank");
  if (!tab) return;
  tab.opener = null;
  const openingText = escapeHtml(tr(language, "Opening file..."));
  const errorText = escapeHtml(tr(language, "Unable to open guidance file."));
  tab.document.write(`<!doctype html><html><head><title>${escapeHtml(file?.name || "Guidance File")}</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#f8fafc;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif}main{max-width:420px;border:1px solid #dbeafe;border-radius:16px;background:#fff;padding:28px;text-align:center;box-shadow:0 18px 45px rgba(15,23,42,.12)}p{margin:10px 0 0;color:#64748b;font-weight:700}</style></head><body><main><strong>${openingText}</strong><p>${escapeHtml(file?.name || "")}</p></main></body></html>`);
  tab.document.close();
  try {
    const source = String(file?.url || "");
    if (!source) throw new Error("Missing guidance file URL");
    if (source.startsWith("data:")) {
      const objectUrl = URL.createObjectURL(dataUrlToBlob(source));
      tab.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      return;
    }
    tab.location.href = source;
  } catch {
    tab.document.open();
    tab.document.write(`<!doctype html><html><head><title>${errorText}</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#fff5f5;color:#991b1b;font-family:Inter,Segoe UI,Arial,sans-serif}main{max-width:420px;border:1px solid #fecaca;border-radius:16px;background:#fff;padding:28px;text-align:center;box-shadow:0 18px 45px rgba(127,29,29,.12)}p{margin:10px 0 0;color:#7f1d1d;font-weight:700}</style></head><body><main><strong>${errorText}</strong><p>${escapeHtml(file?.name || "")}</p></main></body></html>`);
    tab.document.close();
  }
}

function dataUrlToBlob(dataUrl) {
  const [meta, content = ""] = String(dataUrl).split(",", 2);
  const mimeMatch = meta.match(/^data:([^;]+)(;base64)?/i);
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const isBase64 = Boolean(mimeMatch?.[2]);
  const binary = isBase64 ? atob(content) : decodeURIComponent(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function MeasurementEntryTable({ columns, rows, onCellChange, onRemoveRow, canEditTemplate = false, onEditTemplate, language }) {
  const t = text => tr(language, text);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Measurement Table")}</p>
        {canEditTemplate && onEditTemplate ? (
          <button type="button" onClick={onEditTemplate} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-black text-white">
            <Pencil className="h-3.5 w-3.5" />
            {t("Edit Template")}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-white text-slate-500">
              {columns.map(column => <th key={column.key} className="border-b border-slate-200 px-2 py-2 text-left font-black">{column.label}</th>)}
              <th className="border-b border-slate-200 px-2 py-2 text-right font-black">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(column => (
                  <td key={column.key} className="border-b border-slate-100 px-2 py-2">
                    <input value={row[column.key] || ""} onChange={event => onCellChange(rowIndex, column.key, event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white" />
                  </td>
                ))}
                <td className="border-b border-slate-100 px-2 py-2 text-right">
                  <button type="button" onClick={() => onRemoveRow(rowIndex)} title={t("Clear entered data only")} className="rounded-md border border-red-100 px-2 py-1 font-black text-red-600 hover:bg-red-50">{t("Delete")}</button>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={columns.length + 1} className="px-3 py-5 text-center font-bold text-slate-400">{t("No measurement rows")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MeasurementHistory({ measurements, canDeleteMeasurement = false, onDeleteMeasurement, language }) {
  const t = text => tr(language, text);
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Measurement History")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-500">{t("Reading Name")}</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-500">{t("Date")}</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-500">{t("Recorded By")}</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-500">{t("Options")}</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-3 py-3 font-black text-slate-950">{readingName(item)}</td>
                <td className="border-b border-slate-100 px-3 py-3 font-bold text-blue-700">{formatDate(item.reading_date || item.created_at, language)}</td>
                <td className="border-b border-slate-100 px-3 py-3 font-bold text-slate-600">{item.user_name || t("Unknown User")}</td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => openMeasurementReading(item, language)} className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 hover:bg-blue-100">
                      {t("Open")}
                    </button>
                    {canDeleteMeasurement ? (
                      <button type="button" onClick={() => onDeleteMeasurement?.(item.id)} className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-black text-red-600 hover:bg-red-100">
                        {t("Delete")}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => exportMeasurementReadingPdf(item, language)} className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 hover:bg-emerald-100">
                      {t("Export PDF")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!measurements.length ? <tr><td colSpan={4} className="px-3 py-5 text-center font-bold text-slate-400">{t("No measurements")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function readingName(item) {
  return item.measurement_type || `Reading #${item.id}`;
}

function openMeasurementReading(item, language) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.opener = null;
  const isArabic = language === "ar";
  const table = parseMeasurementTableDesign(item.measurement_table);
  const t = text => tr(language, text);
  const tableHtml = table.columns.length ? `
    <section>
      <h2>${escapeHtml(t("Measurement Table"))}</h2>
      <table>
        <thead>
          <tr>${table.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${table.rows.map(row => `<tr>${table.columns.map(column => `<td>${escapeHtml(row[column.key] || "-")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </section>
  ` : "";
  win.document.write(`
    <!doctype html>
    <html lang="${isArabic ? "ar" : "en"}" dir="${isArabic ? "rtl" : "ltr"}">
      <head>
        <title>${escapeHtml(readingName(item))}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 0; background: #f1f5f9; color: #0f172a; font-family: Inter, Segoe UI, Arial, sans-serif; }
          main { max-width: 980px; margin: 32px auto; padding: 0 20px; }
          .card { background: #fff; border: 1px solid #dbe3ef; border-radius: 18px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); overflow: hidden; }
          header { padding: 24px; border-bottom: 1px solid #e2e8f0; }
          h1 { margin: 0; font-size: 28px; line-height: 1.2; }
          h2 { margin: 0 0 12px; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; color: #1d4ed8; }
          .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
          .field { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; }
          .label { display: block; margin-bottom: 5px; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
          .value { font-size: 14px; font-weight: 800; color: #0f172a; }
          section { padding: 20px 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #dbe3ef; padding: 10px; text-align: start; vertical-align: top; }
          th { background: #eff6ff; color: #1e3a8a; font-weight: 900; }
          .notes { white-space: pre-wrap; line-height: 1.7; color: #334155; font-weight: 700; }
        </style>
      </head>
      <body>
        <main>
          <div class="card">
            <header>
              <h1>${escapeHtml(readingName(item))}</h1>
            </header>
            <div class="meta">
              <div class="field"><span class="label">${escapeHtml(t("Measurement Type"))}</span><span class="value">${escapeHtml(item.measurement_type || "-")}</span></div>
              <div class="field"><span class="label">${escapeHtml(t("Date"))}</span><span class="value">${escapeHtml(formatDate(item.reading_date || item.created_at, language))}</span></div>
              <div class="field"><span class="label">${escapeHtml(t("Recorded By"))}</span><span class="value">${escapeHtml(item.user_name || t("Unknown User"))}</span></div>
              <div class="field"><span class="label">${escapeHtml(t("Primary Reading"))}</span><span class="value">${escapeHtml(`${item.value ?? "-"} ${item.unit || ""}`.trim())}</span></div>
            </div>
            ${tableHtml}
            <section>
              <h2>${escapeHtml(t("Notes"))}</h2>
              <div class="notes">${escapeHtml(item.notes || "-")}</div>
            </section>
          </div>
        </main>
      </body>
    </html>
  `);
  win.document.close();
}

function exportMeasurementReadingPdf(item, language) {
  const table = parseMeasurementTableDesign(item.measurement_table);
  const orientation = table.columns.length > 5 ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation });
  const t = text => tr(language, text);
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function ensure(height) {
    if (y + height <= pageHeight - margin) return;
    doc.addPage("a4", orientation);
    y = margin;
  }

  function drawText(text, x, top, width, options = {}) {
    const lines = doc.splitTextToSize(String(text || "-"), width);
    doc.text(lines, x, top, options);
    return lines.length * 4.4;
  }

  doc.setFillColor(239, 246, 255);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(t("Measurement Reading Report"), margin, 13);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${t("Generated")}: ${formatDate(new Date(), language)}`, margin, 20);
  y = 36;

  const fields = [
    [t("Reading Name"), readingName(item)],
    [t("Measurement Type"), item.measurement_type || "-"],
    [t("Date"), formatDate(item.reading_date || item.created_at, language)],
    [t("Recorded By"), item.user_name || t("Unknown User")],
    [t("Primary Reading"), `${item.value ?? "-"} ${item.unit || ""}`.trim()]
  ];
  const fieldWidth = (contentWidth - 6) / 2;
  fields.forEach(([label, value], index) => {
    const x = margin + (index % 2) * (fieldWidth + 6);
    if (index > 0 && index % 2 === 0) y += 18;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, fieldWidth, 14, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 3, y + 5);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    drawText(value, x + 3, y + 10, fieldWidth - 6);
  });
  y += 24;

  if (table.columns.length) {
    ensure(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text(t("Measurement Table"), margin, y);
    y += 6;
    drawPdfTable(doc, table, { margin, y, pageWidth, pageHeight, contentWidth, orientation });
    y = doc.lastAutoY || y;
  }

  ensure(28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text(t("Notes"), margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  drawText(item.notes || "-", margin, y, contentWidth);

  doc.save(`${safeFileName(readingName(item))}-${safeFileName(item.reading_date || item.created_at || "reading")}.pdf`);
}

function drawPdfTable(doc, table, config) {
  const { margin, pageWidth, pageHeight, contentWidth, orientation } = config;
  let y = config.y;
  const columnWidth = contentWidth / Math.max(table.columns.length, 1);
  const tableWidth = columnWidth * table.columns.length;
  const startX = margin;

  function ensure(height) {
    if (y + height <= pageHeight - margin) return;
    doc.addPage("a4", orientation);
    y = margin;
    drawHeader();
  }

  function drawHeader() {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(30, 64, 175);
    let x = startX;
    table.columns.forEach(column => {
      doc.rect(x, y, columnWidth, 9, "FD");
      const lines = doc.splitTextToSize(String(column.label || "-"), columnWidth - 3);
      doc.text(lines.slice(0, 2), x + 1.5, y + 3.5);
      x += columnWidth;
    });
    y += 9;
  }

  drawHeader();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  table.rows.forEach(row => {
    const cellLines = table.columns.map(column => doc.splitTextToSize(String(row[column.key] || "-"), columnWidth - 3));
    const rowHeight = Math.max(8, Math.max(...cellLines.map(lines => lines.length * 3.5 + 3)));
    ensure(rowHeight);
    let x = startX;
    cellLines.forEach(lines => {
      doc.setDrawColor(226, 232, 240);
      doc.rect(x, y, columnWidth, rowHeight);
      doc.text(lines, x + 1.5, y + 4);
      x += columnWidth;
    });
    y += rowHeight;
  });
  if (!table.rows.length) {
    doc.rect(startX, y, tableWidth, 8);
    doc.text("-", startX + 2, y + 5);
    y += 8;
  }
  doc.lastAutoY = y + 4;
}

function safeFileName(value) {
  return String(value || "measurement-reading").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "measurement-reading";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function AssetMeasureInput({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input type={type} value={value ?? ""} required={required} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white" />
    </label>
  );
}

function AssetMeasureTextarea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <textarea value={value ?? ""} placeholder={placeholder} rows={3} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500" />
    </label>
  );
}
