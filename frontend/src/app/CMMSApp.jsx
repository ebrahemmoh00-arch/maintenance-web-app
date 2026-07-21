import { api } from "../api.js";
import { nextAssetLevel } from "../features/assets/utils/assetHierarchy.js";
import { LoginScreen } from "../features/authentication/components/LoginScreen.jsx";
import { EMPLOYEE_ROLE_OPTIONS, clearAuthSession, getAuthSession, saveAuthSession } from "../features/authentication/services/authSession.js";
import { businessEmployees, jobTitleOptions } from "../features/resources/utils/employeeUtils.js";
import { buildSmartAlerts, createRolePermissions, hasPermission, isVisiblePageForUser, normalizeEmployeeRole, stringifyPermissions, tr } from "../shared/config/appConfig.jsx";
import { DEFAULT_ASSET_TYPES } from "../shared/config/resources/equipment.jsx";
import { resources } from "../shared/config/resourceRegistry.jsx";
import { normalizeAssetForm, normalizeEngineerForm, normalizePMPlanForm, normalizePreventiveMaintenanceForm } from "../shared/utils/formNormalizers.js";
import { maintenanceIdentityKey } from "../shared/utils/pmPlanSchedule.js";
import { AppChrome } from "./components/AppChrome.jsx";
import { CMMSContext } from "./context/CMMSContext.jsx";
import { normalizePage, pageToPath, pathToPage } from "./utils/navigation.js";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function CMMSApp({ initialPage = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActiveState] = useState(() => {
    const page = initialPage || new URLSearchParams(window.location.search).get("page") || pathToPage(window.location.pathname);
    return ["dashboard", "customers", "equipment", "engineers", "work-orders", "pm-plans", "schedule", "inventory", "reports", "kpis", "settings", "access-control"].includes(page) ? page : "dashboard";
  });
  function setActive(nextPage) {
    const page = normalizePage(typeof nextPage === "function" ? nextPage(active) : nextPage);
    setActiveState(page);
    const path = pageToPath(page);
    if (location.pathname !== path) {
      navigate(path);
    }
  }
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dashboardAlertsOpen, setDashboardAlertsOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    return queryLanguage === "ar" || localStorage.getItem("maintenance-language") === "ar" ? "ar" : "en";
  });
  const [authenticated, setAuthenticated] = useState(() => {
    const auth = getAuthSession();
    return auth.authenticated && EMPLOYEE_ROLE_OPTIONS.includes(normalizeEmployeeRole(auth.role)) && Boolean(auth.username);
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const auth = getAuthSession();
    return {
      username: auth.username,
      name: auth.name,
      role: auth.role,
      permissions: auth.permissions
    };
  });
  const [loginValue, setLoginValue] = useState({
    username: "",
    password: ""
  });
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState({
    customers: [],
    engineers: [],
    equipment: [],
    "work-orders": [],
    inventory: [],
    "preventive-maintenance": [],
    "pm-plans": [],
    "job-titles": [],
    "audit-logs": []
  });
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0
  });
  const [backendReliability, setBackendReliability] = useState(null);
  const [auditLogsLoaded, setAuditLogsLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [formValue, setFormValue] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const employeeRows = useMemo(() => businessEmployees(data.engineers), [data.engineers]);
  const displayData = useMemo(() => ({
    ...data,
    engineers: employeeRows
  }), [data, employeeRows]);
  useEffect(() => {
    const queryPage = new URLSearchParams(location.search).get("page");
    const routedPage = normalizePage(initialPage || queryPage || pathToPage(location.pathname));
    setActiveState(routedPage);
    if (!initialPage && queryPage && location.pathname === "/") {
      navigate(pageToPath(queryPage), { replace: true });
    }
  }, [initialPage, location.pathname, location.search, navigate]);
  const options = useMemo(() => ({
    customers: data.customers.map(item => ({
      value: item.id,
      label: item.name
    })),
    customerLocations: [{
      value: "Available for All Sites",
      label: "Available for All Sites"
    }, ...data.customers.map(item => ({
      value: item.name,
      label: item.name
    }))],
    engineers: employeeRows.map(item => ({
      value: item.id,
      label: item.name
    })),
    equipment: data.equipment.map(item => ({
      value: item.id,
      label: item.name
    })),
    jobTitles: jobTitleOptions(data["job-titles"], employeeRows),
    assetTypes: [...new Set([
      ...DEFAULT_ASSET_TYPES,
      ...data.equipment.map(item => item.asset_type).filter(Boolean)
    ])].map(item => ({
      value: item,
      label: item
    })),
    assetParents: data.equipment.filter(item => !modal?.id || Number(item.id) !== Number(modal.id)).map(item => ({
      value: item.id,
      label: `${item.asset_code || `AST-${item.id}`} - ${item.name}`
    })),
    "work-orders": data["work-orders"].map(item => ({
      value: item.id,
      label: item.title
    }))
  }), [data, employeeRows, modal?.id]);
  async function loadAll(options = {}) {
    const silent = Boolean(options?.silent);
    if (!silent) setLoading(true);
    setError("");
    try {
      const [customers, engineers, equipment, workOrders, inventory, preventiveMaintenance, pmPlans, jobTitles, dashboard, maintenanceAlerts, reliability] = await Promise.all([api.list("customers"), api.list("engineers"), api.list("equipment"), api.list("work-orders"), api.list("inventory"), api.list("preventive-maintenance"), api.list("pm-plans"), api.list("job-titles"), api.stats(), api.alerts(), api.dashboardReliability().catch(() => null)]);
      setData(current => ({
        ...current,
        customers,
        engineers,
        equipment,
        "work-orders": workOrders,
        inventory,
        "preventive-maintenance": preventiveMaintenance,
        "pm-plans": pmPlans,
        "job-titles": jobTitles
      }));
      setAlerts(buildSmartAlerts(maintenanceAlerts, inventory, preventiveMaintenance, pmPlans));
      setStats(dashboard);
      setBackendReliability(reliability);
      const storedUsername = sessionStorage.getItem("maintenance-auth-user") || "";
      if (storedUsername) {
        const refreshedUser = engineers.find(user => user.username === storedUsername);
        if (refreshedUser) {
          const role = normalizeEmployeeRole(refreshedUser.role);
          const permissions = refreshedUser.permissions || stringifyPermissions(createRolePermissions(role));
          sessionStorage.setItem("maintenance-permissions", permissions);
          setCurrentUser({
            username: refreshedUser.username,
            name: refreshedUser.name,
            role,
            permissions
          });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }
  async function loadAuditLogs() {
    if (!hasPermission(currentUser, "audit-logs", "view")) return;
    try {
      const auditLogs = await api.list("audit-logs");
      setData(current => ({
        ...current,
        "audit-logs": auditLogs
      }));
      setAuditLogsLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  }
  async function deleteAuditLogs(ids) {
    if (!isAdmin || !ids.length) return false;
    try {
      await api.auditDelete(ids);
      await loadAuditLogs();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }
  useEffect(() => {
    if (authenticated) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [authenticated]);
  useEffect(() => {
    if (!authenticated) return undefined;
    const keepServerReady = () => {
      api.health().catch(() => null);
    };
    const refreshSession = () => {
      api.refreshSession().catch(() => null);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        keepServerReady();
        refreshSession();
      }
    };
    const healthInterval = window.setInterval(keepServerReady, 4 * 60 * 1000);
    const refreshInterval = window.setInterval(refreshSession, 20 * 60 * 1000);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    keepServerReady();
    return () => {
      window.clearInterval(healthInterval);
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authenticated]);
  useEffect(() => {
    if (authenticated && active === "settings" && !auditLogsLoaded && hasPermission(currentUser, "audit-logs", "view")) {
      loadAuditLogs();
    }
  }, [authenticated, active, auditLogsLoaded, currentUser]);
  const isAdmin = normalizeEmployeeRole(currentUser.role) === "admin";
  const canAddWorkOrders = hasPermission(currentUser, "work-orders", "add");
  const canModifyWorkOrders = hasPermission(currentUser, "work-orders", "edit") || hasPermission(currentUser, "work-orders", "delete");
  async function handleLogin(event) {
    event.preventDefault();
    try {
      const auth = await api.login({
        username: loginValue.username.trim(),
        password: loginValue.password
      });
      const matchedUser = auth.user || {};
      const role = normalizeEmployeeRole(matchedUser.role);
      const permissions = matchedUser.permissions || stringifyPermissions(createRolePermissions(role));
      saveAuthSession({
        role,
        username: matchedUser.username,
        name: matchedUser.name,
        permissions,
        accessToken: auth.access_token,
        refreshToken: auth.refresh_token
      });
      setAuditLogsLoaded(false);
      setData(current => ({
        ...current,
        "audit-logs": []
      }));
      setCurrentUser({
        username: matchedUser.username,
        name: matchedUser.name,
        role,
        permissions
      });
      setAuthenticated(true);
      setLoginError("");
    } catch (err) {
      setLoginError(err.message === "Access Denied" ? tr(language, "Invalid username or password") : err.message || tr(language, "Invalid username or password"));
    }
  }
  async function handleLogout() {
    await api.logout().catch(() => null);
    clearAuthSession();
    setAuthenticated(false);
    setCurrentUser({
      username: "",
      name: "",
      role: "",
      permissions: ""
    });
    setLoginValue({
      username: "",
      password: ""
    });
    setAuditLogsLoaded(false);
    setData(current => ({
      ...current,
      "audit-logs": []
    }));
    setActive("dashboard");
  }
  function openCreate(resourceKey = "work-orders") {
    if (!hasPermission(currentUser, resourceKey, "add")) return;
    setModal({
      resourceKey,
      mode: "create"
    });
    setFormValue(resources[resourceKey].blank);
  }
  function openEdit(resourceKey, row) {
    if (!hasPermission(currentUser, resourceKey, "edit")) return;
    setModal({
      resourceKey,
      mode: "edit",
      id: row.id
    });
    const nextValue = {
      ...resources[resourceKey].blank,
      ...row
    };
    if (resourceKey === "engineers") nextValue.job_title = row.job_title || row.specialty || "";
    setFormValue(nextValue);
  }
  async function saveRecord(event) {
    event.preventDefault();
    if (!hasPermission(currentUser, modal.resourceKey, modal.mode === "edit" ? "edit" : "add")) return;
    const config = resources[modal.resourceKey];
    const payload = modal.resourceKey === "equipment" ? normalizeAssetForm(formValue) : modal.resourceKey === "preventive-maintenance" ? normalizePreventiveMaintenanceForm(formValue) : modal.resourceKey === "pm-plans" ? normalizePMPlanForm(formValue) : modal.resourceKey === "engineers" ? normalizeEngineerForm(formValue) : formValue;
    try {
      if (modal.mode === "edit") {
        await api.update(config.endpoint, modal.id, payload);
      } else {
        await api.create(config.endpoint, payload);
      }
      setModal(null);
      await loadAll({
        silent: true
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function updatePreventiveMaintenanceHistory(recordId, payload) {
    if (!hasPermission(currentUser, "preventive-maintenance", "edit")) return;
    try {
      await api.update("preventive-maintenance/history", recordId, payload);
      await loadAll({
        silent: true
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function importMaintenanceFollowUp(sourceEquipmentId, targetEquipmentId) {
    if (!hasPermission(currentUser, "preventive-maintenance", "add")) return { created: 0, skipped: 0 };
    const targetAsset = data.equipment.find(asset => Number(asset.id) === Number(targetEquipmentId));
    const sourcePlans = data["pm-plans"].filter(plan => Number(plan.equipment_id) === Number(sourceEquipmentId));
    const targetPlans = data["pm-plans"].filter(plan => Number(plan.equipment_id) === Number(targetEquipmentId));
    const sourceTasks = data["preventive-maintenance"].filter(task => Number(task.equipment_id) === Number(sourceEquipmentId));
    const targetTasks = data["preventive-maintenance"].filter(task => Number(task.equipment_id) === Number(targetEquipmentId));
    const targetNames = new Set([
      ...targetPlans.map(plan => maintenanceIdentityKey(targetEquipmentId, plan.name)),
      ...targetTasks.map(task => maintenanceIdentityKey(targetEquipmentId, task.task_name))
    ]);
    const plansToCreate = sourcePlans.filter(plan => {
      const key = maintenanceIdentityKey(targetEquipmentId, plan.name);
      return plan.name && !targetNames.has(key);
    });
    const createdPlanNames = new Set(plansToCreate.map(plan => maintenanceIdentityKey(targetEquipmentId, plan.name)));
    const tasksToCreate = sourceTasks.filter(task => {
      const key = maintenanceIdentityKey(targetEquipmentId, task.task_name);
      return task.task_name && !targetNames.has(key) && !createdPlanNames.has(key);
    });
    const sourceTotal = sourcePlans.length + sourceTasks.length;
    const createTotal = plansToCreate.length + tasksToCreate.length;
    if (!sourceTotal) return { created: 0, skipped: 0, message: "Selected source equipment has no maintenance tasks." };
    if (!createTotal) return { created: 0, skipped: sourceTotal, message: "All source maintenance tasks already exist on the target equipment." };
    try {
      for (const plan of plansToCreate) {
        const intervalValue = Math.max(Number(plan.interval_value || 1), 1);
        const currentHours = Number(targetAsset?.current_hours || 0);
        await api.create("pm-plans", normalizePMPlanForm({
          equipment_id: Number(targetEquipmentId),
          name: plan.name,
          description: plan.description || "",
          priority: plan.priority || "medium",
          recurrence_type: plan.recurrence_type || "Runtime Hours",
          interval_value: intervalValue,
          start_date: new Date().toISOString().slice(0, 10),
          next_due_runtime: String(plan.recurrence_type || "Runtime Hours").toLowerCase() === "runtime hours" ? currentHours + intervalValue : 0,
          last_runtime: currentHours,
          last_service_date: "",
          estimated_duration_minutes: Number(plan.estimated_duration_minutes || 60),
          required_skills: plan.required_skills || "",
          checklist_template: plan.checklist_template || "",
          planned_spare_parts: plan.planned_spare_parts || "",
          status: plan.status === "paused" ? "paused" : "active"
        }));
      }
      for (const task of tasksToCreate) {
        await api.create("preventive-maintenance", {
          equipment_id: Number(targetEquipmentId),
          task_name: task.task_name,
          interval_hours: Number(task.interval_hours || 0),
          interval_days: Number(task.interval_days || 0),
          last_service_hours: 0,
          last_service_date: "",
          next_due_date: "",
          status: task.status === "paused" ? "paused" : "active"
        });
      }
      await loadAll({
        silent: true
      });
      return {
        created: createTotal,
        skipped: sourceTotal - createTotal
      };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }
  async function saveUserPermissions(user, permissions) {
    if (!isAdmin || !user?.id) return;
    try {
      await api.update("engineers", user.id, {
        ...user,
        role: normalizeEmployeeRole(user.role),
        permissions: stringifyPermissions(permissions)
      });
      await loadAll({
        silent: true
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function addJobTitle(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed || !hasPermission(currentUser, "engineers", "add")) return false;
    try {
      await api.create("job-titles", {
        name: trimmed
      });
      await loadAll({
        silent: true
      });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }
  async function deleteJobTitle(id) {
    if (!hasPermission(currentUser, "engineers", "delete")) return;
    if (!window.confirm(language === "ar" ? "هل تريد حذف هذه الوظيفة؟" : "Delete this job title?")) return;
    try {
      await api.remove("job-titles", id);
      await loadAll({
        silent: true
      });
    } catch (err) {
      setError(err.message);
    }
  }
  function updateModalForm(nextValue) {
    setFormValue(modal?.resourceKey === "equipment" ? normalizeAssetForm(nextValue) : modal?.resourceKey === "preventive-maintenance" ? normalizePreventiveMaintenanceForm(nextValue) : modal?.resourceKey === "pm-plans" ? normalizePMPlanForm(nextValue) : nextValue);
  }
  async function runPMScheduler() {
    if (!hasPermission(currentUser, "pm-plans", "edit")) return;
    try {
      const result = await api.create("pm-plans/scheduler/run", {});
      await loadAll({
        silent: true
      });
      window.alert(`PM Scheduler completed. Generated: ${result.generated || 0}. Skipped: ${result.skipped || 0}.`);
    } catch (err) {
      setError(err.message);
    }
  }
  async function saveWorkOrderDocument(payload, id) {
    if (!id && !hasPermission(currentUser, "work-orders", "add")) {
      setError(tr(language, "Admin Only"));
      return false;
    }
    if (id && !hasPermission(currentUser, "work-orders", "edit")) {
      setError(tr(language, "Admin Only"));
      return false;
    }
    try {
      if (id) {
        await api.update("work-orders", id, payload);
      } else {
        await api.create("work-orders", payload);
      }
      await loadAll({
        silent: true
      });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }
  async function runWorkOrderLifecycleAction(id, action, payload = {}) {
    if (!id || !hasPermission(currentUser, "work-orders", "edit")) return false;
    try {
      await api.create(`work-orders/${id}/${action}`, payload);
      await loadAll({
        silent: true
      });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }
  async function deleteRecord(resourceKey, id) {
    if (!hasPermission(currentUser, resourceKey, "delete")) return;
    if (!window.confirm(language === "ar" ? "هل تريد حذف هذا السجل؟" : "Delete this record?")) return;
    try {
      await api.remove(resources[resourceKey].endpoint, id);
      await loadAll({
        silent: true
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function moveAsset(asset, parentId) {
    if (!hasPermission(currentUser, "equipment", "edit")) return;
    try {
      const parent = parentId ? data.equipment.find(item => Number(item.id) === Number(parentId)) : null;
      await api.update("equipment", asset.id, normalizeAssetForm({
        ...asset,
        parent_id: parentId || null,
        asset_level: parent ? nextAssetLevel(parent.asset_level) : "Site"
      }));
      await loadAll({
        silent: true
      });
    } catch (err) {
      setError(err.message);
    }
  }
  const requestedPage = normalizePage(active);
  const page = isVisiblePageForUser(currentUser, requestedPage) ? requestedPage : "dashboard";
  const t = text => tr(language, text);
  useEffect(() => {
    if (authenticated && page !== active) {
      setActive(page);
    }
  }, [authenticated, page, active]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("maintenance-language", language);
  }, [language]);
  if (!authenticated) {
    return <LoginScreen language={language} setLanguage={setLanguage} value={loginValue} setValue={setLoginValue} error={loginError} onSubmit={handleLogin} />;
  }

  const app = {
    active,
    setActive,
    collapsed,
    setCollapsed,
    darkMode,
    setDarkMode,
    notificationsOpen,
    setNotificationsOpen,
    dashboardAlertsOpen,
    setDashboardAlertsOpen,
    language,
    setLanguage,
    alerts,
    loading,
    error,
    page,
    stats,
    displayData,
    backendReliability,
    openCreate,
    canAddWorkOrders,
    canModifyWorkOrders,
    currentUser,
    isAdmin,
    data,
    employeeRows,
    saveWorkOrderDocument,
    deleteRecord,
    runWorkOrderLifecycleAction,
    moveAsset,
    openEdit,
    addJobTitle,
    deleteJobTitle,
    updatePreventiveMaintenanceHistory,
    importMaintenanceFollowUp,
    runPMScheduler,
    deleteAuditLogs,
    saveUserPermissions,
    modal,
    formValue,
    updateModalForm,
    saveRecord,
    setModal,
    options,
    handleLogout,
    loadAll
  };

  return <CMMSContext.Provider value={app}><AppChrome app={app}><Outlet /></AppChrome></CMMSContext.Provider>;
}
