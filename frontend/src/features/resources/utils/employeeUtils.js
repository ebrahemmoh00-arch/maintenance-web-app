import { normalizeEmployeeRole, tr } from "../../../shared/config/appConfig.jsx";
import { MANAGEMENT_JOB_TITLES, MANAGEMENT_JOB_TITLE_ALIASES } from "../../authentication/services/authSession.js";

export function employeeCode(employee) {
  return employee?.employee_code || `EMP-${String(employee?.id || 0).padStart(4, "0")}`;
}

export function employeeJobTitle(employee) {
  return employee?.job_title || employee?.specialty || "-";
}

export function employeeDepartment(employee) {
  return employee?.department || "Maintenance";
}

export function employeeWorkLocation(employee) {
  return employee?.work_location || employee?.location || "-";
}

export function employeeSupervisor(employee) {
  return employee?.supervisor || "-";
}

export function employeeRole(role) {
  return normalizeEmployeeRole(role);
}

export function isTechnicianEmployee(employee) {
  return String(employee?.role || "").toLowerCase() === "technician" || /technician/i.test(employeeJobTitle(employee));
}

export function isEngineerEmployee(employee) {
  return /engineer/i.test(employeeJobTitle(employee));
}

export function isManagementEmployee(employee) {
  const title = employeeJobTitle(employee).toLowerCase();
  return MANAGEMENT_JOB_TITLE_ALIASES.some(value => title === String(value).toLowerCase());
}

export function isSupervisorEmployee(employee) {
  return String(employee?.role || "").toLowerCase() === "supervisor" || /supervisor/i.test(employeeJobTitle(employee));
}

export function employeeMatchesGroup(employee, group) {
  if (!group) return false;
  if (group === "all") return true;
  if (group === "active") return employee?.status === "active" && !isManagementEmployee(employee);
  if (group === "technicians") return isTechnicianEmployee(employee);
  if (group === "engineers") return isEngineerEmployee(employee);
  if (group === "management") return isManagementEmployee(employee);
  if (group === "supervisors") return isSupervisorEmployee(employee);
  return true;
}

export function employeeGroupTitle(group, language = "en") {
  const titles = {
    all: "Total Employees",
    active: "Active Staff",
    technicians: "Technicians",
    engineers: "Engineers",
    management: "Management",
    supervisors: "Supervisors"
  };
  return tr(language, titles[group] || "Employees");
}

export function employeeRoleLabel(role) {
  const labels = {
    admin: "Admin",
    engineer: "Engineer",
    store_keeper: "Store Keeper",
    viewer: "Regular User",
    user: "Regular User"
  };
  return labels[normalizeEmployeeRole(role)] || "Regular User";
}

export function isSystemAdminAccount(employee) {
  const name = String(employee?.name || "").trim().toLowerCase();
  const username = String(employee?.username || "").trim().toLowerCase();
  const jobTitle = String(employee?.job_title || employee?.specialty || "").trim().toLowerCase();
  return name === "system administrator" || username === "ecs-ecs" || jobTitle === "super admin";
}

export function businessEmployees(employees = []) {
  return employees.filter(employee => !isSystemAdminAccount(employee));
}

export function jobTitleOptions(jobTitles = [], employees = []) {
  const hiddenTitles = new Set(["super admin", "system admin", "system administrator"]);
  const titles = uniqueSorted([...jobTitles.map(item => item.name), ...employees.map(employee => employee.job_title || employee.specialty), "Shift Engineer", "Maintenance Engineer", ...MANAGEMENT_JOB_TITLES, "Senior Electrical Technician", "Mechanical Technician", "Electrical Technician", "Maintenance Supervisor", "Technician"].filter(title => !hiddenTitles.has(String(title || "").trim().toLowerCase())));
  return titles.map(title => ({
    value: title,
    label: title
  }));
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => String(first).localeCompare(String(second), undefined, {
    sensitivity: "base"
  }));
}
