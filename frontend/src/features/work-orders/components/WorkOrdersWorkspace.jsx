import { AlertTriangle, Eye, MoreHorizontal, Printer, QrCode, Save } from "lucide-react";

import { Panel } from "../../../shared/components/Panel.jsx";
import { PriorityBadge, StatusBadge } from "../../../shared/components/StatusBadges.jsx";
import { SavedWorkOrderFilters, SavedWorkOrdersTable } from "./SavedWorkOrders.jsx";
import {
  DocBand,
  DocBox,
  DocDateRow,
  DocField,
  DocLabel,
  DocManualTimeRow,
  DocSectionLabel,
  DocSelect,
  DocStackSelect,
  DocStatic,
  DocTextarea,
  InventorySpareParts,
  NumberedMembersEditor
} from "./WorkOrderDocumentParts.jsx";
import { PhotoUploader, SignaturePad } from "./WorkOrderMedia.jsx";
import {
  WorkOrderActionButton,
  WorkOrderAttachmentsTab,
  WorkOrderChecklistTab,
  WorkOrderHistoryTab,
  WorkOrderKpi,
  WorkOrderLaborTab,
  WorkOrderNotesTab,
  WorkOrderOverviewTab,
  WorkOrderPartsTab,
  WorkOrderQuickInfo
} from "./WorkOrderTabs.jsx";

