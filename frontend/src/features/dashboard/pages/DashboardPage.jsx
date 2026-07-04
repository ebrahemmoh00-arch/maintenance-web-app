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
    canAddWorkOrders,
    language,
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
      canManage={canAddWorkOrders}
      language={language}
      dashboardAlertsOpen={dashboardAlertsOpen}
      setDashboardAlertsOpen={setDashboardAlertsOpen}
    />
  );
}
