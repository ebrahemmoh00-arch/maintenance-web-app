import { api } from "./api.js";

export const reportService = {
  dashboard: () => api.dashboard(),
  alerts: () => api.alerts()
};
