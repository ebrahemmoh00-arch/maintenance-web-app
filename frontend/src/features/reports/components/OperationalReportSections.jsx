import { LineChart } from "../../../shared/components/Charts.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { Activity, BarChart3, CheckCircle2, Clock3, Eye, Printer, Trash2, Wrench, Zap, Gauge } from "lucide-react";
import { AuditStatCard, formatAuditTimestamp } from "./AuditLogsPanel.jsx";
import { ReportKpiCard } from "./WorkOrderKpisPage.jsx";
import { formatReportNumber, isAnnualOperationalRecord, reportFromSavedOperationalRecord, reportTypeLabel } from "./operationalReportUtils.js";

export function OperationalReportOutput({
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

export function OperationalReportHistory({
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

export function AnnualOperationalReportOutput({
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

export function OperationalItemsManager({
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

export function ReportSelect({
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

export function ReportDateInput({
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
