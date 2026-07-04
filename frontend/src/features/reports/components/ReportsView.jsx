import { api } from "../../../api.js";
import { MetricCard } from "../../../shared/components/MetricCard.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { ClipboardIcon } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { AnalyticsSection } from "../../dashboard/components/AnalyticsAndNotifications.jsx";
import { InfoTile } from "../../settings/components/SettingsViews.jsx";
import { Activity, Bell, Clock3, Eye, Filter, Printer, Search, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

export function Reports({
  data,
  alerts,
  stats,
  language,
  canViewAuditLogs = false,
  canDeleteAuditLogs = false,
  onDeleteAuditLogs
}) {
  const t = text => tr(language, text);
  return <>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label={t("Total Orders")} value={stats.total_orders} icon={ClipboardIcon} tone="blue" />
        <MetricCard label={t("Alerts")} value={alerts.length} icon={Bell} tone={alerts.length ? "red" : "green"} />
        <MetricCard label={t("Assets Monitored")} value={data.equipment.length} icon={Wrench} tone="cyan" />
      </div>
      <AnalyticsSection data={data} alerts={alerts} language={language} />
      {canViewAuditLogs ? <AuditLogsPanel logs={data["audit-logs"] || []} language={language} canDelete={canDeleteAuditLogs} onDeleteSelected={onDeleteAuditLogs} /> : null}
    </>;
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
    if (format === "pdf") exportAuditPdf(filteredLogs);
  }
  return <Panel title="Audit Logs" subtitle="Security audit trail for login, logout, create, update, delete, role changes, and critical operational actions." actions={<div className="flex flex-wrap gap-2">
          {canDelete ? <button type="button" onClick={deleteSelectedLogs} disabled={!selectedIds.length || deleting} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
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
          <AuditStatCard label="Recent Activity" value={logs.length} tone="blue" />
          <AuditStatCard label="Failed Login Attempts" value={failedLogins} tone={failedLogins ? "red" : "green"} />
          <AuditStatCard label="Most Active Users" value={activeUsers} tone="cyan" />
          <AuditStatCard label="Asset / Work Order Changes" value={`${assetChanges}/${workOrderUpdates}`} tone="amber" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Search</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={filters.search} onChange={event => setFilters({
                ...filters,
                search: event.target.value
              })} placeholder="User, asset, work order, inventory item..." className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none" />
              </div>
            </label>
            <AuditSelect label="Role" value={filters.role} options={roles} onChange={role => setFilters({
            ...filters,
            role
          })} />
            <AuditSelect label="Module" value={filters.module} options={modules} onChange={module => setFilters({
            ...filters,
            module
          })} />
            <AuditSelect label="Action" value={filters.action} options={actions} onChange={action => setFilters({
            ...filters,
            action
          })} />
            <AuditSelect label="Status" value={filters.status} options={statuses} onChange={status => setFilters({
            ...filters,
            status
          })} />
            <label>
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">From</span>
              <input type="date" value={filters.from} onChange={event => setFilters({
              ...filters,
              from: event.target.value
            })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">To</span>
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
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleFilteredSelection} className="h-4 w-4 rounded border-slate-300 text-blue-700" title="Select visible logs" />
                    </th> : null}
                  {["Date & Time", "User", "Role", "Module", "Action", "Description", "IP Address", "Details"].map(heading => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left font-black">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => <tr key={log.id} onClick={canDelete ? () => toggleLogSelection(log.id) : undefined} className={`transition ${canDelete ? "cursor-pointer" : ""} ${selectedIds.includes(Number(log.id)) ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-cyan-50/50"}`}>
                    {canDelete ? <td className="whitespace-nowrap px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(Number(log.id))} onChange={() => toggleLogSelection(log.id)} onClick={event => event.stopPropagation()} className="h-4 w-4 rounded border-slate-300 text-blue-700" />
                      </td> : null}
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{formatAuditTimestamp(log.timestamp)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{log.user_name || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.role || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.module}</td>
                    <td className="whitespace-nowrap px-4 py-3"><AuditActionBadge action={log.action} status={log.status} /></td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-slate-600">{log.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.ip_address || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button type="button" onClick={event => {
                    event.stopPropagation();
                    setSelectedLog(log);
                  }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        <Eye className="h-3.5 w-3.5" />
                        Open
                      </button>
                    </td>
                  </tr>)}
                {!filteredLogs.length ? <tr>
                    <td colSpan={canDelete ? 9 : 8} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">
                      No audit logs match the current filters.
                    </td>
                  </tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLog ? <AuditLogDetails log={selectedLog} onClose={() => setSelectedLog(null)} /> : null}
      </div>
    </Panel>;
}

export function AuditStatCard({
  label,
  value,
  tone = "blue"
}) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    red: "border-red-100 bg-red-50 text-red-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700"
  };
  return <div className={`rounded-xl border p-4 ${colors[tone] || colors.blue}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>;
}

export function AuditSelect({
  label,
  value,
  options,
  onChange
}) {
  return <label>
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none">
        <option value="">All</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>;
}

export function AuditActionBadge({
  action,
  status
}) {
  const failed = status === "FAILED";
  const destructive = ["DELETE", "REJECT", "FAILED"].includes(action) || failed;
  const positive = ["CREATE", "LOGIN", "APPROVE", "CLOSE", "EXPORT"].includes(action);
  const style = destructive ? "border-red-200 bg-red-50 text-red-700" : positive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${style}`}>{action}</span>;
}

export function AuditLogDetails({
  log,
  onClose
}) {
  const oldValues = parseAuditJson(log.old_values);
  const newValues = parseAuditJson(log.new_values);
  const fields = auditChangedFields(oldValues, newValues);
  const summary = auditChangeSummary(log, oldValues, newValues, fields);
  return <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">Audit Entry #{log.id}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{log.description}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Close</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <InfoTile icon={ShieldCheck} title="User Details" text={`${log.user_name || "-"} / ${log.role || "-"}`} />
        <InfoTile icon={Clock3} title="Timestamp" text={formatAuditTimestamp(log.timestamp)} />
        <InfoTile icon={Activity} title="Action" text={`${log.module} / ${log.action}`} />
        <InfoTile icon={Filter} title="Changed Fields" text={fields.length ? fields.join(", ") : "Snapshot only"} />
      </div>
      <AuditChangeSummary text={summary} />
    </div>;
}

export function AuditChangeSummary({
  text
}) {
  return <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-black text-slate-950">Change Summary</h4>
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

export function auditChangeSummary(log, oldValues, newValues, fields) {
  const action = String(log.action || "").toUpperCase();
  if (oldValues?.deleted_count) {
    return `Deleted ${oldValues.deleted_count} selected audit log entries.`;
  }
  if (fields.length) {
    const readable = fields.filter(field => field !== "deleted_logs").slice(0, 3).map(field => `${humanizeAuditField(field)} changed from ${formatAuditValue(oldValues?.[field])} to ${formatAuditValue(newValues?.[field])}`);
    const extra = fields.length > 3 ? `, plus ${fields.length - 3} more field${fields.length - 3 === 1 ? "" : "s"}` : "";
    return `${readable.join("; ")}${extra}.`;
  }
  if (action === "LOGIN") return log.status === "FAILED" ? "Login attempt failed." : "User logged in successfully.";
  if (action === "LOGOUT") return "User logged out.";
  if (action === "CREATE") return log.description || "A new record was created.";
  if (action === "DELETE") return log.description || "The selected record was deleted.";
  if (action === "EXPORT") return log.description || "A report export was completed.";
  return log.description || "No field-level changes were recorded.";
}

export function humanizeAuditField(field) {
  return String(field || "").replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function formatAuditValue(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "structured data";
  const text = String(value);
  return text.length > 70 ? `${text.slice(0, 70)}...` : text;
}

export function formatAuditTimestamp(value) {
  if (!value) return "-";
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(String(value));
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
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

export function exportAuditPdf(logs) {
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
  win.document.write(`<!doctype html><html><head><title>Audit Logs</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:22px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#e2e8f0}</style></head><body><h1>Audit Logs</h1>${table}<script>window.onload=()=>window.print()</script></body></html>`);
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
