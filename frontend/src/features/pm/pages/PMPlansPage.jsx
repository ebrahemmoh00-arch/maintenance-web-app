import { Plus, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { DataTable } from "../../../shared/components/DataTable.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { hasPermission, localizedConfig, tableLabels, tr } from "../../../shared/config/appConfig.jsx";

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
  const t = text => tr(language, text);
  const config = localizedConfig("pm-plans", language);
  const rows = data["pm-plans"] || [];
  const equipment = data.equipment || [];
  const customers = data.customers || [];
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [showAllLocations, setShowAllLocations] = useState(false);
  const canAdd = hasPermission(currentUser, "pm-plans", "add");
  const canEdit = hasPermission(currentUser, "pm-plans", "edit");
  const canDelete = hasPermission(currentUser, "pm-plans", "delete");
  const assetById = useMemo(() => new Map(equipment.map(asset => [Number(asset.id), asset])), [equipment]);
  const locations = useMemo(() => buildPmPlanLocations(customers, equipment, rows), [customers, equipment, rows]);
  const scopedGroups = useMemo(() => buildPmPlanGroups(rows, locations, assetById, showAllLocations, selectedLocationId), [rows, locations, assetById, showAllLocations, selectedLocationId]);
  const visibleCount = scopedGroups.reduce((sum, group) => sum + group.rows.length, 0);
  const selectedLocation = locations.find(location => String(location.id) === String(selectedLocationId));
  const scopeLabel = showAllLocations ? t("All Sites") : selectedLocation?.name || t("No customers / sites");

  useEffect(() => {
    if (!locations.length) {
      setSelectedLocationId("");
      return;
    }
    if (!selectedLocationId || !locations.some(location => String(location.id) === String(selectedLocationId))) {
      setSelectedLocationId(String(locations[0].id));
    }
  }, [locations, selectedLocationId]);

  return <div className="space-y-5">
      <PmPlanScopeBar
        locations={locations}
        selectedLocationId={selectedLocationId}
        onSelectedLocationChange={value => {
          setSelectedLocationId(value);
          setShowAllLocations(false);
        }}
        showAllLocations={showAllLocations}
        onToggleShowAll={() => setShowAllLocations(current => !current)}
        visibleCount={visibleCount}
        scopeLabel={scopeLabel}
        language={language}
      />

      <Panel title={config.title} subtitle={t("Create, update, and control operational records through the existing REST API.")} actions={<div className="flex flex-wrap gap-2">
          {canEdit ? <button type="button" onClick={runPMScheduler} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100">
              <TimerReset className="h-4 w-4" />
              {t("Run Scheduler")}
            </button> : null}
          {canAdd ? <button onClick={() => openCreate("pm-plans")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              {t("New Record")}
            </button> : null}
        </div>}>
        <div className="space-y-5">
          {scopedGroups.map(group => <section key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">{group.name}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">{group.rows.length} {t("PM Plans")}</p>
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{group.assetCount} {t("assets")}</span>
              </div>
              <div className="p-3">
                <DataTable columns={config.columns} rows={group.rows} onEdit={canEdit ? row => openEdit("pm-plans", row) : null} onDelete={canDelete ? id => deleteRecord("pm-plans", id) : null} emptyMessage={t("No records found.")} labels={tableLabels(language)} />
              </div>
            </section>)}
          {!scopedGroups.length ? <DataTable columns={config.columns} rows={[]} onEdit={null} onDelete={null} emptyMessage={t("No records found.")} labels={tableLabels(language)} /> : null}
        </div>
      </Panel>
    </div>;
}

function PmPlanScopeBar({
  locations,
  selectedLocationId,
  onSelectedLocationChange,
  showAllLocations,
  onToggleShowAll,
  visibleCount,
  scopeLabel,
  language
}) {
  const t = text => tr(language, text);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto] lg:items-end">
        <label className="block">
          <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t("Customer / Site")}</span>
          <select className="w-full rounded-xl border border-slate-200 bg-cyan-50/50 px-3 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white" value={selectedLocationId} onChange={event => onSelectedLocationChange(event.target.value)} disabled={!locations.length}>
            {!locations.length ? <option value="">{t("No customers / sites")}</option> : null}
            {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{t("Visible Scope")}</p>
          <p className="mt-1 text-sm font-black text-slate-950">{scopeLabel}</p>
          <p className="mt-1 text-xs font-bold text-blue-700">{visibleCount} {t("PM Plans")}</p>
        </div>
        <button type="button" onClick={onToggleShowAll} disabled={!locations.length} className={`rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${showAllLocations ? "bg-slate-950 text-white hover:bg-slate-800" : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
          {showAllLocations ? t("Show Selected Location") : t("Show All")}
        </button>
      </div>
    </div>;
}

function buildPmPlanLocations(customers, equipment, rows) {
  const equipmentCustomerIds = new Set(equipment.map(asset => Number(asset.customer_id)).filter(Boolean));
  const rowCustomerIds = new Set(rows.map(row => Number(row.customer_id)).filter(Boolean));
  const filtered = customers.filter(customer => equipmentCustomerIds.has(Number(customer.id)) || rowCustomerIds.has(Number(customer.id)));
  const locations = filtered.length ? filtered : customers;
  const hasUnassigned = rows.some(row => !Number(row.customer_id)) || equipment.some(asset => !Number(asset.customer_id));
  return [
    ...locations.map(location => ({
      id: location.id,
      name: location.name
    })),
    ...(hasUnassigned ? [{
      id: "unassigned",
      name: "Unassigned"
    }] : [])
  ];
}

function buildPmPlanGroups(rows, locations, assetById, showAllLocations, selectedLocationId) {
  const locationList = showAllLocations ? locations : locations.filter(location => String(location.id) === String(selectedLocationId));
  return locationList.map(location => {
    const groupRows = rows.filter(row => rowBelongsToLocation(row, location, assetById));
    const assetIds = new Set(groupRows.map(row => Number(row.equipment_id)).filter(Boolean));
    return {
      ...location,
      assetCount: assetIds.size,
      rows: groupRows
    };
  }).filter(group => showAllLocations || String(group.id) === String(selectedLocationId));
}

function rowBelongsToLocation(row, location, assetById) {
  const asset = assetById.get(Number(row.equipment_id));
  if (String(location.id) === "unassigned") return !Number(row.customer_id || asset?.customer_id);
  return Number(row.customer_id || asset?.customer_id) === Number(location.id);
}
