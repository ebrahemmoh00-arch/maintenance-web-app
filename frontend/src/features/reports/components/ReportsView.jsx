import { Panel } from "../../../shared/components/Panel.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { BarChart3, Factory } from "lucide-react";
import { useState } from "react";
import { OperationalPerformanceReport } from "./OperationalPerformanceReport.jsx";
import { WorkOrderKpisPage } from "./WorkOrderKpisPage.jsx";

export { OperationalPerformanceReport } from "./OperationalPerformanceReport.jsx";
export { ReportKpiCard, WorkOrderKpisPage, buildWorkOrderKpiMetrics } from "./WorkOrderKpisPage.jsx";
export {
  AuditActionBadge,
  AuditChangeSummary,
  AuditLogDetails,
  AuditLogsPanel,
  AuditSelect,
  AuditStatCard,
  auditChangeSummary,
  auditChangedFields,
  auditExportRows,
  auditLogMatches,
  downloadTextFile,
  escapeHtml,
  exportAuditCsv,
  exportAuditExcel,
  exportAuditPdf,
  formatAuditTimestamp,
  formatAuditValue,
  groupCount,
  humanizeAuditField,
  parseAuditJson,
  todayFileStamp,
  uniqueValues
} from "./AuditLogsPanel.jsx";

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
