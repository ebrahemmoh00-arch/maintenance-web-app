import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { MaintenanceBadge, WorkOrderStatus } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { buildUnifiedPmRows, daysUntilDate } from "../../../shared/utils/pmPlanSchedule.js";
import { PreviousRecordsTable, buildScheduleCategories, equipmentCategory, formatInterval, formatScheduleCell, previousRecordsForTask, scheduleCategoryLabel, sortEquipmentByName } from "./MaintenanceFollowUp.jsx";
import { Download, Plus } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

export function Schedule({
  customers = [],
  workOrders,
  pmTasks,
  pmPlans = [],
  equipment = [],
  onCreatePm,
  onEditPm,
  onDeletePm,
  onUpdatePmHistory,
  onImportMaintenanceFollowUp,
  canManage = true,
  canAdd = canManage,
  canEdit = canManage,
  canDelete = canManage,
  language
}) {
  const t = text => tr(language, text);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const grouped = workOrders.reduce((acc, order) => {
    const key = order.scheduled_date || t("Unscheduled");
    acc[key] = [...(acc[key] || []), order];
    return acc;
  }, {});
  const days = Object.keys(grouped).sort();
  const customerOptions = customers.filter(customer => equipment.some(asset => Number(asset.customer_id) === Number(customer.id)));
  const selectedCustomer = customers.find(customer => Number(customer.id) === Number(selectedCustomerId));
  const customerEquipment = selectedCustomerId ? sortEquipmentByName(equipment.filter(asset => Number(asset.customer_id) === Number(selectedCustomerId))) : [];
  const categories = buildScheduleCategories(customerEquipment);
  const filteredEquipment = selectedCategory ? sortEquipmentByName(customerEquipment.filter(asset => equipmentCategory(asset).key === selectedCategory)) : [];
  const selectedEquipment = filteredEquipment.find(asset => Number(asset.id) === Number(selectedEquipmentId));
  useEffect(() => {
    if (!selectedCustomerId && customerOptions.length) {
      setSelectedCustomerId(customerOptions[0].id);
    }
    if (selectedCustomerId && !customerOptions.some(customer => Number(customer.id) === Number(selectedCustomerId))) {
      setSelectedCustomerId(customerOptions[0]?.id || "");
    }
  }, [customerOptions, selectedCustomerId]);
  useEffect(() => {
    if (!categories.length) {
      setSelectedCategory("");
      setSelectedEquipmentId("");
      return;
    }
    if (!selectedCategory || !categories.some(category => category.key === selectedCategory)) {
      setSelectedCategory(categories[0].key);
      setSelectedEquipmentId("");
    }
  }, [categories, selectedCategory]);
  useEffect(() => {
    if (selectedEquipmentId && !filteredEquipment.some(asset => Number(asset.id) === Number(selectedEquipmentId))) {
      setSelectedEquipmentId("");
    }
  }, [filteredEquipment, selectedEquipmentId]);
  return <div className="space-y-6">
      <Panel title="Schedule Navigator" subtitle="Select the customer/site first, then choose the equipment type to show its maintenance follow-up tables." language={language}>
        <div className="space-y-5">
          <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("Customers / Sites")}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {customerOptions.map(customer => {
              const active = Number(customer.id) === Number(selectedCustomerId);
              const count = equipment.filter(asset => Number(asset.customer_id) === Number(customer.id)).length;
              return <button key={customer.id} type="button" onClick={() => {
                setSelectedCustomerId(customer.id);
                setSelectedCategory("");
                setSelectedEquipmentId("");
              }} className={`rounded-xl border p-4 text-left transition ${active ? "border-blue-300 bg-blue-50 shadow-sm ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}>
                    <p className="text-sm font-black text-slate-950">{customer.name}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{count} {t("assets")}</p>
                  </button>;
            })}
              {!customerOptions.length ? <EmptyState title="No customers / sites" message="Add customers or sites first, then assign assets to them." language={language} /> : null}
            </div>
          </div>

          {selectedCustomerId ? <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("Equipment Type")}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {categories.map(category => {
              const active = category.key === selectedCategory;
              return <button key={category.key} type="button" onClick={() => {
                setSelectedCategory(category.key);
                setSelectedEquipmentId("");
              }} className={`rounded-xl border p-4 text-left transition ${active ? "border-slate-900 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}>
                      <p className={`text-sm font-black ${active ? "text-white" : "text-slate-950"}`}>{t(category.label)}</p>
                      <p className={`mt-2 text-xs font-semibold ${active ? "text-slate-300" : "text-slate-500"}`}>{category.count} {t("assets")}</p>
                    </button>;
            })}
                {!categories.length ? <EmptyState title="No equipment" message="No equipment types are linked to this customer." language={language} /> : null}
              </div>
            </div> : null}

          {selectedCustomerId && selectedCategory ? <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("Equipment")}</h3>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {filteredEquipment.map(asset => {
              const active = Number(asset.id) === Number(selectedEquipmentId);
              return <button key={asset.id} type="button" onClick={() => setSelectedEquipmentId(asset.id)} className={`rounded-lg border px-3 py-2 text-center text-sm font-black transition ${active ? "border-blue-300 bg-blue-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}>
                      {asset.name}
                    </button>;
            })}
                {!filteredEquipment.length ? <EmptyState title="No equipment" message="No equipment is available under this type." language={language} /> : null}
              </div>
            </div> : null}
        </div>
      </Panel>

      {selectedCustomerId && selectedCategory && selectedEquipment ? <MaintenanceFollowUpBoard title={`${selectedEquipment.name} - ${t("Maintenance Follow-up")}`} subtitle={`${selectedCustomer?.name || t("Customer")} / ${t(scheduleCategoryLabel(selectedCategory))}. ${t("This page shows the selected equipment maintenance table only.")}`} equipment={[selectedEquipment]} allEquipment={equipment} pmTasks={pmTasks} pmPlans={pmPlans} workOrders={workOrders} onCreatePm={onCreatePm} onEditPm={onEditPm} onDeletePm={onDeletePm} onUpdatePmHistory={onUpdatePmHistory} onImportMaintenanceFollowUp={onImportMaintenanceFollowUp} canManage={canManage} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} language={language} /> : selectedCustomerId && selectedCategory ? <Panel title="Select Equipment" subtitle="Choose an equipment name above to open its preventive maintenance follow-up page." language={language}>
          <EmptyState title="No equipment selected" message="Click one equipment name to show its maintenance table." language={language} />
        </Panel> : null}

      <Panel title={t("Calendar Schedule")} subtitle={t("Work orders grouped by scheduled date for fast maintenance planning.")}>
        <div className="grid gap-4 lg:grid-cols-3">
          {days.map(day => <div key={day} className="min-h-44 rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950">{day}</div>
              <div className="space-y-3 p-4">
                {grouped[day].map(order => <div key={order.id} className="rounded-lg border-l-4 border-blue-600 bg-slate-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">{order.title}</p>
                      <WorkOrderStatus value={order.status} priority={order.priority} language={language} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{order.equipment_name} - {order.engineer_name}</p>
                  </div>)}
              </div>
            </div>)}
          {!days.length ? <EmptyState title="No scheduled work orders" message="Scheduled maintenance will appear in this calendar view." language={language} /> : null}
        </div>
      </Panel>
    </div>;
}

export function MaintenanceFollowUpBoard({
  title = "Equipment Preventive Maintenance Follow-up",
  subtitle = "Dynamic tables are generated from each asset maintenance type, interval, running hours, and previous service data.",
  equipment,
  allEquipment = equipment,
  pmTasks,
  pmPlans = [],
  workOrders,
  onCreatePm,
  onEditPm,
  onDeletePm,
  onUpdatePmHistory,
  onImportMaintenanceFollowUp,
  canManage,
  canAdd = canManage,
  canEdit = canManage,
  canDelete = canManage,
  language
}) {
  const t = text => tr(language, text);
  const targetAsset = equipment[0] || null;
  const followUpRows = buildUnifiedPmRows(pmTasks, pmPlans, allEquipment);
  return <Panel title={title} subtitle={subtitle} language={language} actions={<div className="flex flex-wrap items-center gap-2">
        {canAdd && targetAsset ? <MaintenanceImportControl targetAsset={targetAsset} equipment={allEquipment} pmTasks={pmTasks} pmPlans={pmPlans} onImport={onImportMaintenanceFollowUp} language={language} /> : null}
        {canAdd ? <button onClick={onCreatePm} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"><Plus className="h-4 w-4" />{t("New Record")}</button> : null}
      </div>}>
      <div className="space-y-5">
        {sortEquipmentByName(equipment).map(asset => {
          const rows = followUpRows.filter(task => Number(task.equipment_id) === Number(asset.id));
          return <EquipmentMaintenanceCard key={asset.id} asset={asset} pmTasks={rows} workOrders={workOrders.filter(order => Number(order.equipment_id) === Number(asset.id))} onEditPm={onEditPm} onDeletePm={onDeletePm} onUpdatePmHistory={onUpdatePmHistory} canManage={canManage} canEdit={canEdit} canDelete={canDelete} language={language} />;
        })}
        {!equipment.length ? <EmptyState title="No equipment" message="Add assets first, then create preventive maintenance tasks." language={language} /> : null}
      </div>
    </Panel>;
}

function MaintenanceImportControl({
  targetAsset,
  equipment,
  pmTasks,
  pmPlans = [],
  onImport,
  language
}) {
  const t = text => tr(language, text);
  const [sourceEquipmentId, setSourceEquipmentId] = useState("");
  const [importing, setImporting] = useState(false);
  const sourceOptions = sortEquipmentByName(equipment.filter(asset => Number(asset.id) !== Number(targetAsset.id) && (
    pmTasks.some(task => Number(task.equipment_id) === Number(asset.id))
    || pmPlans.some(plan => Number(plan.equipment_id) === Number(asset.id))
  )));

  async function importTasks() {
    if (!sourceEquipmentId || !onImport) return;
    setImporting(true);
    try {
      const result = await onImport(sourceEquipmentId, targetAsset.id);
      const created = Number(result?.created || 0);
      const skipped = Number(result?.skipped || 0);
      window.alert(result?.message || `Imported ${created} maintenance tasks. Skipped ${skipped} duplicate tasks.`);
      if (created) setSourceEquipmentId("");
    } catch (error) {
      window.alert(error.message || "Failed to import maintenance follow-up.");
    } finally {
      setImporting(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
      <select value={sourceEquipmentId} onChange={event => setSourceEquipmentId(event.target.value)} className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
        <option value="">{t("Import from equipment")}</option>
        {sourceOptions.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
      </select>
      <button type="button" onClick={importTasks} disabled={!sourceEquipmentId || importing} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">
        <Download className="h-4 w-4" />
        {importing ? t("Importing") : t("Import")}
      </button>
    </div>;
}

export function EquipmentMaintenanceCard({
  asset,
  pmTasks,
  workOrders,
  onEditPm,
  onDeletePm,
  onUpdatePmHistory,
  canManage,
  canEdit = canManage,
  canDelete = canManage,
  language
}) {
  const t = text => tr(language, text);
  const [activeRecordsTaskId, setActiveRecordsTaskId] = useState(null);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{asset.name}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {t("Running Hour")}: <span className="text-slate-950">{formatScheduleCell(asset.current_hours)}</span>
            {asset.asset_code ? <span> - {t("Code")}: <span className="text-slate-950">{asset.asset_code}</span></span> : null}
          </p>
        </div>
        <MaintenanceBadge value={asset.maintenance_alert} language={language} />
      </div>

      <div className="overflow-auto">
        <table className="min-w-[1420px] w-full border-collapse text-center text-sm text-slate-950">
          <thead>
            <tr className="bg-white text-sm font-bold">
              <th className="border border-slate-950 px-3 py-2">{t("Preventive Maintenance Type")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Interval")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Running Hour")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Operating Hours at Maintenance")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Next Maintenance Hour")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Remaining Hours")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Next Due Date")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Remaining Days")}</th>
              <th className="border border-slate-950 px-3 py-2">{t("Status")}</th>
              {canEdit || canDelete ? <th className="border border-slate-950 px-3 py-2">{t("Actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {pmTasks.map(task => {
            const runningHour = Number(task.current_hours ?? asset.current_hours ?? 0);
            const hasHourSchedule = Number(task.interval_hours || 0) > 0 || Number(task.next_due_runtime || 0) > 0;
            const nextHour = hasHourSchedule ? task.source === "pm-plan" && Number(task.next_due_runtime || 0) ? Number(task.next_due_runtime || 0) : Number(task.last_service_hours || 0) + Number(task.interval_hours || 0) : "";
            const remainingHours = task.hours_until_due ?? (Number(task.interval_hours || 0) ? nextHour - runningHour : "");
            const remainingDays = task.days_until_due ?? daysUntilDate(task.next_due_date);
            const remainingHoursTone = remainingHours === "" || remainingHours === null || remainingHours === undefined ? "text-slate-500" : Number(remainingHours) <= 0 ? "text-red-600" : Number(remainingHours) <= 100 ? "text-orange-600" : "text-emerald-700";
            const remainingDaysTone = remainingDays === "" || remainingDays === null || remainingDays === undefined ? "text-slate-500" : Number(remainingDays) <= 0 ? "text-red-600" : Number(remainingDays) <= 7 ? "text-orange-600" : "text-emerald-700";
            const previousRecords = previousRecordsForTask(task);
            const recordsOpen = String(activeRecordsTaskId) === String(task.id);
            const isPmPlan = task.source === "pm-plan";
            return <Fragment key={task.id}>
                  <tr className="bg-white">
                    <td className="border border-slate-950 px-3 py-2 font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <span>{task.task_name}</span>
                        {isPmPlan ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">{t("PM Plan")}</span> : null}
                      </div>
                    </td>
                    <td className="border border-slate-950 px-3 py-2">{formatInterval(task, language)}</td>
                    <td className="border border-slate-950 px-3 py-2">{formatScheduleCell(runningHour)}</td>
                    <td className="border border-slate-950 px-3 py-2">
                      <button type="button" onClick={() => setActiveRecordsTaskId(recordsOpen ? null : task.id)} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-black text-blue-700 hover:border-blue-400 hover:bg-blue-100" title={t("Show previous readings")}>
                        {formatScheduleCell(task.last_service_hours)}
                        <span className="ml-2 text-[11px] font-bold text-blue-500">({previousRecords.length})</span>
                      </button>
                    </td>
                    <td className="border border-slate-950 px-3 py-2">{formatScheduleCell(nextHour)}</td>
                    <td className={`border border-slate-950 px-3 py-2 font-black ${remainingHoursTone}`}>{formatScheduleCell(remainingHours)}</td>
                    <td className="border border-slate-950 px-3 py-2">{task.next_due_date || "-"}</td>
                    <td className={`border border-slate-950 px-3 py-2 font-black ${remainingDaysTone}`}>{formatScheduleCell(remainingDays)}</td>
                    <td className="border border-slate-950 px-3 py-2">{t(task.pm_alert || task.status)}</td>
                    {canEdit || canDelete ? <td className="border border-slate-950 px-3 py-2">
                        {isPmPlan ? <span className="text-xs font-black text-slate-500">{t("Managed in PM Plans")}</span> : <>
                            {canEdit ? <button type="button" onClick={() => onEditPm(task)} className="mr-2 rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">{t("Edit")}</button> : null}
                            {canDelete ? <button type="button" onClick={() => onDeletePm(task.id)} className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">{t("Delete")}</button> : null}
                          </>}
                      </td> : null}
                  </tr>
                  {recordsOpen ? <tr>
                      <td colSpan={canEdit || canDelete ? 10 : 9} className="border border-slate-950 bg-slate-50 p-3">
                        <PreviousRecordsTable records={previousRecords} canManage={canEdit && !isPmPlan} onUpdateRecord={onUpdatePmHistory} language={language} />
                      </td>
                    </tr> : null}
                </Fragment>;
          })}
            {!pmTasks.length ? <tr>
                <td colSpan={canEdit || canDelete ? 10 : 9} className="border border-slate-950 px-3 py-8 text-center text-slate-500">{t("No preventive maintenance tasks for this equipment.")}</td>
              </tr> : null}
          </tbody>
        </table>
      </div>
    </section>;
}
