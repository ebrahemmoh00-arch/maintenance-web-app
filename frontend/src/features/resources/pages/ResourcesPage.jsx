import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";
import { EmployeesManagementPage } from "../components/EmployeesManagement.jsx";

export default function ResourcesPage() {
  const {
    employeeRows,
    openCreate,
    openEdit,
    deleteRecord,
    data,
    addJobTitle,
    deleteJobTitle,
    currentUser,
    language
  } = useCMMS();

  return (
    <EmployeesManagementPage
      rows={employeeRows}
      onCreate={() => openCreate("engineers")}
      onEdit={(row) => openEdit("engineers", row)}
      onDelete={(id) => deleteRecord("engineers", id)}
      jobTitles={data["job-titles"]}
      onAddJobTitle={addJobTitle}
      onDeleteJobTitle={deleteJobTitle}
      canAdd={hasPermission(currentUser, "engineers", "add")}
      canEdit={hasPermission(currentUser, "engineers", "edit")}
      canDelete={hasPermission(currentUser, "engineers", "delete")}
      language={language}
    />
  );
}
