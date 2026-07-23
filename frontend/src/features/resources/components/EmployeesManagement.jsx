import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { StatusBadge } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { EMPLOYEE_ROLE_OPTIONS } from "../../authentication/services/authSession.js";
import { employeeCode, employeeDepartment, employeeGroupTitle, employeeJobTitle, employeeMatchesGroup, employeeRole, employeeRoleLabel, employeeSupervisor, employeeWorkLocation, isEngineerEmployee, isManagementEmployee, isSupervisorEmployee, isTechnicianEmployee, uniqueSorted } from "../utils/employeeUtils.js";
import { Building2, CheckCircle2, Pencil, Plus, Search, ShieldCheck, Trash2, UsersRound, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

export function EmployeesManagementPage({
  rows,
  jobTitles = [],
  onCreate,
  onEdit,
  onDelete,
  onAddJobTitle,
  onDeleteJobTitle,
  canAdd,
  canEdit,
  canDelete,
  language
}) {
  const t = text => tr(language, text);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    role: "",
    status: "",
    department: ""
  });
  const [activeGroup, setActiveGroup] = useState("");
  const departments = useMemo(() => uniqueSorted(rows.map(employeeDepartment).filter(value => value !== "-")), [rows]);
  const scopedRows = useMemo(() => rows.filter(employee => employeeMatchesGroup(employee, activeGroup)), [rows, activeGroup]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scopedRows.filter(employee => {
      const searchable = [employeeCode(employee), employee.name, employeeJobTitle(employee), employeeDepartment(employee), employeeRoleLabel(employee.role), employee.phone, employee.email, employeeWorkLocation(employee), employeeSupervisor(employee), employee.status].join(" ").toLowerCase();
      const matchesSearch = !term || searchable.includes(term);
      const matchesRole = !filters.role || employeeRole(employee.role) === filters.role;
      const matchesStatus = !filters.status || employee.status === filters.status;
      const matchesDepartment = !filters.department || employeeDepartment(employee) === filters.department;
      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [scopedRows, search, filters]);
  const activeStaff = rows.filter(employee => employee.status === "active" && !isManagementEmployee(employee)).length;
  const technicians = rows.filter(isTechnicianEmployee).length;
  const engineers = rows.filter(isEngineerEmployee).length;
  const management = rows.filter(isManagementEmployee).length;
  const supervisors = rows.filter(isSupervisorEmployee).length;
  const activeGroupTitle = employeeGroupTitle(activeGroup, language);
  return <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <EmployeeMetricButton label={t("Total Employees")} value={rows.length} icon={UsersRound} tone="blue" helper={t("All registered staff")} active={activeGroup === "all"} onClick={() => setActiveGroup("all")} />
        <EmployeeMetricButton label={t("Active Staff")} value={activeStaff} icon={CheckCircle2} tone="green" helper={t("Active staff")} active={activeGroup === "active"} onClick={() => setActiveGroup("active")} />
        <EmployeeMetricButton label={t("Management")} value={management} icon={Building2} tone="slate" helper={t("Branch, site, and O&M managers")} active={activeGroup === "management"} onClick={() => setActiveGroup("management")} />
        <EmployeeMetricButton label={t("Engineers")} value={engineers} icon={ShieldCheck} tone="orange" helper={t("Engineering roles")} active={activeGroup === "engineers"} onClick={() => setActiveGroup("engineers")} />
        <EmployeeMetricButton label={t("Supervisors")} value={supervisors} icon={ShieldCheck} tone="green" helper={t("Supervision and team leadership roles")} active={activeGroup === "supervisors"} onClick={() => setActiveGroup("supervisors")} />
        <EmployeeMetricButton label={t("Technicians")} value={technicians} icon={Wrench} tone="cyan" helper={t("Technical execution roles")} active={activeGroup === "technicians"} onClick={() => setActiveGroup("technicians")} />
      </div>

      {activeGroup ? <>
          <Panel title={`${t("Employees Management")} - ${activeGroupTitle}`} subtitle={t("SAP-style employee directory with role-based access, operational status, and maintenance team structure.")} actions={canAdd ? <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
                <Plus className="h-4 w-4" />
                {t("Add Employee")}
              </button> : null}>
            <div className="mb-5 grid gap-3 xl:grid-cols-[1fr_180px_180px_220px]">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Search employees")} className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" />
              </label>
              <EmployeeFilterSelect label={t("Role")} value={filters.role} onChange={value => setFilters(current => ({
            ...current,
            role: value
          }))} options={["", ...EMPLOYEE_ROLE_OPTIONS]} language={language} />
              <EmployeeFilterSelect label={t("Status")} value={filters.status} onChange={value => setFilters(current => ({
            ...current,
            status: value
          }))} options={["", "active", "off_duty", "inactive"]} language={language} />
              <EmployeeFilterSelect label={t("Department")} value={filters.department} onChange={value => setFilters(current => ({
            ...current,
            department: value
          }))} options={["", ...departments]} language={language} />
            </div>

            <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
              {filteredRows.map(employee => <EmployeeCard key={employee.id} employee={employee} onEdit={canEdit ? onEdit : null} onDelete={canDelete ? onDelete : null} language={language} />)}
              {!filteredRows.length ? <EmptyState title={t("No employees found")} message={t("Adjust search or filters to view staff records.")} language={language} /> : null}
            </div>
          </Panel>

          <Panel title={t("Employee Directory")} subtitle={t("Structured table for HR, maintenance, and access-control review.")}>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-auto">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      {["Employee ID", "Full Name", "Job Title", "Department", "Role", "Phone", "Email", "Work Location", "Status", "Supervisor"].map(label => <th key={label} className="px-4 py-3 text-left font-black">{t(label)}</th>)}
                      {canEdit || canDelete ? <th className="px-4 py-3 text-right font-black">{t("Actions")}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map(employee => <tr key={employee.id} className="bg-white hover:bg-cyan-50/60">
                        <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{employeeCode(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="font-black text-slate-950">{employee.name}</p>
                          <p className="text-xs font-semibold text-slate-500">@{employee.username || t("no-login")}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{employeeJobTitle(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{employeeDepartment(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><RoleBadge value={employee.role} language={language} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee.phone || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee.email || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employeeWorkLocation(employee)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={employee.status} language={language} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employeeSupervisor(employee)}</td>
                        {canEdit || canDelete ? <td className="whitespace-nowrap px-4 py-3 text-right">
                            {canEdit ? <button type="button" onClick={() => onEdit(employee)} className="mr-2 inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:border-cyan-500 hover:text-cyan-700">
                                <Pencil className="h-3 w-3" />
                                {t("Edit")}
                              </button> : null}
                            {canDelete ? <button type="button" onClick={() => onDelete(employee.id)} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3 w-3" />
                                {t("Delete")}
                              </button> : null}
                          </td> : null}
                      </tr>)}
                    {!filteredRows.length ? <tr><td colSpan={canEdit || canDelete ? 11 : 10} className="px-4 py-10 text-center text-slate-500">{t("No records found.")}</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </> : null}
    </div>;
}

export function EmployeeMetricButton({
  label,
  value,
  icon: Icon,
  tone = "blue",
  helper,
  active,
  onClick
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return <button type="button" onClick={onClick} className={`group rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-xl border ${tones[tone] || tones.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {helper ? <p className="mt-4 text-sm text-slate-500">{helper}</p> : null}
    </button>;
}

export function EmployeeCard({
  employee,
  onEdit,
  onDelete,
  language
}) {
  const t = text => tr(language, text);
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-950 text-white">
            <UsersRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{employeeCode(employee)}</p>
            <h3 className="mt-1 text-base font-black text-slate-950">{employee.name}</h3>
          </div>
        </div>
        <StatusBadge value={employee.status} language={language} />
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <EmployeeInfo label={t("Job Title")} value={employeeJobTitle(employee)} />
        <EmployeeInfo label={t("Department")} value={employeeDepartment(employee)} />
        <EmployeeInfo label={t("Work Location")} value={employeeWorkLocation(employee)} />
        <EmployeeInfo label={t("Supervisor")} value={employeeSupervisor(employee)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <RoleBadge value={employee.role} language={language} />
        <div className="flex gap-2">
          {onEdit ? <button type="button" onClick={() => onEdit(employee)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-400 hover:text-blue-700">{t("Edit")}</button> : null}
          {onDelete ? <button type="button" onClick={() => onDelete(employee.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">{t("Delete")}</button> : null}
        </div>
      </div>
    </article>;
}

export function EmployeeInfo({
  label,
  value
}) {
  return <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="truncate text-right font-semibold text-slate-800">{value || "-"}</span>
    </div>;
}

export function EmployeeFilterSelect({
  label,
  value,
  onChange,
  options,
  language
}) {
  const t = text => tr(language, text);
  return <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none">
        {options.map(option => <option key={option || "all"} value={option}>{option ? filterOptionLabel(option, language) : t("All")}</option>)}
      </select>
    </label>;
}

export function filterOptionLabel(option, language) {
  return tr(language, EMPLOYEE_ROLE_OPTIONS.includes(option) ? employeeRoleLabel(option) : String(option).replaceAll("_", " "));
}

export function RoleBadge({
  value,
  language
}) {
  const role = employeeRole(value);
  const tone = {
    admin: "border-red-200 bg-red-50 text-red-700",
    engineer: "border-blue-200 bg-blue-50 text-blue-700",
    store_keeper: "border-amber-200 bg-amber-50 text-amber-700",
    viewer: "border-slate-200 bg-slate-100 text-slate-600"
  }[role] || "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{tr(language, employeeRoleLabel(role))}</span>;
}
