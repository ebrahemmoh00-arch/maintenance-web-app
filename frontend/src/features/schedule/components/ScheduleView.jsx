import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { MaintenanceBadge, WorkOrderStatus } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { PreviousRecordsTable, buildScheduleCategories, equipmentCategory, formatInterval, formatScheduleCell, previousRecordsForTask, scheduleCategoryLabel, sortEquipmentByName } from "./MaintenanceFollowUp.jsx";
import { Plus } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

export function Schedule({
  customers = [],
  workOrders,
  pmTasks,
  equipment = [],
  onCreatePm,
  onEditPm,
  onDeletePm,
  onUpdatePmHistory,
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
      <Panel title="Schedule Navigator" subtitle="Select the customer/location first, then choose the equipment type to show its maintenance follow-up tables.">
        <div className="space-y-5">
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Customers / Locations</h3>
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
                    <p className="mt-2 text-xs font-semibold text-slate-500">{count} assets</p>
                  </button>;
            })}
              {!customerOptions.length ? <EmptyState title={t("No customers / locations")} message={t("Add customers or places first, then assign assets to them.")} /> : null}
            </div>
          </div>

          {selectedCustomerId ? <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Equipment Type</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {categories.map(category => {
              const active = category.key === selectedCategory;
              return <button key={category.key} type="button" onClick={() => {
                setSelectedCategory(category.key);
                setSelectedEquipmentId("");
              }} className={`rounded-xl border p-4 text-left transition ${active ? "border-slate-900 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}>
                      <p className={`text-sm font-black ${active ? "text-white" : "text-slate-950"}`}>{category.label}</p>
                      <p className={`mt-2 text-xs font-semibold ${active ? "text-slate-300" : "text-slate-500"}`}>{category.count} assets</p>
                    </button>;
            })}
                {!categories.length ? <EmptyState title={t("No equipment")} message="No equipment types are linked to this customer." /> : null}
              </div>
            </div> : null}

          {selectedCustomerId && selectedCategory ? <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Equipment</h3>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {filteredEquipment.map(asset => {
              const active = Number(asset.id) === Number(selectedEquipmentId);
              return <button key={asset.id} type="button" onClick={() => setSelectedEquipmentId(asset.id)} className={`rounded-lg border px-3 py-2 text-center text-sm font-black transition ${active ? "border-blue-300 bg-blue-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}>
                      {asset.name}
                    </button>;
            })}
                {!filteredEquipment.length ? <EmptyState title={t("No equipment")} message="No equipment is available under this type." /> : null}
              </div>
            </div> : null}
        </div>
      </Panel>

      {selectedCustomerId && selectedCategory && selectedEquipment ? <MaintenanceFollowUpBoard title={`${selectedEquipment.name} - Maintenance Follow-up`} subtitle={`${selectedCustomer?.name || "Customer"} / ${scheduleCategoryLabel(selectedCategory)}. This page shows the selected equipment maintenance table only.`} equipment={[selectedEquipment]} pmTasks={pmTasks} workOrders={workOrders} onCreatePm={onCreatePm} onEditPm={onEditPm} onDeletePm={onDeletePm} onUpdatePmHistory={onUpdatePmHistory} canManage={canManage} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} language={language} /> : selectedCustomerId && selectedCategory ? <Panel title="Select Equipment" subtitle="Choose an equipment name above to open its preventive maintenance follow-up page.">
          <EmptyState title="No equipment selected" message="Click one equipment name to show its maintenance table." />
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
          {!days.length ? <EmptyState title={t("No scheduled work orders")} message={t("Scheduled maintenance will appear in this calendar view.")} /> : null}
        </div>
      </Panel>
    </div>;
}

export function MaintenanceFollowUpBoard({
  title = "Equipment Preventive Maintenance Follow-up",
  subtitle = "Dynamic tables are generated from each asset maintenance type, interval, running hours, and previous service data.",
  equipment,
  pmTasks,
  workOrders,
  onCreatePm,
  onEditPm,
  onDeletePm,
  onUpdatePmHistory,
  canManage,
  canAdd = canManage,
  canEdit = canManage,
  canDelete = canManage,
  language
}) {
  const t = text => tr(language, text);
  return <Panel title={title} subtitle={subtitle} actions={canAdd ? <button onClick={onCreatePm} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"><Plus className="h-4 w-4" />{t("New Record")}</button> : null}>
      <div className="space-y-5">
        {sortEquipmentByName(equipment).map(asset => <EquipmentMaintenanceCard key={asset.id} asset={asset} pmTasks={pmTasks.filter(task => Number(task.equipment_id) === Number(asset.id))} workOrders={workOrders.filter(order => Number(order.equipment_id) === Number(asset.id))} onEditPm={onEditPm} onDeletePm={onDeletePm} onUpdatePmHistory={onUpdatePmHistory} canManage={canManage} canEdit={canEdit} canDelete={canDelete} />)}
        {!equipment.length ? <EmptyState title={t("No equipment")} message="Add assets first, then create preventive maintenance tasks." /> : null}
      </div>
    </Panel>;
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
  canDelete = canManage
}) {
  const [activeRecordsTaskId, setActiveRecordsTaskId] = useState(null);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{asset.name}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Running Hour: <span className="text-slate-950">{formatScheduleCell(asset.current_hours)}</span>
            {asset.asset_code ? <span> - Code: <span className="text-slate-950">{asset.asset_code}</span></span> : null}
          </p>
        </div>
        <MaintenanceBadge value={asset.maintenance_alert} />
      </div>

      <div className="overflow-auto">
        <table className="min-w-[1180px] w-full border-collapse text-center text-sm text-slate-950">
          <thead>
            <tr className="bg-white text-sm font-bold">
              <th className="border border-slate-950 px-3 py-2">Preventive Maintenance Type</th>
              <th className="border border-slate-950 px-3 py-2">Interval</th>
              <th className="border border-slate-950 px-3 py-2">Running Hour</th>
              <th className="border border-slate-950 px-3 py-2">Operating Hours at Maintenance</th>
              <th className="border border-slate-950 px-3 py-2">Next Maintenance Hour</th>
              <th className="border border-slate-950 px-3 py-2">Remaining Hours</th>
              <th className="border border-slate-950 px-3 py-2">Status</th>
              {canEdit || canDelete ? <th className="border border-slate-950 px-3 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {pmTasks.map(task => {
            const runningHour = Number(task.current_hours ?? asset.current_hours ?? 0);
            const nextHour = Number(task.last_service_hours || 0) + Number(task.interval_hours || 0);
            const remainingHours = task.hours_until_due ?? (Number(task.interval_hours || 0) ? nextHour - runningHour : "");
            const previousRecords = previousRecordsForTask(task);
            const recordsOpen = Number(activeRecordsTaskId) === Number(task.id);
            return <Fragment key={task.id}>
                  <tr className="bg-white">
                    <td className="border border-slate-950 px-3 py-2 font-semibold">{task.task_name}</td>
                    <td className="border border-slate-950 px-3 py-2">{formatInterval(task)}</td>
                    <td className="border border-slate-950 px-3 py-2">{formatScheduleCell(runningHour)}</td>
                    <td className="border border-slate-950 px-3 py-2">
                      <button type="button" onClick={() => setActiveRecordsTaskId(recordsOpen ? null : task.id)} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-black text-blue-700 hover:border-blue-400 hover:bg-blue-100" title="Show previous readings">
                        {formatScheduleCell(task.last_service_hours)}
                        <span className="ml-2 text-[11px] font-bold text-blue-500">({previousRecords.length})</span>
                      </button>
                    </td>
                    <td className="border border-slate-950 px-3 py-2">{formatScheduleCell(nextHour)}</td>
                    <td className={`border border-slate-950 px-3 py-2 font-black ${Number(remainingHours) <= 0 ? "text-red-600" : Number(remainingHours) <= 100 ? "text-orange-600" : "text-emerald-700"}`}>{formatScheduleCell(remainingHours)}</td>
                    <td className="border border-slate-950 px-3 py-2">{task.pm_alert || task.status}</td>
                    {canEdit || canDelete ? <td className="border border-slate-950 px-3 py-2">
                        {canEdit ? <button type="button" onClick={() => onEditPm(task)} className="mr-2 rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">Edit</button> : null}
                        {canDelete ? <button type="button" onClick={() => onDeletePm(task.id)} className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button> : null}
                      </td> : null}
                  </tr>
                  {recordsOpen ? <tr>
                      <td colSpan={canEdit || canDelete ? 8 : 7} className="border border-slate-950 bg-slate-50 p-3">
                        <PreviousRecordsTable records={previousRecords} canManage={canEdit} onUpdateRecord={onUpdatePmHistory} />
                      </td>
                    </tr> : null}
                </Fragment>;
          })}
            {!pmTasks.length ? <tr>
                <td colSpan={canEdit || canDelete ? 8 : 7} className="border border-slate-950 px-3 py-8 text-center text-slate-500">No preventive maintenance tasks for this equipment.</td>
              </tr> : null}
          </tbody>
        </table>
      </div>
    </section>;
}
