import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";
import { Reports } from "../components/ReportsView.jsx";

export default function ReportsPage() {
  const {
    data,
    alerts,
    stats,
    language,
    currentUser,
    isAdmin,
    deleteAuditLogs
  } = useCMMS();

  return (
    <Reports
      data={data}
      alerts={alerts}
      stats={stats}
      language={language}
      canViewAuditLogs={hasPermission(currentUser, "audit-logs", "view")}
      canDeleteAuditLogs={isAdmin}
      onDeleteAuditLogs={deleteAuditLogs}
    />
  );
}
