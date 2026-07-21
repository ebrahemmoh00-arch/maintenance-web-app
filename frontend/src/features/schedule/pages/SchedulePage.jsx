import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";
import { Schedule } from "../components/ScheduleView.jsx";

export default function SchedulePage() {
  const {
    data,
    openCreate,
    openEdit,
    deleteRecord,
    updatePreventiveMaintenanceHistory,
    importMaintenanceFollowUp,
    currentUser,
    language
  } = useCMMS();

  return (
    <Schedule
      customers={data.customers}
      workOrders={data["work-orders"]}
      pmTasks={data["preventive-maintenance"]}
      pmPlans={data["pm-plans"]}
      equipment={data.equipment}
      onCreatePm={() => openCreate("preventive-maintenance")}
      onEditPm={(row) => openEdit("preventive-maintenance", row)}
      onDeletePm={(id) => deleteRecord("preventive-maintenance", id)}
      onUpdatePmHistory={updatePreventiveMaintenanceHistory}
      onImportMaintenanceFollowUp={importMaintenanceFollowUp}
      canManage={
        hasPermission(currentUser, "preventive-maintenance", "add")
        || hasPermission(currentUser, "preventive-maintenance", "edit")
        || hasPermission(currentUser, "preventive-maintenance", "delete")
      }
      canAdd={hasPermission(currentUser, "preventive-maintenance", "add")}
      canEdit={hasPermission(currentUser, "preventive-maintenance", "edit")}
      canDelete={hasPermission(currentUser, "preventive-maintenance", "delete")}
      language={language}
    />
  );
}
