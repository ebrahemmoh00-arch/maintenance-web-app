import { api } from "../../../api.js";
import { Panel } from "../../../shared/components/Panel.jsx";
import { hasPermission, tr } from "../../../shared/config/appConfig.jsx";
import { ArrowLeft, BarChart3, CheckCircle2, Eye, Gauge, Printer, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnnualOperationalReportOutput, OperationalItemsManager, OperationalReportHistory, OperationalReportOutput, ReportDateInput, ReportSelect } from "./OperationalReportSections.jsx";
import { exportOperationalPerformancePdf } from "./operationalReportPdf.js";
import {
  DEFAULT_OPERATIONAL_ITEMS,
  buildAnnualOperationalReport,
  buildAnnualOperationalReportPayload,
  buildOperationalReport,
  buildOperationalReportPayload,
  emptyOperationalItemForm,
  filterOperationalHistory,
  formatReportNumber,
  initialOperationalReadings,
  listResponseItems,
  monthOptions,
  normalizeOperationalItem,
  normalizeOperationalReadings,
  reportFromSavedOperationalRecord
} from "./operationalReportUtils.js";

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
