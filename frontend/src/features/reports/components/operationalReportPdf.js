import { tr } from "../../../shared/config/appConfig.jsx";
import { escapeHtml } from "./AuditLogsPanel.jsx";
import { formatReportNumber } from "./operationalReportUtils.js";

export function exportOperationalPerformancePdf(report, metadata = {}, language = "en") {
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
