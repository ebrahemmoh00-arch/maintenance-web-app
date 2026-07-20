import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";
import { AuditLogsPanel } from "../../reports/components/ReportsView.jsx";
import { DocumentBrandingSettings, SettingsSummary } from "../components/SettingsViews.jsx";
import { useState } from "react";

export default function SettingsPage() {
  const [auditLogsVisible, setAuditLogsVisible] = useState(false);
  const [documentBrandingVisible, setDocumentBrandingVisible] = useState(false);
  const {
    data,
    language,
    isAdmin,
    currentUser,
    deleteAuditLogs
  } = useCMMS();
  const canViewAuditLogs = hasPermission(currentUser, "audit-logs", "view");

  return <div className="space-y-6">
      <SettingsSummary
        language={language}
        canViewAuditLogs={canViewAuditLogs}
        auditLogCount={(data["audit-logs"] || []).length}
        auditLogsVisible={auditLogsVisible}
        onAuditLogs={() => setAuditLogsVisible(current => !current)}
        documentBrandingVisible={documentBrandingVisible}
        onDocumentBranding={() => setDocumentBrandingVisible(current => !current)}
      />
      {canViewAuditLogs && auditLogsVisible ? (
        <AuditLogsPanel
          logs={data["audit-logs"] || []}
          language={language}
          canDelete={isAdmin}
          onDeleteSelected={deleteAuditLogs}
        />
      ) : null}
      {documentBrandingVisible ? <DocumentBrandingSettings /> : null}
    </div>;
}
