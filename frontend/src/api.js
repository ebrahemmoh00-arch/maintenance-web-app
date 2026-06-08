const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (isLocalHost ? "http://127.0.0.1:8000/api" : "https://cmms-system.onrender.com/api");

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

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return "";
  const response = await fetch(`${API_BASE}/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) {
    clearAuthTokens();
    return "";
  }
  const payload = await response.json();
  saveAuthTokens(payload);
  return payload.access_token || "";
}

async function request(path, options = {}) {
  const { auth = true, retry = true, ...fetchOptions } = options;
  const token = auth ? getAccessToken() : "";
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {})
    },
    ...fetchOptions
  });

  if (response.status === 401 && auth && retry) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return request(path, { ...options, retry: false });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
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
