import { tr } from "../../../shared/config/appConfig.jsx";
import { todayIso } from "../../work-orders/utils/workOrderForms.js";
import { MeasurementPanelCard, MeasurementRecordsPanel, MeasurementTemplateBuilder, MeasurementTemplateImportPanel } from "./AssetMeasurementPanels.jsx";
import { EMPTY_TABLE_DESIGN, emptyTableRow, normalizeMeasurementTableDesign, parseMeasurementTableDesign, serializeMeasurementTableDesign } from "../utils/measurementTables.js";
import { guidanceFileNames, parseGuidanceFiles, readGuidanceFiles, serializeGuidanceFiles } from "../utils/guidanceFiles.js";
import { ClipboardList, Download, Plus } from "lucide-react";
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
  importableTemplates = [],
  onSaveMeasurement,
  onDeleteMeasurement,
  onSaveTemplate,
  onDeleteTemplate,
  onImportTemplate,
  canManageTemplates = false,
  canAddMeasurement = true,
  canDeleteMeasurement = false,
  canCreateTemplate = false,
  canEditTemplate = false,
  canDeleteTemplate = false,
  language
}) {
  const t = text => tr(language, text);
  const activeTemplates = useMemo(() => templates.filter(template => String(template.status || "active").toLowerCase() === "active"), [templates]);
  const availableImportTemplates = useMemo(() => importableTemplates.filter(template => String(template.status || "active").toLowerCase() === "active"), [importableTemplates]);
  const measurementGroups = useMemo(() => buildMeasurementGroups(measurements, activeTemplates), [measurements, activeTemplates]);
  const [activePanel, setActivePanel] = useState("records");
  const [selectedTypeKey, setSelectedTypeKey] = useState("");
  const [activeReadingPanel, setActiveReadingPanel] = useState("");
  const [form, setForm] = useState(EMPTY_MEASUREMENT);
  const [tableRows, setTableRows] = useState([]);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(EMPTY_TEMPLATE);
  const [tableDesign, setTableDesign] = useState(EMPTY_TABLE_DESIGN);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [importingTemplateId, setImportingTemplateId] = useState("");
  const selectedTemplate = activeTemplates.find(template => String(template.id) === String(form.template_id));
  const selectedGroup = measurementGroups.find(group => group.key === selectedTypeKey) || null;
  const selectedTemplateDesign = useMemo(() => templateDesignFromTemplate(selectedTemplate), [selectedTemplate]);
  const templateColumns = selectedTemplateDesign.columns;

  useEffect(() => {
    if (!measurementGroups.length) {
      if (selectedTypeKey) setSelectedTypeKey("");
      return;
    }
    if (!measurementGroups.some(group => group.key === selectedTypeKey)) {
      setSelectedTypeKey("");
    }
  }, [measurementGroups, selectedTypeKey]);

  useEffect(() => {
    setActiveReadingPanel("");
  }, [selectedTypeKey]);

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
    setTableRows(templateColumns.length ? measurementRowsFromTemplate(selectedTemplateDesign) : []);
  }, [selectedTemplate, selectedTemplateDesign]);

  function updateForm(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function updateTableCell(rowIndex, columnKey, value) {
    setTableRows(current => current.map((row, index) => index === rowIndex ? { ...row, [columnKey]: value } : row));
  }

  function removeTableRow(rowIndex) {
    const templateRows = measurementRowsFromTemplate(selectedTemplateDesign);
    setTableRows(current => current.map((row, index) => {
      if (index !== rowIndex) return row;
      return templateRows[rowIndex] ? { ...templateRows[rowIndex] } : emptyTableRow(templateColumns);
    }));
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
        measurement_table: templateColumns.length ? serializeMeasurementTableDesign({ columns: templateColumns, rows: tableRows }) : "",
        table_snapshot: selectedTemplate ? JSON.stringify(selectedTemplate) : ""
      });
      setForm(current => ({
        ...EMPTY_MEASUREMENT,
        template_id: selectedGroup?.template?.id || "",
        measurement_type: selectedGroup?.name || "",
        unit: selectedGroup?.template?.unit || current.unit || ""
      }));
      setTableRows(templateColumns.length ? measurementRowsFromTemplate(selectedTemplateDesign) : []);
    } finally {
      setSavingMeasurement(false);
    }
  }

  function editTemplate(template) {
    const design = templateDesignFromTemplate(template);
    setTemplateDraft({ ...EMPTY_TEMPLATE, ...template });
    setTableDesign(design);
    setActivePanel("create");
  }

  async function submitTemplate(event) {
    event.preventDefault();
    if (!String(templateDraft.name || "").trim()) return;
    setSavingTemplate(true);
    try {
      const saved = await onSaveTemplate({
        ...templateDraft,
        table_schema: serializeMeasurementTableDesign(tableDesign)
      }, templateDraft.id || null);
      setTemplateDraft(EMPTY_TEMPLATE);
      setTableDesign(EMPTY_TABLE_DESIGN);
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

  async function importTemplate(template) {
    if (!onImportTemplate || !template?.id) return;
    setImportingTemplateId(template.id);
    try {
      const saved = await onImportTemplate(template);
      if (saved?.id) setSelectedTypeKey(`template-${saved.id}`);
      setActivePanel("records");
    } finally {
      setImportingTemplateId("");
    }
  }

  function updateTemplateDraft(key, value) {
    setTemplateDraft(current => ({ ...current, [key]: value }));
  }

  async function handleGuidanceFiles(fileList) {
    const uploadedFiles = await readGuidanceFiles(fileList);
    if (!uploadedFiles.length) return;
    setTemplateDraft(current => {
      const files = [...parseGuidanceFiles(current), ...uploadedFiles];
      return {
        ...current,
        guidance_file_name: guidanceFileNames(files),
        guidance_file_url: serializeGuidanceFiles(files)
      };
    });
  }

  function removeGuidanceFile(fileIndex) {
    setTemplateDraft(current => {
      const files = parseGuidanceFiles(current).filter((_, index) => index !== fileIndex);
      return {
        ...current,
        guidance_file_name: guidanceFileNames(files),
        guidance_file_url: files.length ? serializeGuidanceFiles(files) : ""
      };
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{t("Measurements")}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{t("Create structured readings using user-defined measurement templates.")}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MeasurementPanelCard active={activePanel === "records"} icon={<ClipboardList className="h-5 w-5" />} title={t("Measurement Records")} meta={`${measurementGroups.length} ${t("Measurement Types")}`} description={t("Open old readings and add readings for the selected measurement type.")} onClick={() => setActivePanel("records")} />
        <MeasurementPanelCard active={activePanel === "create"} icon={<Plus className="h-5 w-5" />} title={t("Create New Measurement")} meta={canManageTemplates ? t("Admin controlled") : t("Admin Only")} description={t("Create a reusable measurement type with its own table and guidance.")} disabled={!canManageTemplates} onClick={() => canManageTemplates && setActivePanel("create")} />
        <MeasurementPanelCard active={activePanel === "import"} icon={<Download className="h-5 w-5" />} title={t("Import Template")} meta={`${availableImportTemplates.length} ${t("Available")}`} description={t("Import a measurement template from any other asset when needed.")} disabled={!canCreateTemplate || !onImportTemplate} onClick={() => canCreateTemplate && onImportTemplate && setActivePanel("import")} />
      </div>

      {activePanel === "import" ? (
        <MeasurementTemplateImportPanel templates={availableImportTemplates} importingTemplateId={importingTemplateId} onImport={importTemplate} language={language} />
      ) : activePanel === "create" ? (
        canManageTemplates ? (
          <MeasurementTemplateBuilder templates={templates} templateDraft={templateDraft} tableDesign={tableDesign} savingTemplate={savingTemplate} canCreateTemplate={canCreateTemplate} canEditTemplate={canEditTemplate} canDeleteTemplate={canDeleteTemplate} onSubmit={submitTemplate} onDraftChange={updateTemplateDraft} onTableDesignChange={setTableDesign} onGuidanceFile={handleGuidanceFiles} onRemoveGuidanceFile={removeGuidanceFile} onNew={() => {
            setTemplateDraft(EMPTY_TEMPLATE);
            setTableDesign(EMPTY_TABLE_DESIGN);
          }} onEdit={editTemplate} onDelete={deleteTemplate} language={language} />
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">{t("Admin permission is required to create measurement types.")}</div>
        )
      ) : (
        <MeasurementRecordsPanel groups={measurementGroups} selectedGroup={selectedGroup} selectedTypeKey={selectedTypeKey} activeReadingPanel={activeReadingPanel} onReadingPanelChange={setActiveReadingPanel} onSelect={setSelectedTypeKey} form={form} selectedTemplate={selectedTemplate} templateColumns={templateColumns} tableRows={tableRows} savingMeasurement={savingMeasurement} canAddMeasurement={canAddMeasurement && Boolean(onSaveMeasurement) && Boolean(selectedGroup)} canDeleteMeasurement={canDeleteMeasurement && Boolean(onDeleteMeasurement)} canEditTemplate={canEditTemplate} onSubmit={submitMeasurement} onFormChange={updateForm} onCellChange={updateTableCell} onRemoveRow={removeTableRow} onDeleteMeasurement={onDeleteMeasurement} onEditTemplate={() => selectedTemplate && editTemplate(selectedTemplate)} language={language} />
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

function templateDesignFromTemplate(template) {
  if (!template) return EMPTY_TABLE_DESIGN;
  return parseMeasurementTableDesign(template.table_schema);
}

function measurementRowsFromTemplate(design) {
  const normalized = normalizeMeasurementTableDesign(design);
  if (!normalized.columns.length) return [];
  return normalized.rows.length ? normalized.rows : [emptyTableRow(normalized.columns)];
}
