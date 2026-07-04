import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";
import { WorkOrdersView } from "../components/WorkOrdersView.jsx";

export default function WorkOrdersPage() {
  const {
    data,
    employeeRows,
    saveWorkOrderDocument,
    deleteRecord,
    runWorkOrderLifecycleAction,
    setActive,
    canModifyWorkOrders,
    canAddWorkOrders,
    currentUser,
    language
  } = useCMMS();

  return (
    <WorkOrdersView
      rows={data["work-orders"]}
      customers={data.customers}
      equipment={data.equipment}
      engineers={employeeRows}
      onSave={saveWorkOrderDocument}
      onDelete={(id) => deleteRecord("work-orders", id)}
      onLifecycleAction={runWorkOrderLifecycleAction}
      onBackToEquipment={() => setActive("equipment")}
      canManage={canModifyWorkOrders}
      canCreate={canAddWorkOrders}
      canEdit={hasPermission(currentUser, "work-orders", "edit")}
      canDelete={hasPermission(currentUser, "work-orders", "delete")}
      language={language}
    />
  );
}
