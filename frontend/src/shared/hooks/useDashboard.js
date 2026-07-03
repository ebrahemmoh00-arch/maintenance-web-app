import { useEffect, useState } from "react";
import { reportService } from "../services/reportService.js";

export function useDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([reportService.dashboard(), reportService.alerts()])
      .then(([dashboardData, alertsData]) => {
        setDashboard(dashboardData);
        setAlerts(alertsData);
      })
      .finally(() => setLoading(false));
  }, []);

  return { dashboard, alerts, loading };
}
