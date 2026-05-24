const API_URL = "https://cmms-system.render.com";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  list: (resource) => request(`/${resource}`),
  create: (resource, data) => request(`/${resource}`, { method: "POST", body: JSON.stringify(data) }),
  update: (resource, id, data) => request(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: "DELETE" }),
  stats: () => request("/dashboard/stats"),
  schedule: () => request("/schedule"),
  alerts: () => request("/maintenance-alerts"),
  serverTime: () => request("/server-time")
};
