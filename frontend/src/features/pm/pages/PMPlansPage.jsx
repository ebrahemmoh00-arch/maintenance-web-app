import { TimerReset } from "lucide-react";

import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { CrudPage } from "../../../shared/components/CrudPage.jsx";
import { hasPermission } from "../../../shared/config/appConfig.jsx";

export default function PMPlansPage() {
  const {
    data,
    openCreate,
    openEdit,
    deleteRecord,
    runPMScheduler,
    currentUser,
    language
  } = useCMMS();

  return (
    <CrudPage
      resourceKey="pm-plans"
      rows={data["pm-plans"]}
      onCreate={() => openCreate("pm-plans")}
      onEdit={(row) => openEdit("pm-plans", row)}
      onDelete={(id) => deleteRecord("pm-plans", id)}
      canAdd={hasPermission(currentUser, "pm-plans", "add")}
      canEdit={hasPermission(currentUser, "pm-plans", "edit")}
      canDelete={hasPermission(currentUser, "pm-plans", "delete")}
      language={language}
      extraActions={hasPermission(currentUser, "pm-plans", "edit") ? (
        <button type="button" onClick={runPMScheduler} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100">
          <TimerReset className="h-4 w-4" />
          Run Scheduler
        </button>
      ) : null}
    />
  );
}
