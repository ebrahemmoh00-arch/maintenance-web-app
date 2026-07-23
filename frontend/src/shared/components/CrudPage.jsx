import { localizedConfig, tableLabels, tr } from "../config/appConfig.jsx";
import { DataTable } from "./DataTable.jsx";
import { Panel } from "./Panel.jsx";
import { Plus } from "lucide-react";

export function CrudPage({
  resourceKey,
  rows,
  onCreate,
  onEdit,
  onDelete,
  canManage = true,
  canAdd = canManage,
  canEdit = canManage,
  canDelete = canManage,
  language,
  extraActions = null
}) {
  const config = localizedConfig(resourceKey, language);
  const t = text => tr(language, text);
  return <Panel title={config.title} subtitle="Create, update, and control operational records through the existing REST API." language={language} actions={<div className="flex flex-wrap gap-2">
          {extraActions}
          {canAdd ? <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              {t("New Record")}
            </button> : null}
        </div>}>
      <DataTable columns={config.columns} rows={rows} onEdit={canEdit ? onEdit : null} onDelete={canDelete ? onDelete : null} emptyMessage={`${t("No records found.")}`} labels={tableLabels(language)} />
    </Panel>;
}