export function WorkOrdersWorkspace({ app }) {
  const {
    t,
    workOrderSectionRef,
    selectedEquipment,
    selectedCustomer,
    form,
    woReference,
    currentStatus,
    language,
    quickAssignedTo,
    viewingSavedId,
    canRunAction,
    actionKeys,
    runLifecycle,
    moreActionsOpen,
    setMoreActionsOpen,
    exportWorkOrderPdf,
    qrOpen,
    closeQrScanner,
    openQrScanner,
    onBackToEquipment,
    editingId,
    canEdit,
    canCreate,
    saveWorkOrder,
    filteredEquipment,
    customers,
    chooseCustomer,
    chooseEquipment,
    engineers,
    setForm,
    videoRef,
    qrMessage,
    estimatedHours,
    smartAlerts,
    workOrderTabs,
    activeWorkOrderTab,
    setActiveWorkOrderTab,
    update,
    updatePhotos,
    lifecycleDraft,
    setLifecycleDraft,
    checklistProgress,
    duration,
    selectedEngineer,
    updateSparePart,
    addSparePart,
    partsTotal,
    updateSignature,
    activeSavedOrder,
    updateMember,
    addMember,
    selectedSavedId,
    openSelected,
    editSelected,
    deleteSelected,
    canDelete,
    newWorkOrder,
    savedEquipmentOptions,
    savedDateOptions,
    savedFilter,
    setSavedFilter,
    filteredSavedRows,
    setSelectedSavedId,
    DOCUMENT_CODE,
    ISSUE_NO,
    ISSUE_DATE
  } = app;

  return (
    <div className="space-y-5">
      <section ref={workOrderSectionRef} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{t("Work Order")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="truncate text-2xl font-black text-slate-950">{woReference}</h2>
                <StatusBadge value={currentStatus} language={language} />
                <PriorityBadge value={form.priority} language={language} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-slate-600">
                <span>{selectedEquipment?.name || "Asset not selected"}</span>
                <span>{quickAssignedTo}</span>
                {viewingSavedId ? <span className="text-blue-700">{t("Viewing Saved Work Order")}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WorkOrderActionButton disabled={!canRunAction || !actionKeys.has("pause")} onClick={() => runLifecycle("pause")} label="Pause" />
              <WorkOrderActionButton disabled={!canRunAction || !actionKeys.has("waiting-parts")} onClick={() => runLifecycle("waiting-parts")} label="Waiting Parts" />
              <WorkOrderActionButton primary disabled={!canRunAction || !actionKeys.has("complete")} onClick={() => runLifecycle("complete")} label="Complete" />
              <div className="relative">
                <button type="button" onClick={() => setMoreActionsOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700" aria-label="More actions">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {moreActionsOpen ? (
                  <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <button type="button" onClick={exportWorkOrderPdf} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" />{t("Export PDF")}</button>
                    <button type="button" onClick={qrOpen ? closeQrScanner : openQrScanner} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><QrCode className="h-4 w-4" />{t("Scan Equipment QR")}</button>
                    <button type="button" onClick={onBackToEquipment} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />{t("Back to Equipment")}</button>
                  </div>
                ) : null}
              </div>
              {((editingId && canEdit) || (!editingId && !viewingSavedId && canCreate)) ? (
                <button type="button" onClick={saveWorkOrder} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-800">
                  <Save className="h-4 w-4" /> {editingId ? t("Save Changes") : t("Save Work Order")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 bg-slate-50 p-5 2xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:grid-cols-3">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Customer")}</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500" value={form.customer_id || ""} onChange={(event) => chooseCustomer(event.target.value)}>
                  <option value=""></option>
                  {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Equipment")}</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400" value={form.equipment_id || ""} onChange={(event) => chooseEquipment(event.target.value)} disabled={!form.customer_id}>
                  <option value=""></option>
                  {filteredEquipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("Assigned To")}</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500" value={form.engineer_id || ""} onChange={(event) => {
                  const engineer = engineers.find((item) => Number(item.id) === Number(event.target.value));
                  setForm((current) => ({ ...current, engineer_id: event.target.value, shift_engineer_name: engineer?.name || current.shift_engineer_name }));
                }}>
                  <option value=""></option>
                  {engineers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>

            {qrOpen ? (
              <div className="border-b border-slate-200 bg-slate-950 p-4 text-white">
                <div className="mx-auto max-w-xl">
                  <video ref={videoRef} className="aspect-video w-full rounded-xl border border-cyan-300/40 bg-black object-cover" muted playsInline />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-300">{qrMessage || t("Scan Equipment QR")}</p>
                    <button type="button" onClick={closeQrScanner} className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950">{t("Close Camera")}</button>
                  </div>
                </div>
              </div>
            ) : null}

            <WorkOrderQuickInfo fields={[["Asset", selectedEquipment?.name || "-"], ["Location", selectedCustomer?.name || selectedEquipment?.location || form.location || "-"], ["PM / Corrective", form.maintenance_type || "-"], ["Reporter", form.shift_engineer_name || selectedEngineer?.name || "-"], ["Assigned To", quickAssignedTo], ["Planned Date", form.start_date || "-"], ["Estimated Hours", estimatedHours], ["Current Runtime", `${Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0).toLocaleString()} h`]]} />

            {smartAlerts.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-black text-amber-900">Smart Alerts</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {smartAlerts.map((alert) => <span key={alert} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">{alert}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-3">
                {workOrderTabs.map(([key, label, Icon]) => (
                  <button key={key} type="button" onClick={() => setActiveWorkOrderTab(key)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${activeWorkOrderTab === key ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"}`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeWorkOrderTab === "overview" ? <WorkOrderOverviewTab form={form} update={update} status={currentStatus} selectedEquipment={selectedEquipment} selectedCustomer={selectedCustomer} photosBefore={form.before_photos} photosAfter={form.after_photos} updatePhotos={updatePhotos} language={language} /> : null}
                {activeWorkOrderTab === "checklist" ? <WorkOrderChecklistTab draft={lifecycleDraft} setDraft={setLifecycleDraft} checklistProgress={checklistProgress} form={form} /> : null}
                {activeWorkOrderTab === "labor" ? <WorkOrderLaborTab form={form} update={update} draft={lifecycleDraft} setDraft={setLifecycleDraft} duration={duration} selectedEquipment={selectedEquipment} selectedEngineer={selectedEngineer} /> : null}
                {activeWorkOrderTab === "parts" ? <WorkOrderPartsTab items={form.spare_parts_items} onChange={updateSparePart} onAdd={addSparePart} total={partsTotal} /> : null}
                {activeWorkOrderTab === "attachments" ? <WorkOrderAttachmentsTab form={form} updateSignature={updateSignature} labels={{ clear: t("Clear Signature") }} /> : null}
                {activeWorkOrderTab === "history" ? <WorkOrderHistoryTab order={activeSavedOrder} /> : null}
                {activeWorkOrderTab === "notes" ? <WorkOrderNotesTab form={form} update={update} selectedEngineer={selectedEngineer} /> : null}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">KPI Sidebar</p>
              <div className="mt-4 grid gap-3">
                <WorkOrderKpi label="Execution Duration" value={duration} />
                <WorkOrderKpi label="Completion" value={`${checklistProgress}%`} tone={checklistProgress === 100 ? "green" : "amber"} />
                <WorkOrderKpi label="Labor Cost" value="0 EGP" />
                <WorkOrderKpi label="Parts Cost" value={`${partsTotal.toLocaleString()} EGP`} />
                <WorkOrderKpi label="Total Cost" value={`${partsTotal.toLocaleString()} EGP`} />
                <WorkOrderKpi label="Downtime" value={duration} tone={duration === "0:00" ? "slate" : "red"} />
              </div>
            </div>

            <div className="rounded-2xl bg-blue-700 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">QR Code</p>
                  <p className="mt-2 text-sm font-bold text-blue-50">Open this work order from mobile.</p>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-white text-blue-700">
                  <QrCode className="h-9 w-9" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-black text-slate-950">AI Suggestions</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Future assistant area for prior failures, running hours, and suggested actions.</p>
            </div>
          </aside>
        </div>

        <WorkOrderPrintDocument app={app} />

        {((editingId && canEdit) || (!editingId && !viewingSavedId && canCreate)) ? (
          <div className="hidden flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button type="button" onClick={saveWorkOrder} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
              <Save className="h-4 w-4" /> {editingId ? t("Save Changes") : t("Save Work Order")}
            </button>
          </div>
        ) : null}
      </section>

      <Panel
        title={t("Saved Work Orders")}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openSelected} disabled={!selectedSavedId} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">{t("Open Selected")}</button>
            {canEdit ? <button type="button" onClick={editSelected} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">{t("Edit Selected")}</button> : null}
            {canDelete ? <button type="button" onClick={deleteSelected} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">{t("Delete Selected")}</button> : null}
            <button type="button" onClick={exportWorkOrderPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" />{t("Export PDF")}</button>
            {canCreate ? <button type="button" onClick={newWorkOrder} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">{t("New Work Order")}</button> : null}
          </div>
        }
      >
        <SavedWorkOrderFilters
          equipment={savedEquipmentOptions}
          dates={savedDateOptions}
          value={savedFilter}
          onChange={(patch) => {
            setSavedFilter((current) => ({
              ...current,
              ...patch,
              ...(Object.prototype.hasOwnProperty.call(patch, "equipmentId") ? { date: "" } : {})
            }));
          }}
          language={language}
        />
        <SavedWorkOrdersTable rows={filteredSavedRows} selectedId={selectedSavedId} setSelectedId={setSelectedSavedId} onOpen={openSelected} language={language} />
      </Panel>
    </div>
  );
}

function WorkOrderPrintDocument({ app }) {
  const {
    t,
    form,
    update,
    updateMember,
    addMember,
    engineers,
    selectedEquipment,
    selectedCustomer,
    duration,
    updateSparePart,
    addSparePart,
    updateSignature,
    updatePhotos,
    DOCUMENT_CODE,
    ISSUE_NO,
    ISSUE_DATE
  } = app;

  return (
    <>
      <div className="work-order-print-area hidden bg-white p-0">
        <div className="mx-auto min-w-[1120px] max-w-[1280px] border-2 border-slate-950 bg-white text-[12px] text-slate-950 shadow-sm">
          <div className="grid grid-cols-[340px_1fr_260px] border-b-2 border-slate-950">
            <div className="grid grid-cols-[150px_1fr] border-r-2 border-slate-950">
              <DocLabel>{t("Document Code")}:</DocLabel><DocStatic>{DOCUMENT_CODE}</DocStatic>
              <DocLabel>{t("Issue No")}:</DocLabel><DocStatic>{ISSUE_NO}</DocStatic>
              <DocLabel>{t("Issue Date")}:</DocLabel><DocStatic>{ISSUE_DATE}</DocStatic>
              <DocLabel>{t("W.O No")}:</DocLabel><DocStatic>{form.wo_no}</DocStatic>
            </div>
            <div className="grid place-items-center border-r-2 border-slate-950 px-4 text-center text-xl font-black">Maintenance Work Order</div>
            <div className="grid place-items-center p-4">
              <div className="text-center text-slate-900">
                <div className="text-3xl font-black tracking-[0.18em]">CMMS</div>
                <div className="mt-1 text-[11px] font-bold leading-tight">Maintenance<br />Management<br />System</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950"><DocSectionLabel>Firstly</DocSectionLabel><div className="bg-white" /></div>
          <div className="grid grid-cols-[340px_1fr] border-b border-slate-950">
            <DocLabel>{t("THE WORK ORDER IS ISSUED BY SHIFT ENGINEER")}:</DocLabel>
            <DocSelect value={form.shift_engineer_name} onChange={(value) => update("shift_engineer_name", value)} options={engineers.map((item) => item.name)} />
            <DocLabel>{t("FOR REQUESTING AND ASSIGN THE TASK FOR")}:</DocLabel>
            <DocSelect value={form.assigned_to} onChange={(value) => update("assigned_to", value)} options={engineers.map((item) => item.name)} />
          </div>
          <DocBand>{t("The Names of appointed Members to perform the task are")}:-</DocBand>
          <NumberedMembersEditor members={form.appointed_members_list} onChange={updateMember} onAdd={addMember} options={engineers.map((item) => item.name)} addLabel={t("Add member")} />
          <DocBand>{t("The Description & details of the required task to be done / undertaken is")}:-</DocBand>
          <div className="grid grid-cols-[1fr_240px_220px] border-b-2 border-slate-950">
            <DocTextarea value={form.task_description} onChange={(value) => update("task_description", value)} rows={8} />
            <div className="border-l-2 border-slate-950">
              <DocBand>{t("RH / Service Hours")}</DocBand>
              <div className="grid h-16 place-items-center border-b-2 border-slate-950 text-lg font-black">{Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0).toLocaleString()} hours</div>
              <div className="grid h-16 place-items-center border-b-2 border-slate-950 text-sm font-bold">S.N: {selectedEquipment?.serial_number || form.serial_number || "-"}</div>
              <DocBand>{t("The Start Of Task")}</DocBand>
              <DocManualTimeRow label={t("Starting Time is")} value={form.start_time} onChange={(value) => update("start_time", value)} />
              <DocDateRow label={t("Day in")} value={form.start_date} onChange={(value) => update("start_date", value)} />
              <DocBand>{t("The End of The Task")}</DocBand>
              <DocManualTimeRow label={t("Finished Time is")} value={form.finished_time} onChange={(value) => update("finished_time", value)} />
              <DocDateRow label={t("Day in")} value={form.finished_date} onChange={(value) => update("finished_date", value)} />
              <DocBand>{t("Duration")}</DocBand>
              <div className="grid h-12 place-items-center border-b border-slate-950 bg-white text-lg font-black">{duration}</div>
            </div>
            <div className="border-l-2 border-slate-950">
              <DocBand>{t("Location")}</DocBand>
              <div className="grid h-[126px] place-items-center border-b-2 border-slate-950 px-3 text-center text-lg font-black">{selectedCustomer?.name || selectedEquipment?.location || "-"}</div>
              <DocStackSelect label={t("Type of maintenance")} value={form.maintenance_type} onChange={(value) => update("maintenance_type", value)} options={["Service", "Condition Based / Predictive", "Periodic / Time based", "Breakdown"]} />
              <DocStackSelect label={t("Priority")} value={form.priority} onChange={(value) => update("priority", value)} options={["low", "medium", "high", "critical"]} />
              <DocStackSelect label={t("Status")} value={form.status} onChange={(value) => update("status", value)} options={["pending", "in_progress", "completed", "cancelled"]} />
            </div>
          </div>
          <div className="grid grid-cols-2 border-b-2 border-slate-950">
            <DocField shaded label={t("Work Order Executor Name")} value={form.executor_name} onChange={(value) => update("executor_name", value)} options={engineers.map((item) => item.name)} />
            <DocField shaded label={t("Job Title")} value={form.executor_job_title} onChange={(value) => update("executor_job_title", value)} options={["Shift Engineer", "Senior Electrical Technician", "Mechanical Technician", "Maintenance Engineer"]} />
          </div>
          <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950"><DocSectionLabel>Thirdly</DocSectionLabel><div /></div>
          <div className="grid grid-cols-[1fr_420px] border-b-2 border-slate-950">
            <DocBox shadedLabel label={t("The Necessary requirements before starting the mentioned task")} value={form.requirements} onChange={(value) => update("requirements", value)} />
            <InventorySpareParts items={form.spare_parts_items} onChange={updateSparePart} onAdd={addSparePart} labels={{ title: t("Inventory-linked spare parts"), part: t("Part name"), qty: t("Qty"), add: t("Add part") }} />
            <DocBox shadedLabel label="QHSE INSTRUCTIONS" value={form.qhse_instructions} onChange={(value) => update("qhse_instructions", value)} />
            <DocBox shadedLabel label={t("Safety Responsible")} value={form.safety_responsible} onChange={(value) => update("safety_responsible", value)} />
          </div>
          <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950"><DocSectionLabel>Fourthly</DocSectionLabel><div /></div>
          <DocBox shadedLabel label={t("Site Preparation")} value={form.site_preparation} onChange={(value) => update("site_preparation", value)} wide />
          <div className="grid grid-cols-[1fr_1fr] border-b-2 border-slate-950">
            <DocField shaded label={t("Work Order Holder Name")} value={form.holder_name} onChange={(value) => update("holder_name", value)} options={engineers.map((item) => item.name)} />
            <DocField shaded label={t("Job Title")} value={form.holder_job_title} onChange={(value) => update("holder_job_title", value)} options={["Senior Electrical Technician", "Shift Engineer", "Maintenance Engineer"]} />
            <SignaturePad title={`${t("Signature")}: ${t("Work Order Holder Name")}`} value={form.signature_executor} onChange={(value) => updateSignature("signature_executor", value)} labels={{ clear: t("Clear Signature") }} />
            <SignaturePad title={`${t("Signature")}: ${t("Shift Engineer Name")}`} value={form.signature_shift_engineer} onChange={(value) => updateSignature("signature_shift_engineer", value)} labels={{ clear: t("Clear Signature") }} />
          </div>
          <div className="grid grid-cols-[170px_1fr] border-b-2 border-slate-950"><DocSectionLabel>Fifth</DocSectionLabel><DocStatic>Ending the Work Order</DocStatic></div>
          <DocBand>We have worked to fulfill the assigned task to us in accordance with the work order reference number and now we have finished the task.</DocBand>
          <DocBox label={t("Recommendation")} value={form.recommendation} onChange={(value) => update("recommendation", value)} wide />
          <div className="grid grid-cols-2 border-b-2 border-slate-950">
            <DocField shaded label={t("Executive Name")} value={form.executive_name} onChange={(value) => update("executive_name", value)} options={engineers.map((item) => item.name)} />
            <DocField shaded label={t("Shift Engineer Name")} value={form.shift_engineer_name} onChange={(value) => update("shift_engineer_name", value)} options={engineers.map((item) => item.name)} />
            <DocStatic>{t("Signature")}:</DocStatic>
            <DocStatic>{t("Signature")}:</DocStatic>
          </div>
          <div className="grid grid-cols-[1fr_1fr] border-b-2 border-slate-950">
            <DocStatic shaded>Manager Signature</DocStatic>
            <DocSelect value={form.manager_name} onChange={(value) => update("manager_name", value)} options={engineers.map((item) => item.name)} />
          </div>
          <SignaturePad title={`${t("Digital Signature")}: Manager Signature`} value={form.signature_manager} onChange={(value) => updateSignature("signature_manager", value)} labels={{ clear: t("Clear Signature") }} />
        </div>
      </div>
      <div className="hidden gap-4 border-t border-slate-200 bg-white p-4 lg:grid-cols-2">
        <PhotoUploader title={t("Before Maintenance Photos")} photos={form.before_photos} onChange={(photos) => updatePhotos("before_photos", photos)} uploadLabel={t("Upload Photos")} />
        <PhotoUploader title={t("After Maintenance Photos")} photos={form.after_photos} onChange={(photos) => updatePhotos("after_photos", photos)} uploadLabel={t("Upload Photos")} />
      </div>
    </>
  );
}
