import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { Dashboard } from "../components/DashboardCore.jsx";
import { SkeletonDashboard } from "../utils/maintenanceMetrics.jsx";

export default function DashboardPage() {
  const {
    loading,
    stats,
    displayData,
    alerts,
    backendReliability,
    openCreate,
    language,
    setActive,
    dashboardAlertsOpen,
    setDashboardAlertsOpen
  } = useCMMS();

  if (loading) return <SkeletonDashboard />;

  return (
    <Dashboard
      stats={stats}
      data={displayData}
      alerts={alerts}
      backendReliability={backendReliability}
      openCreate={openCreate}
      language={language}
      setActive={setActive}
      dashboardAlertsOpen={dashboardAlertsOpen}
      setDashboardAlertsOpen={setDashboardAlertsOpen}
    />
  );
}
