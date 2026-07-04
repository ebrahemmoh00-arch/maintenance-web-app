import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { CrudPage } from "../../../shared/components/CrudPage.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";

export default function InventoryPage() {
  const {
    data,
    openCreate,
    openEdit,
    deleteRecord,
    currentUser,
    language
  } = useCMMS();

  return (
    <CrudPage
      resourceKey="inventory"
      rows={data.inventory}
      onCreate={() => openCreate("inventory")}
      onEdit={(row) => openEdit("inventory", row)}
      onDelete={(id) => deleteRecord("inventory", id)}
      canAdd={hasPermission(currentUser, "inventory", "add")}
      canEdit={hasPermission(currentUser, "inventory", "edit")}
      canDelete={hasPermission(currentUser, "inventory", "delete")}
      language={language}
    />
  );
}
