import { api } from "../../../api.js";
import { LineChart } from "../../../shared/components/Charts.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { hasPermission, tr } from "../../../shared/config/appConfig.jsx";
import { InfoTile } from "../../settings/components/SettingsViews.jsx";
import { calculateDuration, parseWorkOrderNotes } from "../../work-orders/utils/workOrderForms.js";
import { Activity, ArrowLeft, BarChart3, Bell, CheckCircle2, Clock3, Eye, Factory, Filter, Gauge, Printer, Search, ShieldCheck, TimerReset, Trash2, Wrench, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function Reports({
  data,
  alerts,
  stats,
  language,
  currentUser,
  mode = "reports"
}) {
  const t = text => tr(language, text);
  const [selectedReport, setSelectedReport] = useState("");
  if (mode === "kpis") {
    return <WorkOrderKpisPage data={data} language={language} />;
  }
  if (selectedReport !== "operational-performance") {
    return <ReportsLandingPage language={language} onOpenOperational={() => setSelectedReport("operational-performance")} />;
  }
  return <OperationalPerformanceReport data={data} language={language} currentUser={currentUser} onBack={() => setSelectedReport("")} />;
}

function ReportsLandingPage({
  language,
  onOpenOperational
}) {
  const t = text => tr(language, text);
  return <Panel title={t("Reports & Analytics")} subtitle={t("Choose the report you want to generate.")}>
      <div className="max-w-md">
        <button type="button" onClick={onOpenOperational} className="group w-full rounded-2xl border border-blue-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white shadow-sm">
              <Factory className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{t("Select Report")}</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">{t("Operational Performance")}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {t("Track working hours, production, consumption, efficiency, and annual performance from saved readings.")}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 group-hover:bg-blue-700 group-hover:text-white">
                <BarChart3 className="h-4 w-4" />
                {t("Open Operational Performance")}
              </span>
            </div>
          </div>
        </button>
      </div>
    </Panel>;
}

export function OperationalPerformanceReport({
  data,
  language,
  currentUser,
  onBack
}) {
  const t = text => tr(language, text);
  const customers = data.customers || [];
  const equipment = data.equipment || [];
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    reportType: "monthly",
    siteId: "",
    equipmentType: "",
    assetIds: [],
    year: String(currentYear),
    month: String(new Date().getMonth() + 1),
    fromDate: "",
    toDate: ""
  });
  const [operationalItems, setOperationalItems] = useState(DEFAULT_OPERATIONAL_ITEMS);
  const [itemsManagerOpen, setItemsManagerOpen] = useState(false);
  const [itemForm, setItemForm] = useState(() => emptyOperationalItemForm());
  const [editingItemId, setEditingItemId] = useState(null);
  const [readings, setReadings] = useState(() => initialOperationalReadings(DEFAULT_OPERATIONAL_ITEMS));
  const [generated, setGenerated] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("");
  const [openedSavedReport, setOpenedSavedReport] = useState(null);
  const [annualReport, setAnnualReport] = useState(null);
  const [savingReport, setSavingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const equipmentTypes = useMemo(() => [...new Set(equipment.map(asset => asset.asset_type || asset.category || "Equipment").filter(Boolean))].sort(), [equipment]);
  const filteredEquipment = useMemo(() => equipment.filter(asset => {
    if (filters.siteId && Number(asset.customer_id) !== Number(filters.siteId)) return false;
    if (filters.equipmentType && (asset.asset_type || asset.category || "Equipment") !== filters.equipmentType) return false;
    return true;
  }), [equipment, filters.siteId, filters.equipmentType]);
  const selectedAssets = useMemo(() => {
    if (!filters.assetIds.length) return [];
    return filteredEquipment.filter(asset => filters.assetIds.includes(String(asset.id)));
  }, [filteredEquipment, filters.assetIds]);
  const activeOperationalItems = useMemo(() => operationalItems.filter(item => item.is_active !== false), [operationalItems]);
  const canManageReportItems = hasPermission(currentUser, "reports", "add") || hasPermission(currentUser, "reports", "edit") || hasPermission(currentUser, "reports", "delete");
  const report = useMemo(() => buildOperationalReport(readings, filters, selectedAssets, language, activeOperationalItems), [readings, filters, selectedAssets, language, activeOperationalItems]);
  const scopedSavedReports = useMemo(() => filterOperationalHistory(savedReports, filters, historyTypeFilter), [savedReports, filters, historyTypeFilter]);

  useEffect(() => {
    loadSavedReports();
    loadOperationalItems();
  }, []);

  useEffect(() => {
    setReadings(current => normalizeOperationalReadings(current, activeOperationalItems));
  }, [activeOperationalItems]);

  function updateFilter(key, value) {
    setGenerated(false);
    setOpenedSavedReport(null);
    setAnnualReport(null);
    setFilters(current => ({
      ...current,
      [key]: value,
      ...(key === "siteId" || key === "equipmentType" ? { assetIds: [] } : {})
    }));
  }
  function updateReading(key, field, value) {
    setGenerated(false);
    setOpenedSavedReport(null);
    setAnnualReport(null);
    setReadings(current => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value
      }
    }));
  }
  function generateReport() {
    if (!filters.assetIds.length) {
      setReportMessage(t("Select a generator before generating report."));
      return;
    }
    setOpenedSavedReport(null);
    setAnnualReport(null);
    setReportMessage("");
    setGenerated(true);
  }
  async function loadSavedReports() {
    setHistoryLoading(true);
    try {
      const response = await api.list("reports/operational-performance");
      setSavedReports(listResponseItems(response));
    } catch (error) {
      setReportMessage(error.message || "Failed to load report history.");
    } finally {
      setHistoryLoading(false);
    }
  }
  async function loadOperationalItems() {
    try {
      const response = await api.list("reports/operational-items");
      const items = listResponseItems(response).map(normalizeOperationalItem).filter(item => item.label);
      setOperationalItems(items.length ? items : DEFAULT_OPERATIONAL_ITEMS);
    } catch (error) {
      setOperationalItems(DEFAULT_OPERATIONAL_ITEMS);
      setReportMessage(error.message || t("Failed to load meter reading items."));
    }
  }
  async function saveOperationalItem(event) {
    event.preventDefault();
    if (!canManageReportItems) {
      setReportMessage(t("No permission"));
      return;
    }
    const payload = {
      key: itemForm.key,
      label: itemForm.label,
      unit: itemForm.unit,
      sort_order: Number(itemForm.sort_order || 0),
      is_active: Boolean(itemForm.is_active)
    };
    try {
      if (editingItemId) {
        await api.update("reports/operational-items", editingItemId, payload);
      } else {
        await api.create("reports/operational-items", payload);
      }
      await loadOperationalItems();
      setEditingItemId(null);
      setItemForm(emptyOperationalItemForm());
      setReportMessage(t("Meter reading item saved successfully."));
    } catch (error) {
      setReportMessage(error.message || t("Failed to save meter reading item."));
    }
  }
  async function deleteOperationalItem(itemId) {
    if (!canManageReportItems) {
      setReportMessage(t("No permission"));
      return;
    }
    try {
      await api.remove("reports/operational-items", itemId);
      await loadOperationalItems();
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setItemForm(emptyOperationalItemForm());
      }
      setReportMessage(t("Meter reading item deleted successfully."));
    } catch (error) {
      setReportMessage(error.message || t("Failed to delete meter reading item."));
    }
  }
  function editOperationalItem(item) {
    setEditingItemId(item.id);
    setItemForm({
      key: item.key,
      label: item.label,
      unit: item.unit,
      sort_order: item.sort_order,
      is_active: item.is_active !== false
    });
    setItemsManagerOpen(true);
  }
  async function saveGeneratedReport() {
    if (!generated) {
      setReportMessage(t("Generate the report before saving it."));
      return;
    }
    setSavingReport(true);
    setReportMessage("");
    try {
      const payload = buildOperationalReportPayload(report, readings, filters, selectedAssets, customers);
      await api.create("reports/operational-performance", payload);
      await loadSavedReports();
      setHistoryOpen(true);
      setReportMessage(t("Report saved successfully."));
    } catch (error) {
      setReportMessage(error.message || t("Failed to save report."));
    } finally {
      setSavingReport(false);
    }
  }
  function openSavedOperationalReport(record) {
    const parsedReport = reportFromSavedOperationalRecord(record, language);
    if (parsedReport.isAnnual) {
      setAnnualReport(parsedReport);
      setOpenedSavedReport(null);
    } else {
      setOpenedSavedReport({
        record,
        report: parsedReport
      });
      setAnnualReport(null);
    }
    setGenerated(false);
    setReportMessage("");
  }
  async function deleteSavedOperationalReport(recordId) {
    try {
      await api.remove("reports/operational-performance", recordId);
      await loadSavedReports();
      if (openedSavedReport?.record?.id === recordId) setOpenedSavedReport(null);
      setReportMessage(t("Report deleted successfully."));
    } catch (error) {
      setReportMessage(error.message || t("Failed to delete report."));
    }
  }
  function generateAnnualReportFromHistory() {
    if (filters.assetIds.length !== 1) {
      setReportMessage(t("Select one generator to build annual report."));
      return;
    }
    const annual = buildAnnualOperationalReport(savedReports, filters, language, activeOperationalItems);
    setAnnualReport(annual);
    setOpenedSavedReport(null);
    setGenerated(false);
    setReportMessage(annual.isComplete ? "" : annual.boundaryNote || t("No saved reports match the selected annual filters."));
  }
  async function saveAnnualReport() {
    if (!annualReport) {
      setReportMessage(t("Generate Annual Report before saving it."));
      return;
    }
    if (annualReport.sourceRecordId) {
      setReportMessage(t("Annual report is already saved."));
      return;
    }
    setSavingReport(true);
    setReportMessage("");
    try {
      const payload = buildAnnualOperationalReportPayload(annualReport, filters);
      const saved = await api.create("reports/operational-performance", payload);
      await loadSavedReports();
      setAnnualReport(current => current ? { ...current, sourceRecordId: saved?.id } : current);
      setHistoryOpen(true);
      setHistoryTypeFilter("yearly");
      setReportMessage(t("Annual report saved successfully."));
    } catch (error) {
      setReportMessage(error.message || t("Failed to save report."));
    } finally {
      setSavingReport(false);
    }
  }
  function exportCurrentPdf() {
    const activeReport = openedSavedReport?.report || (generated ? report : null);
    if (!activeReport) {
      setReportMessage(t("Generate or open a report before exporting PDF."));
      return;
    }
    const payload = openedSavedReport?.record || buildOperationalReportPayload(activeReport, readings, filters, selectedAssets, customers);
    exportOperationalPerformancePdf(activeReport, payload, language);
  }

  return <div className="space-y-6">
      {onBack ? <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700">
          <ArrowLeft className={`h-4 w-4 ${language === "ar" ? "rotate-180" : ""}`} />
          {t("Back to Reports")}
        </button> : null}
      <Panel title={t("Reports & Analytics")} subtitle={t("Build focused operational reports by selecting period, site, and equipment before generating analytics.")}>
        <div className="space-y-4">
          <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-7">
            <ReportSelect label="Report Type" value={filters.reportType} onChange={value => updateFilter("reportType", value)} options={[["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"], ["custom", "Custom Period"]]} language={language} />
            <ReportSelect label="Site" value={filters.siteId} onChange={value => updateFilter("siteId", value)} options={customers.map(site => [site.id, site.name])} allLabel="All Sites" language={language} />
            <ReportSelect label="Equipment Type" value={filters.equipmentType} onChange={value => updateFilter("equipmentType", value)} options={equipmentTypes.map(type => [type, type])} allLabel="All Types" language={language} />
            <ReportSelect label="Generator" value={filters.assetIds[0] || ""} onChange={value => updateFilter("assetIds", value ? [String(value)] : [])} options={filteredEquipment.map(asset => [asset.id, asset.name])} allLabel="Select Generator" language={language} />
            <ReportSelect label="Year" value={filters.year} onChange={value => updateFilter("year", value)} options={Array.from({ length: 7 }, (_, index) => String(currentYear - 3 + index)).map(year => [year, year])} language={language} />
            <ReportSelect label="Month" value={filters.month} onChange={value => updateFilter("month", value)} options={monthOptions(language)} allLabel="All Months" language={language} />
            <button type="button" onClick={generateReport} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-800">
              <BarChart3 className="h-4 w-4" />
              {t("Generate Report")}
            </button>
          </div>
          {filters.reportType === "custom" ? <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ReportDateInput label="From Date" value={filters.fromDate} onChange={value => updateFilter("fromDate", value)} language={language} />
              <ReportDateInput label="To Date" value={filters.toDate} onChange={value => updateFilter("toDate", value)} language={language} />
            </div> : null}
          {!filteredEquipment.length ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">{t("No equipment matches the selected filters.")}</p> : null}
        </div>
      </Panel>

      <Panel title={t("Meter Readings Input")} subtitle={t("Enter previous and current meter readings. The system calculates consumption and KPIs automatically.")} actions={canManageReportItems ? <button type="button" onClick={() => setItemsManagerOpen(value => !value)} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:border-blue-400">
            <Wrench className="h-3.5 w-3.5" />
            {itemsManagerOpen ? t("Hide Items Manager") : t("Manage Items")}
          </button> : null}>
        {itemsManagerOpen && canManageReportItems ? <OperationalItemsManager items={operationalItems} form={itemForm} editingItemId={editingItemId} language={language} onFormChange={setItemForm} onSubmit={saveOperationalItem} onEdit={editOperationalItem} onDelete={deleteOperationalItem} onCancel={() => {
          setEditingItemId(null);
          setItemForm(emptyOperationalItemForm());
        }} /> : null}
        <div className="overflow-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-black">{t("Item")}</th>
                <th className="px-4 py-3 text-left font-black">{t("Previous")}</th>
                <th className="px-4 py-3 text-left font-black">{t("Current")}</th>
                <th className="px-4 py-3 text-left font-black">{t("Calculated Consumption")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeOperationalItems.map(item => <tr key={item.key}>
                  <td className="px-4 py-3 font-black text-slate-900">{t(item.label)}</td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" value={readings[item.key].previous} onChange={event => updateReading(item.key, "previous", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" value={readings[item.key].current} onChange={event => updateReading(item.key, "current", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </td>
                  <td className="px-4 py-3 font-black text-blue-700">{formatReportNumber(report.consumption[item.key])} {item.unit}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={t("Report Actions")} subtitle={t("Save generated reports, review history, build annual reports, or export PDF.")}>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={saveGeneratedReport} disabled={savingReport || !generated} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            <CheckCircle2 className="h-4 w-4" />
            {savingReport ? t("Saving...") : t("Save Report")}
          </button>
          <button type="button" onClick={() => setHistoryOpen(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:border-blue-400">
            <Eye className="h-4 w-4" />
            {historyOpen ? t("Hide History") : t("Show History")}
          </button>
          <button type="button" onClick={generateAnnualReportFromHistory} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-blue-300">
            <BarChart3 className="h-4 w-4" />
            {t("Generate Annual Report")}
          </button>
          <button type="button" onClick={exportCurrentPdf} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
            <Printer className="h-4 w-4" />
            {t("Export PDF")}
          </button>
        </div>
        {reportMessage ? <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">{reportMessage}</p> : null}
      </Panel>

      {historyOpen ? <OperationalReportHistory reports={scopedSavedReports} loading={historyLoading} language={language} historyTypeFilter={historyTypeFilter} onHistoryTypeChange={setHistoryTypeFilter} onOpen={openSavedOperationalReport} onDelete={deleteSavedOperationalReport} onExport={record => exportOperationalPerformancePdf(reportFromSavedOperationalRecord(record, language), record, language)} /> : null}

      {annualReport ? <AnnualOperationalReportOutput report={annualReport} language={language} saving={savingReport} onSave={saveAnnualReport} onExport={() => exportOperationalPerformancePdf(annualReport, { report_name: annualReport.reportName, report_type: "yearly", site_name: annualReport.siteName, asset_names: annualReport.assetNames, year: filters.year }, language)} /> : null}

      {generated || openedSavedReport ? <OperationalReportOutput report={openedSavedReport?.report || report} language={language} context={openedSavedReport?.record} /> : <Panel title={t("Report Output")} subtitle={t("Results will appear after generating the report.")}>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <Gauge className="mx-auto h-10 w-10 text-blue-700" />
            <h3 className="mt-3 text-lg font-black text-slate-950">{t("No report generated yet.")}</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">{t("Select filters, enter meter readings, then press Generate Report.")}</p>
          </div>
        </Panel>}
    </div>;
}

function OperationalReportOutput({
  report,
  language,
  context = null
}) {
  const t = text => tr(language, text);
  return <div className="space-y-6">
      {context ? <Panel title={t("Opened Saved Report")} subtitle={context.report_name || context.created_at || ""}>
          <div className="grid gap-3 md:grid-cols-4">
            <AuditStatCard label={t("Site")} value={context.site_name || t("All Sites")} tone="blue" />
            <AuditStatCard label={t("Engine")} value={context.asset_names || t("All")} tone="green" />
            <AuditStatCard label={t("Period")} value={report.periodLabel || "-"} tone="slate" />
            <AuditStatCard label={t("Saved By")} value={context.created_by || "-"} tone="cyan" />
          </div>
        </Panel> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <ReportKpiCard label="Working Hours" value={formatReportNumber(report.workingHours)} icon={Clock3} tone="blue" helper="Current RH - Previous RH" language={language} />
        <ReportKpiCard label="Energy Generated" value={formatReportNumber(report.energyGenerated)} icon={Zap} tone="green" helper="Current energy - previous energy" language={language} />
        <ReportKpiCard label="Gas Consumption" value={formatReportNumber(report.gasConsumption)} icon={Activity} tone="amber" helper="Current gas - previous gas" language={language} />
        <ReportKpiCard label="Oil Consumption" value={formatReportNumber(report.oilConsumption)} icon={Wrench} tone="slate" helper="Current oil - previous oil" language={language} />
        <ReportKpiCard label="Average Load" value={formatReportNumber(report.averageLoad)} icon={Gauge} tone="blue" helper="Energy / working hours" language={language} />
        <ReportKpiCard label="SFC" value={formatReportNumber(report.sfc)} icon={BarChart3} tone="cyan" helper="Specific gas consumption" language={language} />
        <ReportKpiCard label="SOC" value={formatReportNumber(report.soc)} icon={BarChart3} tone="green" helper="Specific oil consumption" language={language} />
      </div>

      <Panel title={t("Operational Efficiency")} subtitle={t("Automatically calculated indicators from meter readings and selected period.")}>
        <div className="grid gap-3 md:grid-cols-4">
          <AuditStatCard label="Thermal Efficiency" value={report.thermalEfficiency === null ? "N/A" : `${formatReportNumber(report.thermalEfficiency)}%`} tone={report.thermalEfficiency ? "green" : "amber"} language={language} />
          <AuditStatCard label="Availability" value={`${formatReportNumber(report.availability)}%`} tone={report.availability >= 90 ? "green" : "amber"} language={language} />
          <AuditStatCard label="Capacity Factor" value={report.capacityFactor === null ? "N/A" : `${formatReportNumber(report.capacityFactor)}%`} tone="blue" language={language} />
          <AuditStatCard label="Heat Rate" value={report.heatRate === null ? "N/A" : formatReportNumber(report.heatRate)} tone="cyan" language={language} />
        </div>
        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {t("Capacity Factor requires rated capacity for each asset. It will calculate automatically when rated capacity data is available.")}
        </p>
      </Panel>

      <Panel title={t("Monthly Performance Table")} subtitle={t("Previous, current, consumption, and average values calculated from entered readings.")}>
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-blue-700 text-xs uppercase tracking-[0.14em] text-white">
              <tr>
                {["Item", "Previous", "Current", "Consumption", "Average"].map(heading => <th key={heading} className="px-4 py-3 text-left font-black">{t(heading)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.tableRows.map(row => <tr key={row.key} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-black text-slate-950">{t(row.label)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.previous)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.current)}</td>
                  <td className="px-4 py-3 font-black text-blue-700">{formatReportNumber(row.consumption)}</td>
                  <td className="px-4 py-3 font-black text-slate-900">{formatReportNumber(row.average)}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportChart title="Energy Production Trend" data={report.charts.energy} color="#2563eb" language={language} />
        <ReportChart title="Gas Consumption Trend" data={report.charts.gas} color="#16a34a" language={language} />
        <ReportChart title="Oil Consumption Trend" data={report.charts.oil} color="#f97316" language={language} />
        <ReportChart title="Average Load" data={report.charts.averageLoad} color="#0f766e" language={language} />
        <ReportChart title="SFC" data={report.charts.sfc} color="#7c3aed" language={language} />
        <ReportChart title="SOC" data={report.charts.soc} color="#dc2626" language={language} />
      </div>
    </div>;
}

function OperationalReportHistory({
  reports,
  loading,
  language,
  historyTypeFilter,
  onHistoryTypeChange,
  onOpen,
  onDelete,
  onExport
}) {
  const t = text => tr(language, text);
  return <Panel title={t("Operational Report History")} subtitle={t("Saved generated reports can be opened, reviewed, exported, and used for annual reporting.")}>
      <div className="mb-4 max-w-xs">
        <ReportSelect label="History Type" value={historyTypeFilter} onChange={onHistoryTypeChange} options={[["monthly", "Monthly Reports"], ["yearly", "Annual Reports"]]} allLabel="All Reports" language={language} />
      </div>
      {loading ? <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-black text-slate-500">{t("Loading report history...")}</p> : null}
      {!loading && !reports.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <Clock3 className="mx-auto h-10 w-10 text-blue-700" />
          <h3 className="mt-3 text-lg font-black text-slate-950">{t("No saved reports yet.")}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">{t("Generate and save a report to build performance history.")}</p>
        </div> : null}
      {reports.length ? <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {["Report Name", "Type", "Period", "Site", "Equipment", "Created By", "Created At", "Options"].map(heading => <th key={heading} className="px-4 py-3 text-left font-black">{t(heading)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map(record => {
              const parsed = reportFromSavedOperationalRecord(record, language);
              return <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-black text-slate-950">{record.report_name || `${t("Operational Performance")} #${record.id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${isAnnualOperationalRecord(record) ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {t(reportTypeLabel(record.report_type))}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-600">{parsed.periodLabel || "-"}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{record.site_name || t("All Sites")}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{record.asset_names || t("All")}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{record.created_by || "-"}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{formatAuditTimestamp(record.created_at, language)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onOpen(record)} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
                          <Eye className="h-3.5 w-3.5" />
                          {t("Open")}
                        </button>
                        <button type="button" onClick={() => onExport(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300">
                          <Printer className="h-3.5 w-3.5" />
                          PDF
                        </button>
                        <button type="button" onClick={() => onDelete(record.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div> : null}
    </Panel>;
}

function AnnualOperationalReportOutput({
  report,
  language,
  saving,
  onSave,
  onExport
}) {
  const t = text => tr(language, text);
  return <div className="space-y-6">
      <Panel title={t("Annual Operational Performance Report")} subtitle={report.reportName || ""} actions={<div className="flex flex-wrap gap-2">
          {onSave ? <button type="button" onClick={onSave} disabled={saving || report.sourceRecordId} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {report.sourceRecordId ? t("Saved") : saving ? t("Saving...") : t("Save Annual Report")}
            </button> : null}
          <button type="button" onClick={onExport} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">
            <Printer className="h-3.5 w-3.5" />
            {t("Export PDF")}
          </button>
        </div>}>
        <div className="grid gap-3 md:grid-cols-4">
          <AuditStatCard label={t("Saved Reports")} value={report.reportsCount} tone="blue" />
          <AuditStatCard label={t("Working Hours")} value={formatReportNumber(report.workingHours)} tone="green" />
          <AuditStatCard label={t("Energy Generated")} value={formatReportNumber(report.energyGenerated)} tone="cyan" />
          <AuditStatCard label={t("Availability")} value={`${formatReportNumber(report.availability)}%`} tone={report.availability >= 90 ? "green" : "amber"} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <AuditStatCard label={t("Gas Consumption")} value={formatReportNumber(report.gasConsumption)} tone="amber" />
          <AuditStatCard label={t("Oil Consumption")} value={formatReportNumber(report.oilConsumption)} tone="blue" />
          <AuditStatCard label={t("Average Load")} value={formatReportNumber(report.averageLoad)} tone="cyan" />
          <AuditStatCard label={t("SFC")} value={formatReportNumber(report.sfc)} tone="green" />
          <AuditStatCard label={t("SOC")} value={formatReportNumber(report.soc)} tone="blue" />
        </div>
        {report.boundaryNote ? <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{report.boundaryNote}</p> : null}
      </Panel>
      <Panel title={t("Annual Monthly Summary")} subtitle={t("Aggregated automatically from saved operational performance reports during the selected year.")}>
        <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-blue-700 text-xs uppercase tracking-[0.14em] text-white">
              <tr>
                {["Month", "Reports", "Working Hours", "Energy", "Gas", "Oil", "Average Load", "SFC", "SOC", "Availability"].map(heading => <th key={heading} className="px-4 py-3 text-left font-black">{t(heading)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.monthlyRows.map(row => <tr key={row.month} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-black text-slate-950">{row.monthLabel}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{row.reportsCount}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.workingHours)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.energyGenerated)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.gasConsumption)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.oilConsumption)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.averageLoad)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.sfc)}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{formatReportNumber(row.soc)}</td>
                  <td className="px-4 py-3 font-black text-blue-700">{formatReportNumber(row.availability)}%</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <ReportChart title="Energy Production Trend" data={report.charts.energy} color="#2563eb" language={language} />
        <ReportChart title="Gas Consumption Trend" data={report.charts.gas} color="#16a34a" language={language} />
        <ReportChart title="Oil Consumption Trend" data={report.charts.oil} color="#f97316" language={language} />
        <ReportChart title="Average Load" data={report.charts.averageLoad} color="#0f766e" language={language} />
      </div>
    </div>;
}

function OperationalItemsManager({
  items,
  form,
  editingItemId,
  language,
  onFormChange,
  onSubmit,
  onEdit,
  onDelete,
  onCancel
}) {
  const t = text => tr(language, text);
  return <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-blue-700">{t("Meter Reading Items Manager")}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{t("Admins can add, edit, delete, activate, and reorder meter reading items.")}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Item Name")}</span>
          <input value={form.label} onChange={event => onFormChange(current => ({ ...current, label: event.target.value }))} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Key")}</span>
          <input value={form.key} onChange={event => onFormChange(current => ({ ...current, key: event.target.value }))} placeholder={t("Auto")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Unit")}</span>
          <input value={form.unit} onChange={event => onFormChange(current => ({ ...current, unit: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Order")}</span>
          <input type="number" value={form.sort_order} onChange={event => onFormChange(current => ({ ...current, sort_order: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
          <input type="checkbox" checked={form.is_active} onChange={event => onFormChange(current => ({ ...current, is_active: event.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
          {t("Active")}
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-6">
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800">
            <CheckCircle2 className="h-4 w-4" />
            {editingItemId ? t("Update Item") : t("Add Item")}
          </button>
          {editingItemId ? <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-blue-300">
              {t("Cancel")}
            </button> : null}
        </div>
      </form>
      <div className="mt-4 overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {["Item Name", "Key", "Unit", "Order", "Status", "Actions"].map(heading => <th key={heading} className="px-4 py-3 text-left font-black">{t(heading)}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => <tr key={item.id || item.key} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-black text-slate-950">{t(item.label)}</td>
                <td className="px-4 py-3 font-bold text-slate-600">{item.key}</td>
                <td className="px-4 py-3 font-bold text-slate-600">{item.unit || "-"}</td>
                <td className="px-4 py-3 font-bold text-slate-600">{item.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${item.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {t(item.is_active !== false ? "Active" : "Inactive")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onEdit(item)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">{t("Edit")}</button>
                    {item.id ? <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">{t("Delete")}</button> : null}
                  </div>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
}

function ReportChart({
  title,
  data,
  color,
  language
}) {
  const t = text => tr(language, text);
  return <Panel title={t(title)} subtitle={t("Previous vs current movement based on entered meter readings.")}>
      <LineChart data={data} color={color} />
    </Panel>;
}

function ReportSelect({
  label,
  value,
  options,
  onChange,
  allLabel,
  language
}) {
  const t = text => tr(language, text);
  return <label>
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t(label)}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-cyan-50 px-3 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
        {allLabel ? <option value="">{t(allLabel)}</option> : null}
        {options.map(option => <option key={option[0]} value={option[0]}>{t(option[1])}</option>)}
      </select>
    </label>;
}

function ReportDateInput({
  label,
  value,
  onChange,
  language
}) {
  const t = text => tr(language, text);
  return <label>
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t(label)}</span>
      <input type="date" value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-cyan-50 px-3 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
    </label>;
}

const DEFAULT_OPERATIONAL_ITEMS = [
  { key: "runningHours", label: "Running Hours", unit: "h" },
  { key: "energy", label: "Energy", unit: "kWh" },
  { key: "gas", label: "Gas", unit: "m3" },
  { key: "oil", label: "Oil", unit: "L" },
  { key: "water", label: "Water", unit: "m3" },
  { key: "steam", label: "Steam", unit: "t" },
  { key: "chiller", label: "Chiller", unit: "h" }
];

function initialOperationalReadings(items = DEFAULT_OPERATIONAL_ITEMS) {
  return items.reduce((acc, item) => ({
    ...acc,
    [item.key]: {
      previous: "",
      current: ""
    }
  }), {});
}

function normalizeOperationalReadings(current, items = DEFAULT_OPERATIONAL_ITEMS) {
  return items.reduce((acc, item) => ({
    ...acc,
    [item.key]: current?.[item.key] || { previous: "", current: "" }
  }), {});
}

function normalizeOperationalItem(item) {
  return {
    id: item.id,
    key: String(item.key || "").trim(),
    label: String(item.label || "").trim(),
    unit: String(item.unit || "").trim(),
    sort_order: Number(item.sort_order || 0),
    is_active: item.is_active !== false
  };
}

function emptyOperationalItemForm() {
  return {
    key: "",
    label: "",
    unit: "",
    sort_order: 0,
    is_active: true
  };
}

function buildOperationalReport(readings, filters, selectedAssets, language = "en", items = DEFAULT_OPERATIONAL_ITEMS) {
  const consumption = items.reduce((acc, item) => {
    acc[item.key] = positiveDelta(readings[item.key]?.previous, readings[item.key]?.current);
    return acc;
  }, {});
  const workingHours = consumption.runningHours;
  const energyGenerated = consumption.energy;
  const gasConsumption = consumption.gas;
  const oilConsumption = consumption.oil;
  const averageLoad = safeDivide(energyGenerated, workingHours);
  const sfc = safeDivide(gasConsumption, energyGenerated);
  const soc = safeDivide(oilConsumption, energyGenerated);
  const fuelEnergyKwh = gasConsumption > 0 ? gasConsumption * 10.55 : 0;
  const thermalEfficiency = fuelEnergyKwh > 0 ? safeDivide(energyGenerated, fuelEnergyKwh) * 100 : null;
  const plannedHours = plannedPeriodHours(filters) * Math.max(selectedAssets.length, 1);
  const availability = plannedHours ? Math.min(safeDivide(workingHours, plannedHours) * 100, 100) : 0;
  const capacityFactor = null;
  const heatRate = fuelEnergyKwh > 0 && energyGenerated > 0 ? safeDivide(fuelEnergyKwh, energyGenerated) : null;
  const tableRows = items.map(item => {
    const previous = numberValue(readings[item.key]?.previous);
    const current = numberValue(readings[item.key]?.current);
    const itemConsumption = consumption[item.key];
    return {
      ...item,
      previous,
      current,
      consumption: itemConsumption,
      average: item.key === "runningHours" ? safeDivide(itemConsumption, Math.max(selectedAssets.length, 1)) : safeDivide(itemConsumption, Math.max(workingHours, 1))
    };
  });
  return {
    consumption,
    plannedHours,
    periodLabel: reportPeriodLabel(filters, language),
    workingHours,
    energyGenerated,
    gasConsumption,
    oilConsumption,
    averageLoad,
    sfc,
    soc,
    thermalEfficiency,
    availability,
    capacityFactor,
    heatRate,
    tableRows,
    charts: {
      energy: comparisonSeries(readings.energy, energyGenerated, language),
      gas: comparisonSeries(readings.gas, gasConsumption, language),
      oil: comparisonSeries(readings.oil, oilConsumption, language),
      averageLoad: metricSeries(averageLoad, language),
      sfc: metricSeries(sfc, language),
      soc: metricSeries(soc, language)
    }
  };
}

function positiveDelta(previous, current) {
  return Math.max(numberValue(current) - numberValue(previous), 0);
}

function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function safeDivide(numerator, denominator) {
  const top = numberValue(numerator);
  const bottom = numberValue(denominator);
  return bottom > 0 ? top / bottom : 0;
}

function formatReportNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "N/A";
  const number = Number(value);
  return Number.isInteger(number) ? number.toLocaleString() : number.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function comparisonSeries(reading, consumption, language) {
  return [
    { label: tr(language, "Previous"), value: numberValue(reading?.previous) },
    { label: tr(language, "Current"), value: numberValue(reading?.current) },
    { label: tr(language, "Consumption"), value: numberValue(consumption) }
  ];
}

function metricSeries(value, language) {
  return [
    { label: tr(language, "Previous"), value: 0 },
    { label: tr(language, "Current"), value: numberValue(value) }
  ];
}

function plannedPeriodHours(filters) {
  if (filters.reportType === "custom" && filters.fromDate && filters.toDate) {
    const from = new Date(`${filters.fromDate}T00:00:00`);
    const to = new Date(`${filters.toDate}T23:59:59`);
    const diffHours = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60));
    return Math.max(diffHours, 0);
  }
  if (filters.reportType === "weekly") return 24 * 7;
  if (filters.reportType === "yearly") return 24 * 365;
  const year = Number(filters.year || new Date().getFullYear());
  const month = Number(filters.month || 1);
  if (filters.reportType === "monthly" || filters.month) {
    return new Date(year, month, 0).getDate() * 24;
  }
  return 24 * 30;
}

function monthOptions(language) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const label = new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { month: "long" }).format(new Date(2026, index, 1));
    return [String(monthNumber), label];
  });
}

function listResponseItems(response) {
  if (Array.isArray(response)) return response;
  return response?.items || [];
}

function selectedSiteName(filters, customers) {
  const site = customers.find(item => String(item.id) === String(filters.siteId));
  return site?.name || "";
}

function buildOperationalReportPayload(report, readings, filters, selectedAssets, customers) {
  const reportName = buildOperationalReportName(filters, selectedAssets, customers);
  const summary = {
    consumption: report.consumption,
    plannedHours: report.plannedHours,
    periodLabel: report.periodLabel,
    workingHours: report.workingHours,
    energyGenerated: report.energyGenerated,
    gasConsumption: report.gasConsumption,
    oilConsumption: report.oilConsumption,
    averageLoad: report.averageLoad,
    sfc: report.sfc,
    soc: report.soc,
    thermalEfficiency: report.thermalEfficiency,
    availability: report.availability,
    capacityFactor: report.capacityFactor,
    heatRate: report.heatRate
  };
  return {
    report_name: reportName,
    report_type: filters.reportType,
    site_id: filters.siteId ? Number(filters.siteId) : null,
    site_name: selectedSiteName(filters, customers),
    equipment_type: filters.equipmentType,
    asset_ids: JSON.stringify(selectedAssets.map(asset => String(asset.id))),
    asset_names: selectedAssets.map(asset => asset.name).join(", "),
    year: Number(filters.year || 0),
    month: Number(filters.month || 0),
    period_from: reportPeriodBounds(filters).from,
    period_to: reportPeriodBounds(filters).to,
    readings: JSON.stringify(readings),
    summary: JSON.stringify(summary),
    table_rows: JSON.stringify(report.tableRows),
    charts: JSON.stringify(report.charts)
  };
}

function buildAnnualOperationalReportPayload(report, filters) {
  const year = Number(filters.year || new Date().getFullYear());
  const summary = {
    consumption: {
      runningHours: report.workingHours,
      energy: report.energyGenerated,
      gas: report.gasConsumption,
      oil: report.oilConsumption
    },
    plannedHours: null,
    periodLabel: report.periodLabel,
    workingHours: report.workingHours,
    energyGenerated: report.energyGenerated,
    gasConsumption: report.gasConsumption,
    oilConsumption: report.oilConsumption,
    averageLoad: report.averageLoad,
    sfc: report.sfc,
    soc: report.soc,
    thermalEfficiency: report.thermalEfficiency ?? null,
    availability: report.availability,
    capacityFactor: report.capacityFactor ?? null,
    heatRate: report.heatRate ?? null,
    reportsCount: report.reportsCount,
    boundaryNote: report.boundaryNote,
    isAnnual: true
  };
  return {
    report_name: report.reportName || `${tr("en", "Annual Operational Performance Report")} - ${year}`,
    report_type: "yearly",
    site_id: filters.siteId ? Number(filters.siteId) : null,
    site_name: report.siteName || "",
    equipment_type: filters.equipmentType,
    asset_ids: JSON.stringify(filters.assetIds || []),
    asset_names: report.assetNames || "",
    year,
    month: 0,
    period_from: annualReportPeriodFrom(report, year),
    period_to: annualReportPeriodTo(report, year),
    readings: JSON.stringify({}),
    summary: JSON.stringify(summary),
    table_rows: JSON.stringify(report.monthlyRows || []),
    charts: JSON.stringify(report.charts || {})
  };
}

function annualReportPeriodFrom(report, year) {
  const firstMonth = Number(report.monthlyRows?.[0]?.month || 1);
  return `${year}-${String(firstMonth).padStart(2, "0")}-01`;
}

function annualReportPeriodTo(report, year) {
  const lastMonth = Number(report.monthlyRows?.[report.monthlyRows.length - 1]?.month || 12);
  const lastDay = new Date(year, lastMonth, 0).getDate();
  return `${year}-${String(lastMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function buildOperationalReportName(filters, selectedAssets, customers) {
  const siteName = selectedSiteName(filters, customers) || "All Sites";
  const assetName = selectedAssets.length === 1 ? selectedAssets[0].name : selectedAssets.length ? `${selectedAssets.length} Assets` : "All Assets";
  return `Operational Performance - ${siteName} - ${assetName} - ${reportPeriodLabel(filters, "en")}`;
}

function reportPeriodLabel(filters, language = "en") {
  const t = text => tr(language, text);
  if (filters.reportType === "custom" && filters.fromDate && filters.toDate) return `${filters.fromDate} - ${filters.toDate}`;
  if (filters.reportType === "yearly") return `${t("Year")} ${filters.year || new Date().getFullYear()}`;
  if (filters.reportType === "weekly") return `${t("Weekly")} / ${filters.year || new Date().getFullYear()}`;
  const month = monthOptions(language).find(option => String(option[0]) === String(filters.month))?.[1] || t("All Months");
  return `${month} ${filters.year || new Date().getFullYear()}`;
}

function reportPeriodBounds(filters) {
  if (filters.reportType === "custom") {
    return {
      from: filters.fromDate || "",
      to: filters.toDate || ""
    };
  }
  const year = Number(filters.year || new Date().getFullYear());
  if (filters.reportType === "yearly") {
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`
    };
  }
  const month = Number(filters.month || 1);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  };
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function reportFromSavedOperationalRecord(record, language = "en") {
  const summary = safeJsonParse(record.summary, {});
  const tableRows = safeJsonParse(record.table_rows, []);
  const charts = safeJsonParse(record.charts, {});
  if (isAnnualOperationalRecord(record) && (summary.isAnnual || tableRows.some(row => row?.monthLabel))) {
    return {
      reportName: record.report_name || `${tr(language, "Annual Operational Performance Report")} - ${record.year || ""}`.trim(),
      siteName: record.site_name || tr(language, "All Sites"),
      assetNames: record.asset_names || tr(language, "All"),
      periodLabel: summary.periodLabel || savedRecordPeriodLabel(record, language),
      boundaryNote: summary.boundaryNote || "",
      isComplete: true,
      isAnnual: true,
      reportsCount: numberValue(summary.reportsCount) || tableRows.length,
      workingHours: numberValue(summary.workingHours),
      energyGenerated: numberValue(summary.energyGenerated),
      gasConsumption: numberValue(summary.gasConsumption),
      oilConsumption: numberValue(summary.oilConsumption),
      averageLoad: numberValue(summary.averageLoad),
      sfc: numberValue(summary.sfc),
      soc: numberValue(summary.soc),
      thermalEfficiency: summary.thermalEfficiency ?? null,
      availability: numberValue(summary.availability),
      capacityFactor: summary.capacityFactor ?? null,
      heatRate: summary.heatRate ?? null,
      sourceRecordId: record.id,
      monthlyRows: tableRows,
      charts: {
        energy: charts.energy || [],
        gas: charts.gas || [],
        oil: charts.oil || [],
        averageLoad: charts.averageLoad || [],
        sfc: charts.sfc || [],
        soc: charts.soc || []
      }
    };
  }
  return {
    consumption: summary.consumption || {},
    plannedHours: numberValue(summary.plannedHours),
    periodLabel: summary.periodLabel || savedRecordPeriodLabel(record, language),
    workingHours: numberValue(summary.workingHours),
    energyGenerated: numberValue(summary.energyGenerated),
    gasConsumption: numberValue(summary.gasConsumption),
    oilConsumption: numberValue(summary.oilConsumption),
    averageLoad: numberValue(summary.averageLoad),
    sfc: numberValue(summary.sfc),
    soc: numberValue(summary.soc),
    thermalEfficiency: summary.thermalEfficiency ?? null,
    availability: numberValue(summary.availability),
    capacityFactor: summary.capacityFactor ?? null,
    heatRate: summary.heatRate ?? null,
    tableRows: tableRows.length ? tableRows : DEFAULT_OPERATIONAL_ITEMS.map(item => ({ ...item, previous: 0, current: 0, consumption: 0, average: 0 })),
    charts: {
      energy: charts.energy || [],
      gas: charts.gas || [],
      oil: charts.oil || [],
      averageLoad: charts.averageLoad || [],
      sfc: charts.sfc || [],
      soc: charts.soc || []
    }
  };
}

function savedRecordPeriodLabel(record, language = "en") {
  if (record.period_from && record.period_to) return `${record.period_from} - ${record.period_to}`;
  if (record.month) {
    const month = monthOptions(language).find(option => String(option[0]) === String(record.month))?.[1] || record.month;
    return `${month} ${record.year || ""}`.trim();
  }
  return record.year ? `${tr(language, "Year")} ${record.year}` : "";
}

function filterOperationalHistory(records, filters, historyReportType = "") {
  return records.filter(record => {
    if (historyReportType && normalizeReportType(record.report_type) !== historyReportType) return false;
    if (filters.year && Number(record.year || 0) !== Number(filters.year)) return false;
    if (filters.siteId && Number(record.site_id || 0) !== Number(filters.siteId)) return false;
    if (filters.equipmentType && String(record.equipment_type || "") !== String(filters.equipmentType)) return false;
    if (filters.assetIds.length) {
      const ids = safeJsonParse(record.asset_ids, []).map(String);
      if (!filters.assetIds.some(id => ids.includes(String(id)))) return false;
    }
    return true;
  });
}

function normalizeReportType(reportType) {
  return String(reportType || "").toLowerCase();
}

function isAnnualOperationalRecord(record) {
  return normalizeReportType(record?.report_type) === "yearly";
}

function reportTypeLabel(reportType) {
  const type = normalizeReportType(reportType);
  if (type === "yearly") return "Annual Report";
  if (type === "monthly") return "Monthly Report";
  if (type === "weekly") return "Weekly Report";
  if (type === "custom") return "Custom Report";
  return "Report";
}

function buildAnnualOperationalReport(records, filters, language = "en", items = DEFAULT_OPERATIONAL_ITEMS) {
  const year = Number(filters.year || new Date().getFullYear());
  const selectedAssetId = String(filters.assetIds[0] || "");
  const yearlyRecords = dedupeOperationalRecordsByMonth(records
    .filter(record => operationalRecordMatchesAnnualScope(record, filters, selectedAssetId, year))
    .sort(compareOperationalRecordPeriod));
  const openingRecord = yearlyRecords.find(record => operationalRecordYear(record) === year) || null;
  const closingRecord = yearlyRecords.find(record => operationalRecordMonth(record) === 12) || yearlyRecords[yearlyRecords.length - 1] || null;
  const isComplete = Boolean(openingRecord && closingRecord);
  const monthlyRows = yearlyRecords.map(record => {
    const delta = operationalRecordConsumptionDelta(record, items);
    return {
      month: operationalRecordMonth(record),
      monthLabel: operationalRecordLabel(record, language),
      reportsCount: 1,
      workingHours: delta.runningHours,
      energyGenerated: delta.energy,
      gasConsumption: delta.gas,
      oilConsumption: delta.oil,
      averageLoad: safeDivide(delta.energy, delta.runningHours),
      sfc: safeDivide(delta.gas, delta.energy),
      soc: safeDivide(delta.oil, delta.energy),
      availability: annualCoverageAvailability(delta.runningHours, record, record)
    };
  });
  const totals = isComplete
    ? operationalAnnualDelta(openingRecord, closingRecord, items)
    : { runningHours: 0, energy: 0, gas: 0, oil: 0 };
  const availability = isComplete
    ? annualCoverageAvailability(totals.runningHours, openingRecord, closingRecord)
    : 0;
  const assetName = closingRecord?.asset_names || openingRecord?.asset_names || records.find(record => operationalRecordIncludesAsset(record, selectedAssetId))?.asset_names || tr(language, "All");
  const siteName = closingRecord?.site_name || openingRecord?.site_name || tr(language, "All Sites");
  const periodLabel = openingRecord && closingRecord
    ? `${operationalRecordLabel(openingRecord, language)} - ${operationalRecordLabel(closingRecord, language)}`
    : `${tr(language, "Year")} ${year}`;
  const boundaryNote = isComplete
    ? `${tr(language, "Annual calculations use Previous readings from")} ${operationalRecordLabel(openingRecord, language)} ${tr(language, "to Current readings of")} ${operationalRecordLabel(closingRecord, language)}.`
    : tr(language, "Annual report requires at least one saved report in the selected year for the same generator.");
  return {
    reportName: `${tr(language, "Annual Operational Performance Report")} - ${year}`,
    siteName,
    assetNames: assetName,
    periodLabel,
    boundaryNote,
    isComplete,
    reportsCount: yearlyRecords.length,
    workingHours: totals.runningHours,
    energyGenerated: totals.energy,
    gasConsumption: totals.gas,
    oilConsumption: totals.oil,
    averageLoad: safeDivide(totals.energy, totals.runningHours),
    sfc: safeDivide(totals.gas, totals.energy),
    soc: safeDivide(totals.oil, totals.energy),
    availability,
    monthlyRows,
    charts: {
      energy: monthlyRows.map(row => ({ label: row.monthLabel, value: row.energyGenerated })),
      gas: monthlyRows.map(row => ({ label: row.monthLabel, value: row.gasConsumption })),
      oil: monthlyRows.map(row => ({ label: row.monthLabel, value: row.oilConsumption })),
      averageLoad: monthlyRows.map(row => ({ label: row.monthLabel, value: row.averageLoad })),
      sfc: monthlyRows.map(row => ({ label: row.monthLabel, value: row.sfc })),
      soc: monthlyRows.map(row => ({ label: row.monthLabel, value: row.soc }))
    }
  };
}

function operationalRecordMatchesAnnualScope(record, filters, selectedAssetId, year) {
  if (normalizeReportType(record.report_type) !== "monthly") return false;
  if (!operationalRecordIsSingleSelectedAsset(record, selectedAssetId)) return false;
  if (filters.siteId && Number(record.site_id || 0) !== Number(filters.siteId)) return false;
  if (filters.equipmentType && String(record.equipment_type || "") !== String(filters.equipmentType)) return false;
  return operationalRecordYear(record) === year;
}

function operationalRecordIncludesAsset(record, assetId) {
  if (!assetId) return false;
  return safeJsonParse(record.asset_ids, []).map(String).includes(String(assetId));
}

function operationalRecordIsSingleSelectedAsset(record, assetId) {
  if (!assetId) return false;
  const ids = safeJsonParse(record.asset_ids, []).map(String);
  return ids.length === 1 && ids[0] === String(assetId);
}

function dedupeOperationalRecordsByMonth(records) {
  const map = new Map();
  records.forEach(record => {
    const key = `${operationalRecordYear(record)}-${operationalRecordMonth(record)}`;
    const existing = map.get(key);
    if (!existing || String(record.created_at || "") >= String(existing.created_at || "")) {
      map.set(key, record);
    }
  });
  return [...map.values()].sort(compareOperationalRecordPeriod);
}

function compareOperationalRecordPeriod(a, b) {
  const yearDiff = operationalRecordYear(a) - operationalRecordYear(b);
  if (yearDiff) return yearDiff;
  const monthDiff = operationalRecordMonth(a) - operationalRecordMonth(b);
  if (monthDiff) return monthDiff;
  return String(a.created_at || "").localeCompare(String(b.created_at || ""));
}

function operationalRecordYear(record) {
  return Number(record.year || dateYear(record.period_from) || dateYear(record.created_at) || 0);
}

function operationalRecordMonth(record) {
  return Math.min(Math.max(Number(record.month || dateMonth(record.period_from) || dateMonth(record.created_at) || 1), 1), 12);
}

function operationalRecordLabel(record, language = "en") {
  const month = monthOptions(language).find(option => String(option[0]) === String(operationalRecordMonth(record)))?.[1] || operationalRecordMonth(record);
  return `${month} ${operationalRecordYear(record)}`;
}

function operationalReadings(record, field, items = DEFAULT_OPERATIONAL_ITEMS) {
  const readings = safeJsonParse(record.readings, {});
  return items.reduce((acc, item) => {
    acc[item.key] = numberValue(readings[item.key]?.[field]);
    return acc;
  }, {});
}

function operationalAnnualDelta(openingRecord, closingRecord, items = DEFAULT_OPERATIONAL_ITEMS) {
  const opening = operationalReadings(openingRecord, "previous", items);
  const closing = operationalReadings(closingRecord, "current", items);
  return items.reduce((acc, item) => {
    acc[item.key] = Math.max(numberValue(closing[item.key]) - numberValue(opening[item.key]), 0);
    return acc;
  }, {});
}

function operationalRecordConsumptionDelta(record, items = DEFAULT_OPERATIONAL_ITEMS) {
  const opening = operationalReadings(record, "previous", items);
  const closing = operationalReadings(record, "current", items);
  return items.reduce((acc, item) => {
    acc[item.key] = Math.max(numberValue(closing[item.key]) - numberValue(opening[item.key]), 0);
    return acc;
  }, {});
}

function annualCoverageAvailability(workingHours, openingRecord, closingRecord) {
  const from = new Date(operationalRecordYear(openingRecord), operationalRecordMonth(openingRecord) - 1, 1);
  const to = new Date(operationalRecordYear(closingRecord), operationalRecordMonth(closingRecord), 1);
  const hours = Math.max(Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60)), 1);
  return Math.min(safeDivide(workingHours, hours) * 100, 100);
}

function dateMonth(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getMonth() + 1 : 0;
}

function dateYear(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getFullYear() : 0;
}

function exportOperationalPerformancePdf(report, metadata = {}, language = "en") {
  const t = text => tr(language, text);
  const title = metadata.report_name || report.reportName || t("Operational Performance Report");
  const summaryRows = [
    ["Working Hours", report.workingHours],
    ["Energy Generated", report.energyGenerated],
    ["Gas Consumption", report.gasConsumption],
    ["Oil Consumption", report.oilConsumption],
    ["Average Load", report.averageLoad],
    ["SFC", report.sfc],
    ["SOC", report.soc],
    ["Availability", `${formatReportNumber(report.availability)}%`]
  ];
  const tableRows = report.monthlyRows || report.tableRows || [];
  const tableHeaders = report.monthlyRows
    ? ["Month", "Reports", "Working Hours", "Energy", "Gas", "Oil", "Average Load", "SFC", "SOC", "Availability"]
    : ["Item", "Previous", "Current", "Consumption", "Average"];
  const tableBody = tableRows.map(row => report.monthlyRows ? [
    row.monthLabel,
    row.reportsCount,
    formatReportNumber(row.workingHours),
    formatReportNumber(row.energyGenerated),
    formatReportNumber(row.gasConsumption),
    formatReportNumber(row.oilConsumption),
    formatReportNumber(row.averageLoad),
    formatReportNumber(row.sfc),
    formatReportNumber(row.soc),
    `${formatReportNumber(row.availability)}%`
  ] : [
    t(row.label),
    formatReportNumber(row.previous),
    formatReportNumber(row.current),
    formatReportNumber(row.consumption),
    formatReportNumber(row.average)
  ]);
  const trendCharts = operationalPdfTrendItems(report).map(item => renderOperationalPdfTrendChart(item, language)).join("");
  const win = window.open("", "_blank");
  if (!win) return;
  const fileName = `${String(title).replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
  win.document.write(`<!doctype html><html dir="${language === "ar" ? "rtl" : "ltr"}"><head><title>${escapeHtml(fileName)}</title><style>
    @page{size:A4;margin:14mm}
    body{font-family:Arial,sans-serif;color:#0f172a;margin:0;padding:24px;background:white}
    h1{font-size:22px;margin:0 0 6px}
    .meta{color:#475569;font-size:12px;margin-bottom:18px}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
    .card{border:1px solid #dbe3ef;border-radius:10px;padding:10px;background:#f8fafc}
    .label{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:800;letter-spacing:.08em}
    .value{font-size:18px;font-weight:900;margin-top:6px}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:14px}
    th,td{border:1px solid #cbd5e1;padding:7px;text-align:${language === "ar" ? "right" : "left"};vertical-align:top}
    th{background:#1d4ed8;color:white;font-weight:900}
    .section-title{font-size:14px;font-weight:900;margin-top:20px;color:#1d4ed8}
    .trend-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px}
    .trend-card{break-inside:avoid;border:1px solid #dbe3ef;border-radius:12px;padding:12px;background:#fff}
    .trend-title{font-size:12px;font-weight:900;color:#0f172a;margin-bottom:8px}
    .trend-empty{height:150px;display:grid;place-items:center;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:11px;font-weight:800}
    .trend-svg{width:100%;height:170px;display:block}
    .trend-label{fill:#475569;font-size:10px;font-weight:700}
    .trend-value{fill:#0f172a;font-size:10px;font-weight:900}
    .grid-line{stroke:#e2e8f0;stroke-width:1}
    .axis-line{stroke:#94a3b8;stroke-width:1.2}
    .trend-line{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .trend-dot{stroke:white;stroke-width:2}
    @media print{.trend-card{page-break-inside:avoid}.trend-grid{grid-template-columns:repeat(2,1fr)}}
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(t("Generated At"))}: ${escapeHtml(new Date().toLocaleString(language === "ar" ? "ar-EG" : "en-GB"))}</div>
    <div class="meta">${escapeHtml(t("Site"))}: ${escapeHtml(metadata.site_name || report.siteName || t("All Sites"))} &nbsp; | &nbsp; ${escapeHtml(t("Equipment"))}: ${escapeHtml(metadata.asset_names || report.assetNames || t("All"))} &nbsp; | &nbsp; ${escapeHtml(t("Period"))}: ${escapeHtml(report.periodLabel || metadata.year || "")}</div>
    <div class="grid">${summaryRows.map(([label, value]) => `<div class="card"><div class="label">${escapeHtml(t(label))}</div><div class="value">${escapeHtml(typeof value === "string" ? value : formatReportNumber(value))}</div></div>`).join("")}</div>
    <div class="section-title">${escapeHtml(report.monthlyRows ? t("Annual Monthly Summary") : t("Monthly Performance Table"))}</div>
    <table><thead><tr>${tableHeaders.map(header => `<th>${escapeHtml(t(header))}</th>`).join("")}</tr></thead><tbody>${tableBody.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="section-title">${escapeHtml(t("Operational Trends"))}</div>
    <div class="trend-grid">${trendCharts}</div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`);
  win.document.close();
}

function operationalPdfTrendItems(report) {
  const charts = report.charts || {};
  const monthlyRows = report.monthlyRows || [];
  return [
    { title: "Energy Production Trend", color: "#2563eb", data: charts.energy || monthlyRows.map(row => ({ label: row.monthLabel, value: row.energyGenerated })) },
    { title: "Gas Consumption Trend", color: "#16a34a", data: charts.gas || monthlyRows.map(row => ({ label: row.monthLabel, value: row.gasConsumption })) },
    { title: "Oil Consumption Trend", color: "#f97316", data: charts.oil || monthlyRows.map(row => ({ label: row.monthLabel, value: row.oilConsumption })) },
    { title: "Average Load", color: "#0f766e", data: charts.averageLoad || monthlyRows.map(row => ({ label: row.monthLabel, value: row.averageLoad })) },
    { title: "SFC", color: "#7c3aed", data: charts.sfc || monthlyRows.map(row => ({ label: row.monthLabel, value: row.sfc })) },
    { title: "SOC", color: "#dc2626", data: charts.soc || monthlyRows.map(row => ({ label: row.monthLabel, value: row.soc })) }
  ].filter(item => Array.isArray(item.data) && item.data.length);
}

function renderOperationalPdfTrendChart(item, language = "en") {
  const t = text => tr(language, text);
  const data = item.data.map(point => ({
    label: String(point.label || ""),
    value: numberValue(point.value)
  }));
  if (!data.length) {
    return `<div class="trend-card"><div class="trend-title">${escapeHtml(t(item.title))}</div><div class="trend-empty">${escapeHtml(t("No trend data available."))}</div></div>`;
  }
  const width = 360;
  const height = 170;
  const padding = { top: 18, right: 18, bottom: 42, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map(point => point.value), 1);
  const minValue = Math.min(...data.map(point => point.value), 0);
  const range = Math.max(maxValue - minValue, 1);
  const xFor = index => padding.left + (data.length === 1 ? plotWidth / 2 : (plotWidth * index) / (data.length - 1));
  const yFor = value => padding.top + plotHeight - ((value - minValue) / range) * plotHeight;
  const points = data.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(" ");
  const labels = data.map((point, index) => {
    const x = xFor(index);
    const label = point.label.length > 14 ? `${point.label.slice(0, 13)}...` : point.label;
    return `<text class="trend-label" x="${x}" y="${height - 14}" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join("");
  const dots = data.map((point, index) => {
    const x = xFor(index);
    const y = yFor(point.value);
    return `<circle class="trend-dot" cx="${x}" cy="${y}" r="4" fill="${item.color}"></circle><text class="trend-value" x="${x}" y="${Math.max(y - 8, 10)}" text-anchor="middle">${escapeHtml(formatReportNumber(point.value))}</text>`;
  }).join("");
  const gridLines = [0, 0.5, 1].map(ratio => {
    const y = padding.top + plotHeight * ratio;
    return `<line class="grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>`;
  }).join("");
  return `<div class="trend-card">
    <div class="trend-title">${escapeHtml(t(item.title))}</div>
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(t(item.title))}">
      ${gridLines}
      <line class="axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
      <line class="axis-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
      <polyline class="trend-line" points="${points}" stroke="${item.color}"></polyline>
      ${dots}
      ${labels}
    </svg>
  </div>`;
}

export function WorkOrderKpisPage({
  data,
  language
}) {
  const t = text => tr(language, text);
  const metrics = buildWorkOrderKpiMetrics(data["work-orders"] || []);
  return (
    <div className="space-y-5">
      <Panel title={t("Work Order KPIs")} subtitle={t("Execution, completion, cost, and downtime indicators moved from the Work Orders KPI sidebar.")}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ReportKpiCard label="Execution Duration" value={metrics.executionDuration} icon={Clock3} tone="blue" helper={t("Average execution time")} language={language} />
          <ReportKpiCard label="Completion" value={metrics.completionRate} icon={CheckCircle2} tone={metrics.completedCount ? "green" : "amber"} helper={`${metrics.completedCount} / ${metrics.totalOrders} ${t("completed")}`} language={language} />
          <ReportKpiCard label="Labor Cost" value={`${metrics.laborCost.toLocaleString()} EGP`} icon={Wrench} tone="slate" helper={t("Recorded labor cost")} language={language} />
          <ReportKpiCard label="Parts Cost" value={`${metrics.partsCost.toLocaleString()} EGP`} icon={Bell} tone={metrics.partsCost ? "amber" : "slate"} helper={t("Spare parts consumption")} language={language} />
          <ReportKpiCard label="Total Cost" value={`${metrics.totalCost.toLocaleString()} EGP`} icon={Activity} tone={metrics.totalCost ? "blue" : "slate"} helper={t("Labor plus spare parts")} language={language} />
          <ReportKpiCard label="Downtime" value={metrics.downtime} icon={TimerReset} tone={metrics.downtimeMinutes ? "red" : "slate"} helper={t("Total downtime exposure")} language={language} />
        </div>
      </Panel>

      <Panel title={t("Work Order KPI Summary")} subtitle={t("High-level work order performance snapshot.")}>
        <div className="grid gap-3 md:grid-cols-4">
          <AuditStatCard label={t("Total Work Orders")} value={metrics.totalOrders} tone="blue" />
          <AuditStatCard label={t("Completed")} value={metrics.completedCount} tone="green" />
          <AuditStatCard label={t("Open Work Orders")} value={metrics.openCount} tone={metrics.openCount ? "amber" : "green"} />
          <AuditStatCard label={t("Average Downtime")} value={metrics.averageDowntime} tone={metrics.downtimeMinutes ? "red" : "green"} />
        </div>
      </Panel>
    </div>
  );
}

function ReportKpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "blue",
  language
}) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-700 ring-blue-100",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "border-amber-100 bg-amber-50 text-amber-700 ring-amber-100",
    red: "border-red-100 bg-red-50 text-red-700 ring-red-100",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700 ring-cyan-100",
    slate: "border-slate-200 bg-slate-50 text-slate-700 ring-slate-100"
  };
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ring-1 ${colors[tone] || colors.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] opacity-80">{tr(language, label)}</p>
          <p className="mt-3 text-4xl font-black tracking-tight">{value}</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/80 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {helper ? <p className="mt-3 text-sm font-bold opacity-75">{helper}</p> : null}
    </article>
  );
}

export function AuditLogsPanel({
  logs = [],
  language,
  canDelete = false,
  onDeleteSelected
}) {
  const t = text => tr(language, text);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    module: "",
    action: "",
    status: "",
    from: "",
    to: ""
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const modules = uniqueValues(logs, "module");
  const actions = uniqueValues(logs, "action");
  const roles = uniqueValues(logs, "role");
  const statuses = uniqueValues(logs, "status");
  const filteredLogs = logs.filter(log => auditLogMatches(log, filters));
  const filteredIds = filteredLogs.map(log => Number(log.id));
  const selectedInFiltered = selectedIds.filter(id => filteredIds.includes(Number(id)));
  const allFilteredSelected = Boolean(filteredIds.length) && selectedInFiltered.length === filteredIds.length;
  const failedLogins = logs.filter(log => log.action === "LOGIN" && log.status === "FAILED").length;
  const assetChanges = logs.filter(log => log.module === "Assets").length;
  const workOrderUpdates = logs.filter(log => log.module === "Work Orders").length;
  const activeUsers = Object.keys(groupCount(logs, "user_name")).length;
  useEffect(() => {
    setSelectedIds(current => current.filter(id => logs.some(log => Number(log.id) === Number(id))));
  }, [logs]);
  function toggleLogSelection(logId) {
    const id = Number(logId);
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }
  function toggleFilteredSelection() {
    setSelectedIds(current => {
      if (allFilteredSelected) return current.filter(id => !filteredIds.includes(Number(id)));
      return [...new Set([...current, ...filteredIds])];
    });
  }
  async function deleteSelectedLogs() {
    if (!canDelete || !selectedIds.length || !onDeleteSelected) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected audit log entries?`);
    if (!confirmed) return;
    setDeleting(true);
    const ok = await onDeleteSelected(selectedIds);
    setDeleting(false);
    if (ok) {
      setSelectedIds([]);
      setSelectedLog(null);
    }
  }
  async function exportLogs(format) {
    await api.auditExport(format).catch(() => null);
    if (format === "csv") exportAuditCsv(filteredLogs);
    if (format === "excel") exportAuditExcel(filteredLogs);
    if (format === "pdf") exportAuditPdf(filteredLogs, language);
  }
  return <Panel title="Audit Logs" subtitle="Security audit trail for login, logout, create, update, delete, role changes, and critical operational actions." language={language} actions={<div className="flex flex-wrap gap-2">
          {canDelete ? <button type="button" onClick={deleteSelectedLogs} disabled={!selectedIds.length || deleting} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? t("Deleting...") : `${t("Delete Selected")} (${selectedIds.length})`}
            </button> : null}
          <button type="button" onClick={() => exportLogs("csv")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300">CSV</button>
          <button type="button" onClick={() => exportLogs("excel")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300">Excel</button>
          <button type="button" onClick={() => exportLogs("pdf")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
            <Printer className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>}>
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <AuditStatCard label="Recent Activity" value={logs.length} tone="blue" language={language} />
          <AuditStatCard label="Failed Login Attempts" value={failedLogins} tone={failedLogins ? "red" : "green"} language={language} />
          <AuditStatCard label="Most Active Users" value={activeUsers} tone="cyan" language={language} />
          <AuditStatCard label="Asset / Work Order Changes" value={`${assetChanges}/${workOrderUpdates}`} tone="amber" language={language} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("Search")}</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={filters.search} onChange={event => setFilters({
                ...filters,
                search: event.target.value
              })} placeholder={t("User, asset, work order, inventory item...")} className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none" />
              </div>
            </label>
            <AuditSelect label="Role" value={filters.role} options={roles} onChange={role => setFilters({
            ...filters,
            role
          })} language={language} />
            <AuditSelect label="Module" value={filters.module} options={modules} onChange={module => setFilters({
            ...filters,
            module
          })} language={language} />
            <AuditSelect label="Action" value={filters.action} options={actions} onChange={action => setFilters({
            ...filters,
            action
          })} language={language} />
            <AuditSelect label="Status" value={filters.status} options={statuses} onChange={status => setFilters({
            ...filters,
            status
          })} language={language} />
            <label>
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("From")}</span>
              <input type="date" value={filters.from} onChange={event => setFilters({
              ...filters,
              from: event.target.value
            })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("To")}</span>
              <input type="date" value={filters.to} onChange={event => setFilters({
              ...filters,
              to: event.target.value
            })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {canDelete ? <th className="whitespace-nowrap px-4 py-3 text-left font-black">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleFilteredSelection} className="h-4 w-4 rounded border-slate-300 text-blue-700" title={t("Select visible logs")} />
                    </th> : null}
                  {["Date & Time", "User", "Role", "Module", "Action", "Description", "IP Address", "Details"].map(heading => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left font-black">{t(heading)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => <tr key={log.id} onClick={canDelete ? () => toggleLogSelection(log.id) : undefined} className={`transition ${canDelete ? "cursor-pointer" : ""} ${selectedIds.includes(Number(log.id)) ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-cyan-50/50"}`}>
                    {canDelete ? <td className="whitespace-nowrap px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(Number(log.id))} onChange={() => toggleLogSelection(log.id)} onClick={event => event.stopPropagation()} className="h-4 w-4 rounded border-slate-300 text-blue-700" />
                      </td> : null}
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{formatAuditTimestamp(log.timestamp, language)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{log.user_name || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{t(log.role || "-")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{t(log.module)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><AuditActionBadge action={log.action} status={log.status} language={language} /></td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-slate-600">{log.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.ip_address || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button type="button" onClick={event => {
                    event.stopPropagation();
                    setSelectedLog(log);
                  }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        <Eye className="h-3.5 w-3.5" />
                        {t("Open")}
                      </button>
                    </td>
                  </tr>)}
                {!filteredLogs.length ? <tr>
                    <td colSpan={canDelete ? 9 : 8} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">
                      {t("No audit logs match the current filters.")}
                    </td>
                  </tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLog ? <AuditLogDetails log={selectedLog} onClose={() => setSelectedLog(null)} language={language} /> : null}
      </div>
    </Panel>;
}

export function AuditStatCard({
  label,
  value,
  tone = "blue",
  language
}) {
  const t = text => tr(language, text);
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    red: "border-red-100 bg-red-50 text-red-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700"
  };
  return <div className={`rounded-xl border p-4 ${colors[tone] || colors.blue}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-80">{t(label)}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>;
}

export function buildWorkOrderKpiMetrics(workOrders = []) {
  const totalOrders = workOrders.length;
  const completedStatuses = new Set(["completed", "approved", "closed"]);
  const completedCount = workOrders.filter(order => completedStatuses.has(String(order.status || "").toLowerCase())).length;
  const openCount = Math.max(totalOrders - completedCount, 0);
  const durationMinutes = workOrders.map(workOrderDurationMinutes).filter(value => value > 0);
  const totalDurationMinutes = durationMinutes.reduce((sum, value) => sum + value, 0);
  const downtimeMinutes = workOrders.reduce((sum, order) => sum + Number(order.work_duration_minutes || 0), 0) || totalDurationMinutes;
  const laborCost = workOrders.reduce((sum, order) => sum + numericValue(order.labor_cost || order.actual_labor_cost), 0);
  const partsCost = workOrders.reduce((sum, order) => sum + workOrderPartsCost(order), 0);
  const averageDuration = durationMinutes.length ? Math.round(totalDurationMinutes / durationMinutes.length) : 0;
  const averageDowntime = totalOrders ? Math.round(downtimeMinutes / totalOrders) : 0;
  return {
    totalOrders,
    completedCount,
    openCount,
    executionDuration: formatMinutesLabel(averageDuration),
    completionRate: totalOrders ? `${Math.round(completedCount / totalOrders * 100)}%` : "0%",
    laborCost,
    partsCost,
    totalCost: laborCost + partsCost,
    downtimeMinutes,
    downtime: formatMinutesLabel(downtimeMinutes),
    averageDowntime: formatMinutesLabel(averageDowntime)
  };
}

function workOrderDurationMinutes(order) {
  const savedDuration = Number(order.work_duration_minutes || 0);
  if (savedDuration > 0) return savedDuration;
  const meta = parseWorkOrderNotes(order.notes);
  return parseDurationMinutes(meta.duration || calculateDuration(meta.start_time, meta.finished_time));
}

function workOrderPartsCost(order) {
  const meta = parseWorkOrderNotes(order.notes);
  return (meta.spare_parts_items || []).reduce((sum, item) => {
    const directTotal = numericValue(item.total || item.total_cost);
    if (directTotal) return sum + directTotal;
    return sum + numericValue(item.qty) * numericValue(item.unit_cost || item.cost);
  }, 0);
}

function parseDurationMinutes(value) {
  const text = String(value || "");
  const match = text.match(/^(\d+):(\d{1,2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutesLabel(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return `${hours}:${String(rest).padStart(2, "0")}`;
}

function numericValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function AuditSelect({
  label,
  value,
  options,
  onChange,
  language
}) {
  const t = text => tr(language, text);
  return <label>
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t(label)}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none">
        <option value="">{t("All")}</option>
        {options.map(option => <option key={option} value={option}>{t(option)}</option>)}
      </select>
    </label>;
}

export function AuditActionBadge({
  action,
  status,
  language
}) {
  const failed = status === "FAILED";
  const destructive = ["DELETE", "REJECT", "FAILED"].includes(action) || failed;
  const positive = ["CREATE", "LOGIN", "APPROVE", "CLOSE", "EXPORT"].includes(action);
  const style = destructive ? "border-red-200 bg-red-50 text-red-700" : positive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${style}`}>{tr(language, action)}</span>;
}

export function AuditLogDetails({
  log,
  onClose,
  language
}) {
  const t = text => tr(language, text);
  const oldValues = parseAuditJson(log.old_values);
  const newValues = parseAuditJson(log.new_values);
  const fields = auditChangedFields(oldValues, newValues);
  const summary = auditChangeSummary(log, oldValues, newValues, fields, language);
  return <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">{t("Audit Entry")} #{log.id}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{log.description}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">{t("Close")}</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <InfoTile icon={ShieldCheck} title={t("User Details")} text={`${log.user_name || "-"} / ${t(log.role || "-")}`} />
        <InfoTile icon={Clock3} title={t("Timestamp")} text={formatAuditTimestamp(log.timestamp, language)} />
        <InfoTile icon={Activity} title={t("Action")} text={`${t(log.module)} / ${t(log.action)}`} />
        <InfoTile icon={Filter} title={t("Changed Fields")} text={fields.length ? fields.map(humanizeAuditField).join(", ") : t("Snapshot only")} />
      </div>
      <AuditChangeSummary text={summary} language={language} />
    </div>;
}

export function AuditChangeSummary({
  text,
  language
}) {
  const t = text => tr(language, text);
  return <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-black text-slate-950">{t("Change Summary")}</h4>
      <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">{text}</p>
    </div>;
}

export function uniqueValues(rows, key) {
  return [...new Set(rows.map(row => row[key]).filter(Boolean))].sort();
}

export function groupCount(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "-";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export function auditLogMatches(log, filters) {
  const searchText = `${log.user_name} ${log.description} ${log.record_id} ${log.module} ${log.action}`.toLowerCase();
  if (filters.search && !searchText.includes(filters.search.toLowerCase())) return false;
  if (filters.role && log.role !== filters.role) return false;
  if (filters.module && log.module !== filters.module) return false;
  if (filters.action && log.action !== filters.action) return false;
  if (filters.status && log.status !== filters.status) return false;
  if (filters.from && String(log.timestamp).slice(0, 10) < filters.from) return false;
  if (filters.to && String(log.timestamp).slice(0, 10) > filters.to) return false;
  return true;
}

export function parseAuditJson(value) {
  if (!value) return {};
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return {
      raw: value
    };
  }
}

export function auditChangedFields(oldValues, newValues) {
  const keys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);
  return [...keys].filter(key => JSON.stringify(oldValues?.[key]) !== JSON.stringify(newValues?.[key]));
}

export function auditChangeSummary(log, oldValues, newValues, fields, language) {
  const t = text => tr(language, text);
  const action = String(log.action || "").toUpperCase();
  if (oldValues?.deleted_count) {
    return `${t("Deleted")} ${oldValues.deleted_count} ${t("selected audit log entries.")}`;
  }
  if (fields.length) {
    const readable = fields.filter(field => field !== "deleted_logs").slice(0, 3).map(field => `${humanizeAuditField(field)} ${t("changed from")} ${formatAuditValue(oldValues?.[field], language)} ${t("to")} ${formatAuditValue(newValues?.[field], language)}`);
    const extra = fields.length > 3 ? `, ${t("plus")} ${fields.length - 3} ${t("more fields")}` : "";
    return `${readable.join("; ")}${extra}.`;
  }
  if (action === "LOGIN") return log.status === "FAILED" ? t("Login attempt failed.") : t("User logged in successfully.");
  if (action === "LOGOUT") return t("User logged out.");
  if (action === "CREATE") return log.description || t("A new record was created.");
  if (action === "DELETE") return log.description || t("The selected record was deleted.");
  if (action === "EXPORT") return log.description || t("A report export was completed.");
  return log.description || t("No field-level changes were recorded.");
}

export function humanizeAuditField(field) {
  return String(field || "").replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function formatAuditValue(value, language) {
  const t = text => tr(language, text);
  if (value === null || value === undefined || value === "") return t("empty");
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? t("item") : t("items")}`;
  if (typeof value === "object") return t("structured data");
  const text = String(value);
  return text.length > 70 ? `${text.slice(0, 70)}...` : text;
}

export function formatAuditTimestamp(value, language = "en") {
  if (!value) return "-";
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(String(value));
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(date);
}

export function auditExportRows(logs) {
  return logs.map(log => ({
    "Date & Time": formatAuditTimestamp(log.timestamp),
    User: log.user_name || "",
    Role: log.role || "",
    Module: log.module || "",
    Action: log.action || "",
    Description: log.description || "",
    "IP Address": log.ip_address || "",
    Status: log.status || ""
  }));
}

export function exportAuditCsv(logs) {
  const rows = auditExportRows(logs);
  const headers = Object.keys(rows[0] || {
    "Date & Time": "",
    User: "",
    Role: "",
    Module: "",
    Action: "",
    Description: "",
    "IP Address": "",
    Status: ""
  });
  const csv = [headers.join(","), ...rows.map(row => headers.map(header => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  downloadTextFile(`audit-logs-${todayFileStamp()}.csv`, csv, "text/csv;charset=utf-8");
}

export function exportAuditExcel(logs) {
  const rows = auditExportRows(logs);
  const headers = Object.keys(rows[0] || {
    "Date & Time": "",
    User: "",
    Role: "",
    Module: "",
    Action: "",
    Description: "",
    "IP Address": "",
    Status: ""
  });
  const table = `<table><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  downloadTextFile(`audit-logs-${todayFileStamp()}.xls`, table, "application/vnd.ms-excel;charset=utf-8");
}

export function exportAuditPdf(logs, language = "en") {
  const rows = auditExportRows(logs);
  const headers = Object.keys(rows[0] || {
    "Date & Time": "",
    User: "",
    Role: "",
    Module: "",
    Action: "",
    Description: "",
    "IP Address": "",
    Status: ""
  });
  const table = `<table><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const win = window.open("", "_blank");
  if (!win) return;
  const title = tr(language, "Audit Logs");
  win.document.write(`<!doctype html><html dir="${language === "ar" ? "rtl" : "ltr"}"><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:22px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:${language === "ar" ? "right" : "left"}}th{background:#e2e8f0}</style></head><body><h1>${escapeHtml(title)}</h1>${table}<script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
}

export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], {
    type: mimeType
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function todayFileStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
