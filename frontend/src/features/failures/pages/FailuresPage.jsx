import { useMemo } from "react";
import { AlertTriangle, Clock3, ClipboardList, Wrench } from "lucide-react";

import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { PriorityBadge, StatusBadge } from "../../../shared/components/StatusBadges.jsx";
import { tr } from "../../../shared/config/appConfig.jsx";
import { buildAssetReliabilityRows, equipmentIndustrialStatus, formatReliabilityHours, isReliabilityFaultOrder } from "../../dashboard/utils/reliabilityMetrics.js";
import { formatShortDate, getWorkOrderSavedDate, parseWorkOrderNotes } from "../../work-orders/utils/workOrderForms.js";

export default function FailuresPage() {
  const { displayData, language, setActive } = useCMMS();
  const t = text => tr(language, text);
  const workOrders = displayData?.["work-orders"] || [];
  const equipment = displayData?.equipment || [];

  const failureOrders = useMemo(() => workOrders.filter(isReliabilityFaultOrder).slice().sort((first, second) => {
    const firstDate = new Date(getWorkOrderSavedDate(first) || 0).getTime();
    const secondDate = new Date(getWorkOrderSavedDate(second) || 0).getTime();
    return secondDate - firstDate;
  }), [workOrders]);

  const reliabilityRows = useMemo(() => buildAssetReliabilityRows(workOrders, equipment, []), [workOrders, equipment]);
  const activeBreakdownAssets = useMemo(() => reliabilityRows.filter(asset => ["Breakdown", "Offline"].includes(equipmentIndustrialStatus(asset))), [reliabilityRows]);
  const criticalOrders = failureOrders.filter(order => ["critical", "high"].includes(String(order.priority || "").toLowerCase())).length;
  const downtimeHours = reliabilityRows.reduce((total, asset) => total + Number(asset.downtimeHours || 0), 0);

  return (
    <div className="space-y-5">
      <Panel title={t("Failures")} subtitle={t("Failure work orders and assets currently in breakdown or offline status.")}>
        <div className="grid gap-4 md:grid-cols-4">
          <FailureStat icon={Wrench} label={t("Active Breakdown Assets")} value={activeBreakdownAssets.length} tone="red" />
          <FailureStat icon={ClipboardList} label={t("Failure Work Orders")} value={failureOrders.length} tone="blue" />
          <FailureStat icon={AlertTriangle} label={t("Critical / High")} value={criticalOrders} tone="orange" />
          <FailureStat icon={Clock3} label={t("Downtime Hours")} value={formatReliabilityHours(downtimeHours)} tone="slate" />
        </div>
      </Panel>

      <Panel title={t("Active Breakdown Assets")} subtitle={t("Assets marked as breakdown or offline and requiring maintenance attention.")}>
        {activeBreakdownAssets.length ? (
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {["Asset", "Site", "Status", "Criticality", "Faults", "Downtime"].map(heading => <th key={heading} className="px-4 py-3 text-left">{t(heading)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeBreakdownAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-black text-slate-950">{asset.name || "-"}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{asset.site || asset.location || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge value={asset.statusLabel} language={language} /></td>
                    <td className="px-4 py-3"><PriorityBadge value={asset.criticality || "medium"} language={language} /></td>
                    <td className="px-4 py-3 font-black text-slate-950">{asset.faults || 0}</td>
                    <td className="px-4 py-3 font-black text-slate-950">{asset.downtimeLabel || "0h"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No failure events" message="Assets marked as breakdown or offline will appear here." language={language} />
        )}
      </Panel>

      <Panel
        title={t("Failure Work Orders")}
        subtitle={t("Work orders classified as breakdown, fault, or down events.")}
        actions={<button type="button" onClick={() => setActive?.("work-orders")} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">{t("View Work Orders")}</button>}
      >
        {failureOrders.length ? (
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {["Date", "W.O.", "Asset", "Failure Cause", "Status", "Priority"].map(heading => <th key={heading} className="px-4 py-3 text-left">{t(heading)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {failureOrders.map(order => {
                  const meta = parseWorkOrderNotes(order.notes);
                  const asset = equipment.find(item => Number(item.id) === Number(order.equipment_id));
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-600">{formatShortDate(getWorkOrderSavedDate(order), language)}</td>
                      <td className="px-4 py-3 font-black text-slate-950">{order.title || meta.wo_reference || `WO-${order.id}`}</td>
                      <td className="px-4 py-3 font-bold text-slate-600">{asset?.name || meta.asset_name || "-"}</td>
                      <td className="px-4 py-3 font-bold text-slate-600">{meta.failure_cause || meta.maintenance_type || order.description || "-"}</td>
                      <td className="px-4 py-3"><StatusBadge value={order.status} language={language} /></td>
                      <td className="px-4 py-3"><PriorityBadge value={order.priority || "medium"} language={language} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No failure events" message="Breakdown work orders will appear here after they are created." language={language} />
        )}
      </Panel>
    </div>
  );
}

function FailureStat({ icon: Icon, label, value, tone }) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] opacity-80">{label}</p>
          <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/70">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
