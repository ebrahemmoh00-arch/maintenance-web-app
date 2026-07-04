import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { SettingsSummary } from "../components/SettingsViews.jsx";

export default function SettingsPage() {
  const {
    data,
    language,
    setActive,
    isAdmin
  } = useCMMS();

  return <SettingsSummary data={data} language={language} onAccessControl={() => setActive("access-control")} isAdmin={isAdmin} />;
}
