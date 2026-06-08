const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const ACTIVE_API_BASE_KEY = "maintenance-active-api-base";
const REQUEST_TIMEOUT_MS = 15000;

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function uniqueValues(values) {
  return [...new Set(values.map(normalizeApiBase).filter(Boolean))];
}

const configuredApiBase = normalizeApiBase(import.meta.env.VITE_API_BASE);
export const API_BASE = configuredApiBase || (isLocalHost ? "http://127.0.0.1:8000/api" : "https://cmms-system.onrender.com/api");
const API_BASE_CANDIDATES = uniqueValues([
  API_BASE,
  isLocalHost ? "" : "https://cmms-system.onrender.com/api",
  isLocalHost ? "" : "https://maintenance-backend.onrender.com/api"
]);

const ACCESS_TOKEN_KEY = "maintenance-access-token";
const REFRESH_TOKEN_KEY = "maintenance-refresh-token";

function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

function saveAuthTokens(payload) {
  if (payload?.access_token) sessionStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
  if (payload?.refresh_token) sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh_token);
}

function clearAuthTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getActiveApiBase() {
  const stored = normalizeApiBase(sessionStorage.getItem(ACTIVE_API_BASE_KEY));
  return stored || API_BASE_CANDIDATES[0];
}

function saveActiveApiBase(base) {
  if (base) sessionStorage.setItem(ACTIVE_API_BASE_KEY, normalizeApiBase(base));
}

function apiBasesInRetryOrder() {
  return uniqueValues([getActiveApiBase(), ...API_BASE_CANDIDATES]);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function networkError(error) {
  const message = error?.message || "Failed to fetch";
  const next = new Error(message.includes("abort") ? "Connection timeout" : "Failed to fetch");
  next.network = true;
  return next;
}

async function refreshAccessToken(base = getActiveApiBase()) {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return "";
  let response;
  try {
    response = await fetchWithTimeout(`${base}/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    clearAuthTokens();
    return "";
  }
  const payload = await response.json();
  saveAuthTokens(payload);
  saveActiveApiBase(base);
  return payload.access_token || "";
}

async function requestFromBase(base, path, options = {}) {
  const { auth = true, retry = true, ...fetchOptions } = options;
  const token = auth ? getAccessToken() : "";
  let response;
  try {
    response = await fetchWithTimeout(`${base}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(fetchOptions.headers || {})
      },
      ...fetchOptions
    });
  } catch (error) {
    throw networkError(error);
  }

  if (response.status === 401 && auth && retry) {
    const refreshedToken = await refreshAccessToken(base);
    if (refreshedToken) {
      return requestFromBase(base, path, { ...options, retry: false });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  saveActiveApiBase(base);
  if (response.status === 204) return null;
  return response.json();
}

async function request(path, options = {}) {
  let lastNetworkError = null;
  for (const base of apiBasesInRetryOrder()) {
    try {
      return await requestFromBase(base, path, options);
    } catch (error) {
      if (error?.network) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastNetworkError || new Error("Failed to fetch");
}

export const api = {
  saveAuthTokens,
  clearAuthTokens,
  getRefreshToken,
  login: async (credentials) => {
    const payload = await request("/login", { method: "POST", body: JSON.stringify(credentials), auth: false });
    saveAuthTokens(payload);
    return payload;
  },
  logout: async () => {
    try {
      return await request("/logout", { method: "POST", body: JSON.stringify({ refresh_token: getRefreshToken() }) });
    } finally {
      clearAuthTokens();
    }
  },
  auditExport: (format) => request("/audit-logs/export", { method: "POST", body: JSON.stringify({ format }) }),
  list: (resource) => request(`/${resource}`),
  create: (resource, data) => request(`/${resource}`, { method: "POST", body: JSON.stringify(data) }),
  update: (resource, id, data) => request(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: "DELETE" }),
  dashboard: () => request("/dashboard/stats"),
  stats: () => request("/dashboard/stats"),
  schedule: () => request("/schedule"),
  alerts: () => request("/maintenance-alerts"),
  serverTime: () => request("/server-time")
};
