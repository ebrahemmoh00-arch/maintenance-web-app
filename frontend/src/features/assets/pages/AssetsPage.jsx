import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";
import { AssetsView } from "../components/AssetsView.jsx";

export default function AssetsPage() {
  const {
    data,
    openCreate,
    openEdit,
    deleteRecord,
    moveAsset,
    currentUser,
    language
  } = useCMMS();

  return (
    <AssetsView
      rows={data.equipment}
      departments={data.customers}
      onCreate={() => openCreate("equipment")}
      onEdit={(row) => openEdit("equipment", row)}
      onDelete={(id) => deleteRecord("equipment", id)}
      onCreateDepartment={() => openCreate("customers")}
      onEditDepartment={(row) => openEdit("customers", row)}
      onDeleteDepartment={(id) => deleteRecord("customers", id)}
      onMoveAsset={(asset, parentId) => moveAsset(asset, parentId)}
      workOrders={data["work-orders"]}
      pmTasks={data["preventive-maintenance"]}
      inventory={data.inventory}
      canManage={
        hasPermission(currentUser, "equipment", "add")
        || hasPermission(currentUser, "equipment", "edit")
        || hasPermission(currentUser, "equipment", "delete")
        || hasPermission(currentUser, "customers", "add")
        || hasPermission(currentUser, "customers", "edit")
        || hasPermission(currentUser, "customers", "delete")
      }
      canCreateAsset={hasPermission(currentUser, "equipment", "add")}
      canEditAsset={hasPermission(currentUser, "equipment", "edit")}
      canDeleteAsset={hasPermission(currentUser, "equipment", "delete")}
      canDeleteTimeline={hasPermission(currentUser, "asset-history", "delete")}
      canCreateMeasurementTemplate={hasPermission(currentUser, "measurement-templates", "add")}
      canEditMeasurementTemplate={hasPermission(currentUser, "measurement-templates", "edit")}
      canDeleteMeasurementTemplate={hasPermission(currentUser, "measurement-templates", "delete")}
      canCreateDepartment={hasPermission(currentUser, "customers", "add")}
      canEditDepartment={hasPermission(currentUser, "customers", "edit")}
      canDeleteDepartment={hasPermission(currentUser, "customers", "delete")}
      language={language}
    />
  );
}
