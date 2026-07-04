import { api } from "../../../api.js";

export const EMPLOYEE_ROLE_OPTIONS = ["admin", "engineer", "store_keeper", "viewer"];

export const MANAGEMENT_JOB_TITLES = ["Branch Manager", "Operation & Maintenance Manager", "Site Manager"];

export const MANAGEMENT_JOB_TITLE_ALIASES = [...MANAGEMENT_JOB_TITLES, "مدير فرع", "مدير تشغيل وصيانة", "مدير موقع"];

export const AUTH_STORAGE_KEYS = ["maintenance-authenticated", "maintenance-role", "maintenance-auth-user", "maintenance-auth-name", "maintenance-permissions", "maintenance-access-token", "maintenance-refresh-token"];

export function clearPersistentAuthStorage() {
  AUTH_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
}

export function getAuthSession() {
  clearPersistentAuthStorage();
  return {
    authenticated: sessionStorage.getItem("maintenance-authenticated") === "true" && Boolean(sessionStorage.getItem("maintenance-access-token")),
    role: sessionStorage.getItem("maintenance-role") || "",
    username: sessionStorage.getItem("maintenance-auth-user") || "",
    name: sessionStorage.getItem("maintenance-auth-name") || "",
    permissions: sessionStorage.getItem("maintenance-permissions") || ""
  };
}

export function saveAuthSession({
  role,
  username,
  name,
  permissions,
  accessToken,
  refreshToken
}) {
  clearPersistentAuthStorage();
  if (accessToken || refreshToken) {
    api.saveAuthTokens({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }
  sessionStorage.setItem("maintenance-authenticated", "true");
  sessionStorage.setItem("maintenance-role", role);
  sessionStorage.setItem("maintenance-auth-user", username);
  sessionStorage.setItem("maintenance-auth-name", name);
  sessionStorage.setItem("maintenance-permissions", permissions || "");
}

export function clearAuthSession() {
  api.clearAuthTokens();
  AUTH_STORAGE_KEYS.forEach(key => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}
