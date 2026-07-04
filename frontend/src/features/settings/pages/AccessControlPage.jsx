import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { AccessControlView } from "../components/SettingsViews.jsx";

export default function AccessControlPage() {
  const {
    employeeRows,
    currentUser,
    saveUserPermissions,
    language,
    isAdmin
  } = useCMMS();

  if (!isAdmin) return null;

  return (
    <AccessControlView
      users={employeeRows}
      currentUser={currentUser}
      onSaveUserPermissions={saveUserPermissions}
      language={language}
    />
  );
}
