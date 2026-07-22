import { formatDate } from "../../../shared/i18n/index.js";
import { tr } from "../../../shared/config/appConfig.jsx";
import { BookOpen, FileText, Pencil, Plus, Save, Trash2 } from "lucide-react";

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
  onSelect,
  form,
  selectedTemplate,
  templateColumns,
  tableRows,
  savingMeasurement,
  canAddMeasurement,
  onSubmit,
  onFormChange,
  onCellChange,
  onAddRow,
  onRemoveRow,
  language
}) {
  const t = text => tr(language, text);
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
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Old Readings")}</p>
                  <h4 className="mt-1 text-lg font-black text-slate-950">{selectedGroup.name}</h4>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{selectedGroup.measurements.length} {t("Records")}</span>
              </div>
              <MeasurementHistory measurements={selectedGroup.measurements} language={language} />
            </div>

            {canAddMeasurement ? (
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
                    <MeasurementEntryTable columns={templateColumns} rows={tableRows} onCellChange={onCellChange} onAddRow={onAddRow} onRemoveRow={onRemoveRow} language={language} />
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
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
            {t("Create measurement types first, then select them from records.")}
          </div>
        )}
      </div>
    </div>
  );
}

export function MeasurementTemplateBuilder({
  templates,
  templateDraft,
  columnsText,
  savingTemplate,
  canCreateTemplate,
  canEditTemplate,
  canDeleteTemplate,
  onSubmit,
  onDraftChange,
  onColumnsChange,
  onGuidanceFile,
  onNew,
  onEdit,
  onDelete,
  language
}) {
  const t = text => tr(language, text);
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
          {templateDraft.guidance_file_name ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{templateDraft.guidance_file_name}</span> : null}
        </div>
        <div className="grid gap-3 xl:grid-cols-[1fr_1.15fr]">
          <div className="space-y-3">
            <AssetMeasureTextarea label={t("Description")} value={templateDraft.description} onChange={value => onDraftChange("description", value)} placeholder={t("Describe measurement purpose and how it is used.")} />
            <AssetMeasureTextarea label={t("Ideal Values / Manual Reference")} value={templateDraft.ideal_values} onChange={value => onDraftChange("ideal_values", value)} />
            <AssetMeasureTextarea label={t("Guidance Notes")} value={templateDraft.guidance_notes} onChange={value => onDraftChange("guidance_notes", value)} />
            <AssetMeasureInput label={t("Guidance Title")} value={templateDraft.guidance_title} onChange={value => onDraftChange("guidance_title", value)} />
            <AssetMeasureInput label={t("Guidance File URL")} value={templateDraft.guidance_file_url} onChange={value => onDraftChange("guidance_file_url", value)} />
            <label className="block rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-700" />{templateDraft.guidance_file_name || t("Upload Guidance File")}</span>
              <input type="file" className="mt-2 block w-full text-xs" onChange={event => onGuidanceFile(event.target.files?.[0])} />
            </label>
          </div>
          <MeasurementTableDesigner value={columnsText} onChange={onColumnsChange} language={language} />
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

function TemplateGuidance({ template, language }) {
  const t = text => tr(language, text);
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 text-emerald-700" />
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-950">{template.guidance_title || template.name}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{template.guidance_notes || template.description || t("No guidance notes configured.")}</p>
          {template.ideal_values ? <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700">{template.ideal_values}</p> : null}
          {template.guidance_file_url ? <a href={template.guidance_file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-black text-blue-700 hover:underline">{template.guidance_file_name || t("Open Guidance File")}</a> : null}
        </div>
      </div>
    </div>
  );
}

function MeasurementEntryTable({ columns, rows, onCellChange, onAddRow, onRemoveRow, language }) {
  const t = text => tr(language, text);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Measurement Table")}</p>
        <button type="button" onClick={onAddRow} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-black text-white">
          <Plus className="h-3.5 w-3.5" />
          {t("Add Row")}
        </button>
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
                  <button type="button" onClick={() => onRemoveRow(rowIndex)} className="rounded-md border border-red-100 px-2 py-1 font-black text-red-600 hover:bg-red-50">{t("Delete")}</button>
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

function MeasurementTableDesigner({ value, onChange, language }) {
  const t = text => tr(language, text);
  const columns = columnsTextToLabels(value);

  function updateColumn(index, nextValue) {
    onChange(columns.map((column, columnIndex) => columnIndex === index ? nextValue : column).join("\n"));
  }

  function addColumn() {
    onChange([...columns, `${t("Column")} ${columns.length + 1}`].join("\n"));
  }

  function removeColumn(index) {
    onChange(columns.filter((_, columnIndex) => columnIndex !== index).join("\n"));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Design Table")}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">{t("Add, rename, or remove table columns.")}</p>
        </div>
        <button type="button" onClick={addColumn} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-black text-white">
          <Plus className="h-3.5 w-3.5" />
          {t("Add Column")}
        </button>
      </div>

      <div className="mt-3 grid gap-2">
        {columns.map((column, index) => (
          <div key={`${index}-${column}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[11px] font-black text-blue-700">{index + 1}</span>
            <input value={column} onChange={event => updateColumn(index, event.target.value)} placeholder={t("Column Name")} className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white" />
            <button type="button" onClick={() => removeColumn(index)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-white text-red-600 hover:bg-red-50" title={t("Remove Column")}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!columns.length ? <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs font-bold text-slate-400">{t("No table columns yet.")}</div> : null}
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("Table Preview")}</div>
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              {columns.map((column, index) => <th key={`${column}-${index}`} className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">{column || t("Column Name")}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              {columns.map((column, index) => <td key={`${column}-${index}`} className="border-b border-slate-100 px-3 py-3 text-slate-300">--</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MeasurementHistory({ measurements, language }) {
  const t = text => tr(language, text);
  return (
    <div className="mt-5 space-y-2">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Measurement History")}</p>
      {measurements.map(item => {
        const table = parseMeasurementTable(item.measurement_table);
        return (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black text-slate-950">{item.measurement_type}</p>
              <span className="text-[11px] font-bold text-blue-700">{formatDate(item.reading_date || item.created_at, language)}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-600">{item.value} {item.unit || ""} {item.notes ? `- ${item.notes}` : ""}</p>
            {table.columns.length ? <CompactMeasurementTable table={table} /> : null}
          </div>
        );
      })}
      {!measurements.length ? <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400">{t("No measurements")}</p> : null}
    </div>
  );
}

function CompactMeasurementTable({ table }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-[11px]">
        <thead>
          <tr className="bg-slate-50">
            {table.columns.map(column => <th key={column.key} className="border-b border-slate-200 px-2 py-1.5 text-left font-black text-slate-500">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>
              {table.columns.map(column => <td key={column.key} className="border-b border-slate-100 px-2 py-1.5 font-semibold text-slate-700">{row[column.key] || "-"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function columnsTextToLabels(value) {
  return String(value || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
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

function parseMeasurementTable(value) {
  const parsed = safeJson(value, {});
  return {
    columns: Array.isArray(parsed.columns) ? parsed.columns : [],
    rows: Array.isArray(parsed.rows) ? parsed.rows : []
  };
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}
