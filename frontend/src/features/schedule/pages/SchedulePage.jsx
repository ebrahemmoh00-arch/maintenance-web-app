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
    createPmPlanHistoryRecord,
    updatePmPlanHistoryRecord,
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
      onEditPmPlan={(row) => openEdit("pm-plans", { ...row, id: row.pm_plan_id || row.id })}
      onDeletePmPlan={(id) => deleteRecord("pm-plans", id)}
      onUpdatePmHistory={updatePreventiveMaintenanceHistory}
      onCreatePmPlanHistory={createPmPlanHistoryRecord}
      onUpdatePmPlanHistory={updatePmPlanHistoryRecord}
      onImportMaintenanceFollowUp={importMaintenanceFollowUp}
      canManage={
        hasPermission(currentUser, "preventive-maintenance", "add")
        || hasPermission(currentUser, "preventive-maintenance", "edit")
        || hasPermission(currentUser, "preventive-maintenance", "delete")
        || hasPermission(currentUser, "pm-plans", "edit")
        || hasPermission(currentUser, "pm-plans", "delete")
      }
      canAdd={hasPermission(currentUser, "preventive-maintenance", "add")}
      canEdit={hasPermission(currentUser, "preventive-maintenance", "edit")}
      canDelete={hasPermission(currentUser, "preventive-maintenance", "delete")}
      canEditPmPlan={hasPermission(currentUser, "pm-plans", "edit")}
      canDeletePmPlan={hasPermission(currentUser, "pm-plans", "delete")}
      language={language}
    />
  );
}
