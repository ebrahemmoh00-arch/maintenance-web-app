import { tr } from "../../../shared/config/appConfig.jsx";
import { todayIso } from "../../work-orders/utils/workOrderForms.js";
import { MeasurementPanelCard, MeasurementRecordsPanel, MeasurementTemplateBuilder } from "./AssetMeasurementPanels.jsx";
import { ClipboardList, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EMPTY_TEMPLATE = {
  name: "",
  description: "",
  category: "",
  unit: "",
  table_schema: "[]",
  guidance_title: "",
  guidance_file_name: "",
  guidance_file_url: "",
  guidance_notes: "",
  ideal_values: "",
  status: "active"
};

const EMPTY_MEASUREMENT = {
  template_id: "",
  measurement_type: "",
  value: "",
  unit: "",
  reading_date: todayIso(),
  notes: ""
};

export function AssetMeasurementManager({
  measurements = [],
  templates = [],
  onSaveMeasurement,
  onSaveTemplate,
  onDeleteTemplate,
  canManageTemplates = false,
  canAddMeasurement = true,
  canCreateTemplate = false,
  canEditTemplate = false,
  canDeleteTemplate = false,
  language
}) {
  const t = text => tr(language, text);
  const activeTemplates = useMemo(() => templates.filter(template => String(template.status || "active").toLowerCase() === "active"), [templates]);
  const measurementGroups = useMemo(() => buildMeasurementGroups(measurements, activeTemplates), [measurements, activeTemplates]);
  const [activePanel, setActivePanel] = useState("records");
  const [selectedTypeKey, setSelectedTypeKey] = useState("");
  const [form, setForm] = useState(EMPTY_MEASUREMENT);
  const [tableRows, setTableRows] = useState([]);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(EMPTY_TEMPLATE);
  const [columnsText, setColumnsText] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const selectedTemplate = activeTemplates.find(template => String(template.id) === String(form.template_id));
  const selectedGroup = measurementGroups.find(group => group.key === selectedTypeKey) || measurementGroups[0] || null;
  const templateColumns = useMemo(() => columnsFromTemplate(selectedTemplate), [selectedTemplate]);

  useEffect(() => {
    if (!measurementGroups.length) {
      if (selectedTypeKey) setSelectedTypeKey("");
      return;
    }
    if (!measurementGroups.some(group => group.key === selectedTypeKey)) {
      setSelectedTypeKey(measurementGroups[0].key);
    }
  }, [measurementGroups, selectedTypeKey]);

  useEffect(() => {
    if (!selectedGroup) return;
    const latestReading = selectedGroup.measurements[0] || {};
    if (!selectedGroup.template) setTableRows([]);
    setForm(current => ({
      ...current,
      template_id: selectedGroup.template?.id || "",
      measurement_type: selectedGroup.name,
      unit: selectedGroup.template?.unit || latestReading.unit || current.unit || "",
      value: ""
    }));
  }, [selectedGroup?.key]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setForm(current => ({
      ...current,
      measurement_type: selectedTemplate.name,
      unit: selectedTemplate.unit || current.unit || "",
      value: ""
    }));
    setTableRows(templateColumns.length ? [emptyTableRow(templateColumns)] : []);
  }, [selectedTemplate, templateColumns]);

  function updateForm(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function updateTableCell(rowIndex, columnKey, value) {
    setTableRows(current => current.map((row, index) => index === rowIndex ? { ...row, [columnKey]: value } : row));
  }

  function addTableRow() {
    setTableRows(current => [...current, emptyTableRow(templateColumns)]);
  }

  function removeTableRow(rowIndex) {
    setTableRows(current => current.filter((_, index) => index !== rowIndex));
  }

  async function submitMeasurement(event) {
    event.preventDefault();
    const measurementType = String(form.measurement_type || selectedTemplate?.name || "").trim();
    if (!measurementType) return;
    if (!selectedTemplate && form.value === "") return;
    setSavingMeasurement(true);
    try {
      await onSaveMeasurement({
        ...form,
        template_id: form.template_id ? Number(form.template_id) : null,
        measurement_type: measurementType,
        value: form.value === "" ? 0 : Number(form.value),
        unit: form.unit || selectedTemplate?.unit || "",
        measurement_table: templateColumns.length ? JSON.stringify({ columns: templateColumns, rows: tableRows }) : "",
        table_snapshot: selectedTemplate ? JSON.stringify(selectedTemplate) : ""
      });
      setForm(current => ({
        ...EMPTY_MEASUREMENT,
        template_id: selectedGroup?.template?.id || "",
        measurement_type: selectedGroup?.name || "",
        unit: selectedGroup?.template?.unit || current.unit || ""
      }));
      setTableRows(templateColumns.length ? [emptyTableRow(templateColumns)] : []);
    } finally {
      setSavingMeasurement(false);
    }
  }

  function editTemplate(template) {
    const columns = columnsFromTemplate(template);
    setTemplateDraft({ ...EMPTY_TEMPLATE, ...template });
    setColumnsText(columns.map(column => column.label).join("\n"));
    setActivePanel("create");
  }

  async function submitTemplate(event) {
    event.preventDefault();
    if (!String(templateDraft.name || "").trim()) return;
    setSavingTemplate(true);
    try {
      const saved = await onSaveTemplate({
        ...templateDraft,
        table_schema: JSON.stringify(columnsTextToSchema(columnsText))
      }, templateDraft.id || null);
      setTemplateDraft(EMPTY_TEMPLATE);
      setColumnsText("");
      if (saved?.id) setSelectedTypeKey(`template-${saved.id}`);
      setActivePanel("records");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function deleteTemplate(templateId) {
    if (!onDeleteTemplate || !templateId) return;
    await onDeleteTemplate(templateId);
    if (String(form.template_id) === String(templateId)) {
      setForm(EMPTY_MEASUREMENT);
      setTableRows([]);
    }
  }

  function updateTemplateDraft(key, value) {
    setTemplateDraft(current => ({ ...current, [key]: value }));
  }

  function handleGuidanceFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTemplateDraft(current => ({
        ...current,
        guidance_file_name: file.name,
        guidance_file_url: String(reader.result || "")
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{t("Measurements")}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{t("Create structured readings using user-defined measurement templates.")}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MeasurementPanelCard active={activePanel === "records"} icon={<ClipboardList className="h-5 w-5" />} title={t("Measurement Records")} meta={`${measurementGroups.length} ${t("Measurement Types")}`} description={t("Open old readings and add readings for the selected measurement type.")} onClick={() => setActivePanel("records")} />
        <MeasurementPanelCard active={activePanel === "create"} icon={<Plus className="h-5 w-5" />} title={t("Create New Measurement")} meta={canManageTemplates ? t("Admin controlled") : t("Admin Only")} description={t("Create a reusable measurement type with its own table and guidance.")} disabled={!canManageTemplates} onClick={() => canManageTemplates && setActivePanel("create")} />
      </div>

      {activePanel === "create" ? (
        canManageTemplates ? (
          <MeasurementTemplateBuilder templates={templates} templateDraft={templateDraft} columnsText={columnsText} savingTemplate={savingTemplate} canCreateTemplate={canCreateTemplate} canEditTemplate={canEditTemplate} canDeleteTemplate={canDeleteTemplate} onSubmit={submitTemplate} onDraftChange={updateTemplateDraft} onColumnsChange={setColumnsText} onGuidanceFile={handleGuidanceFile} onNew={() => {
            setTemplateDraft(EMPTY_TEMPLATE);
            setColumnsText("");
          }} onEdit={editTemplate} onDelete={deleteTemplate} language={language} />
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">{t("Admin permission is required to create measurement types.")}</div>
        )
      ) : (
        <MeasurementRecordsPanel groups={measurementGroups} selectedGroup={selectedGroup} selectedTypeKey={selectedTypeKey} onSelect={setSelectedTypeKey} form={form} selectedTemplate={selectedTemplate} templateColumns={templateColumns} tableRows={tableRows} savingMeasurement={savingMeasurement} canAddMeasurement={canAddMeasurement && Boolean(onSaveMeasurement) && Boolean(selectedGroup)} onSubmit={submitMeasurement} onFormChange={updateForm} onCellChange={updateTableCell} onAddRow={addTableRow} onRemoveRow={removeTableRow} language={language} />
      )}
    </div>
  );
}

function buildMeasurementGroups(measurements, templates) {
  const groups = new Map();
  const templateNames = new Map();

  templates.forEach(template => {
    const key = `template-${template.id}`;
    groups.set(key, {
      key,
      name: template.name,
      template,
      measurements: []
    });
    templateNames.set(normalizeMeasurementName(template.name), key);
  });

  measurements.forEach(measurement => {
    const templateKey = measurement.template_id ? `template-${measurement.template_id}` : "";
    const nameKey = templateNames.get(normalizeMeasurementName(measurement.measurement_type));
    const key = groups.has(templateKey) ? templateKey : nameKey || `custom-${normalizeMeasurementName(measurement.measurement_type)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: measurement.measurement_type || "Custom Measurement",
        template: null,
        measurements: []
      });
    }
    groups.get(key).measurements.push(measurement);
  });

  return [...groups.values()].map(group => ({
    ...group,
    measurements: [...group.measurements].sort((a, b) => String(b.reading_date || b.created_at || "").localeCompare(String(a.reading_date || a.created_at || "")))
  })).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeMeasurementName(value) {
  return String(value || "custom").trim().toLowerCase().replace(/\s+/g, "-");
}

function columnsFromTemplate(template) {
  if (!template) return [];
  const parsed = safeJson(template.table_schema, []);
  return Array.isArray(parsed) ? parsed.filter(column => column?.key && column?.label) : [];
}

function columnsTextToSchema(text) {
  return String(text || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean).map((label, index) => ({
    key: `col_${index + 1}_${slug(label)}`,
    label,
    type: "text"
  }));
}

function emptyTableRow(columns) {
  return columns.reduce((row, column) => ({ ...row, [column.key]: "" }), {});
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function slug(value) {
  return String(value || "value").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "value";
}
