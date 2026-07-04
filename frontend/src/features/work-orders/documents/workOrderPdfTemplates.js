import { formatShortDate, sanitizePdfFileName } from "../utils/workOrderForms.js";
import { getDocumentBranding } from "./documentBranding.js";
import { documentTemplates } from "./documentTemplates.js";
import { PdfReport } from "./pdfEngine.js";

export { documentTemplates };

const renderers = {
  standard: renderStandardWorkOrder,
  detailed: renderDetailedWorkOrder,
  completion: renderCompletionReport,
  "pm-inspection": renderPmInspectionReport,
  breakdown: renderBreakdownReport
};

export function exportWorkOrderDocument(templateKey, context) {
  const renderer = renderers[templateKey] || renderers.standard;
  renderer(normalizeContext(context));
}

function normalizeContext(context) {
  const form = context.form || {};
  const savedOrder = context.savedOrder || {};
  const equipment = context.equipment || {};
  const customer = context.customer || {};
  const engineer = context.engineer || {};
  const woReference = context.woReference || savedOrder.title || `${customer.name || form.location || "Location"} ${equipment.name || "Asset"} -${form.wo_no || "0000"}`;
  const woNumber = String(form.wo_no || extractNumber(woReference) || savedOrder.id || "0000").replace(/^-+/, "").padStart(4, "0");
  const generationDate = new Date();
  return {
    ...context,
    form,
    savedOrder,
    equipment,
    customer,
    engineer,
    woReference,
    woNumber,
    generationDate,
    branding: getDocumentBranding(),
    workOrderUrl: context.workOrderUrl || `${window.location.origin}/work-orders?work_order_id=${savedOrder.id || ""}`
  };
}

function renderStandardWorkOrder(ctx) {
  const report = createReport(ctx, "Standard Work Order", "Daily field maintenance document optimized for printing.");
  report.section("Work Order Summary");
  report.labelValueGrid([
    row("Work Order Number", ctx.woReference),
    row("Asset", assetName(ctx)),
    row("Location", locationName(ctx)),
    row("Priority", ctx.form.priority),
    row("Assigned Technician", assignedTechnician(ctx)),
    row("Planned Hours", ctx.form.estimated_hours || ctx.duration || "-")
  ]);
  report.section("Description");
  report.paragraph(ctx.form.task_description || ctx.savedOrder.description || "Maintenance work order.");
  report.section("Required Parts");
  report.table(["Part", "Quantity", "Notes"], partRows(ctx).map(item => [item.name, item.qty, item.notes]), { colWidths: [90, 25, 67] });
  report.section("Safety Notes");
  report.paragraph(ctx.form.qhse_instructions || ctx.form.requirements || "Follow site safety requirements before starting the task.");
  report.qrCode("Scan to open Work Order");
  report.signatures();
  report.finalize(fileName(ctx, "standard"));
}

function renderDetailedWorkOrder(ctx) {
  const report = createReport(ctx, "Detailed Work Order", "Full maintenance documentation with asset, labor, parts, checklist, timeline, and approvals.");
  report.section("General Information");
  report.labelValueGrid(generalRows(ctx));
  report.section("Work Description");
  report.paragraph(ctx.form.task_description || ctx.savedOrder.description || "-");
  report.section("Asset Details");
  report.labelValueGrid(assetRows(ctx));
  report.section("Maintenance History Summary");
  report.table(["Item", "Value"], [
    ["Last PM", ctx.equipment.last_pm || ctx.equipment.last_maintenance_date || "-"],
    ["Next PM", ctx.equipment.next_pm || ctx.equipment.next_maintenance_date || "-"],
    ["Current Runtime", runtime(ctx)],
    ["Current Status", ctx.equipment.status || ctx.form.status || "-"]
  ], { colWidths: [70, 112] });
  report.section("PM Information");
  report.labelValueGrid([
    row("PM Number", `PM-${ctx.woNumber}`),
    row("Maintenance Type", ctx.form.maintenance_type),
    row("Frequency", ctx.form.pm_frequency || ctx.form.frequency || "-"),
    row("Checklist Status", ctx.checklistProgress === 100 ? "Completed" : "Pending")
  ]);
  report.section("Spare Parts Used");
  report.table(["Part", "Code", "Warehouse", "Qty", "Unit Cost", "Total"], detailedPartRows(ctx), { colWidths: [52, 30, 35, 18, 24, 24] });
  report.section("Labor");
  report.table(["Technician", "Start", "Finish", "Duration", "Runtime", "Notes"], laborRows(ctx), { colWidths: [42, 28, 28, 24, 28, 32] });
  report.section("Measurements");
  report.table(["Measurement", "Reading", "Unit", "Notes"], measurementRows(ctx), { colWidths: [45, 35, 25, 77] });
  report.imageGrid("Before Photos", ctx.form.before_photos || []);
  report.imageGrid("After Photos", ctx.form.after_photos || []);
  report.section("Checklist");
  report.table(["Task", "Result", "Comments"], checklistRows(ctx), { colWidths: [92, 28, 62] });
  report.section("Timeline");
  report.table(["Date", "User", "Action", "Description"], timelineRows(ctx), { colWidths: [38, 38, 34, 72] });
  report.section("Recommendations");
  report.paragraph(ctx.form.recommendation || "No recommendation recorded.");
  report.section("Approval Workflow");
  report.table(["Role", "Name", "Status"], approvalRows(ctx), { colWidths: [58, 82, 42] });
  report.qrCode("Scan to open Work Order");
  report.signatures();
  report.finalize(fileName(ctx, "detailed"));
}

function renderCompletionReport(ctx) {
  const report = createReport(ctx, "Completion Report", "Official maintenance completion certificate.");
  report.section("Completion Certificate");
  report.labelValueGrid([
    row("Work Order", ctx.woReference),
    row("Asset", assetName(ctx)),
    row("Completion Date", ctx.form.finished_date || ctx.savedOrder.completed_at || formatShortDate(ctx.generationDate)),
    row("Status", ctx.form.status || ctx.savedOrder.status),
    row("Actual Labor Hours", ctx.duration || "-"),
    row("Downtime", ctx.duration || "-")
  ]);
  report.section("Work Summary");
  report.paragraph(ctx.form.task_description || ctx.savedOrder.description || "-");
  report.section("Root Cause");
  report.paragraph(ctx.lifecycleDraft?.reason || ctx.form.failure_cause || "Not recorded.");
  report.section("Corrective Action");
  report.paragraph(ctx.lifecycleDraft?.completion_notes || ctx.form.recommendation || "Corrective action completed as per work order.");
  report.section("Spare Parts Consumption");
  report.table(["Part", "Quantity", "Cost"], partRows(ctx).map(item => [item.name, item.qty, item.total]), { colWidths: [105, 35, 42] });
  report.section("Technician / Supervisor Notes");
  report.paragraph([ctx.lifecycleDraft?.notes, ctx.lifecycleDraft?.supervisor_notes, ctx.form.recommendation].filter(Boolean).join("\n") || "No notes recorded.");
  report.section("Final Recommendations");
  report.paragraph(ctx.form.recommendation || "No final recommendation recorded.");
  report.section("Asset Health Change");
  report.table(["Before", "After", "Comment"], [["-", "-", "Asset health change is ready for future electronic measurement integration."]], { colWidths: [35, 35, 112] });
  report.qrCode("Scan to open Work Order");
  report.signatures();
  report.finalize(fileName(ctx, "completion"));
}

function renderPmInspectionReport(ctx) {
  const report = createReport(ctx, "PM Inspection Report", "Preventive maintenance inspection checklist and findings.");
  report.section("PM Identification");
  report.labelValueGrid([
    row("PM Number", `PM-${ctx.woNumber}`),
    row("Work Order", ctx.woReference),
    row("Asset", assetName(ctx)),
    row("PM Frequency", ctx.form.pm_frequency || ctx.form.frequency || "Runtime / Calendar"),
    row("Meter Reading", runtime(ctx)),
    row("Inspection Date", ctx.form.start_date || formatShortDate(ctx.generationDate))
  ]);
  report.section("Inspection Checklist");
  report.table(["Inspection Point", "Result", "Comments"], checklistRows(ctx), { colWidths: [92, 28, 62] });
  report.section("Meter Readings & Measurements");
  report.table(["Reading", "Value", "Unit", "Notes"], measurementRows(ctx), { colWidths: [45, 35, 25, 77] });
  report.section("Defects Found");
  report.paragraph(ctx.form.defects_found || ctx.lifecycleDraft?.reason || "No defects recorded.");
  report.section("Recommended Actions");
  report.paragraph(ctx.form.recommendation || "Continue preventive maintenance as planned.");
  report.qrCode("Scan to open PM Work Order");
  report.signatures(["Technician", "Supervisor"]);
  report.finalize(fileName(ctx, "pm"));
}

function renderBreakdownReport(ctx) {
  const report = createReport(ctx, "Breakdown Report", "Failure investigation, repair actions, production impact, and lessons learned.");
  report.section("Failure Identification");
  report.labelValueGrid([
    row("Breakdown Number", `BD-${ctx.woNumber}`),
    row("Work Order", ctx.woReference),
    row("Asset", assetName(ctx)),
    row("Failure Code", ctx.form.failure_code || "Unclassified"),
    row("Failure Category", ctx.form.failure_category || ctx.form.maintenance_type || "Breakdown"),
    row("Downtime", ctx.duration || "-")
  ]);
  report.section("Failure Description");
  report.paragraph(ctx.form.task_description || ctx.savedOrder.description || "-");
  report.section("Root Cause Analysis");
  report.paragraph(ctx.lifecycleDraft?.reason || ctx.form.root_cause || "Root cause not recorded.");
  report.section("Production Impact");
  report.paragraph(ctx.form.production_impact || "Production impact not recorded.");
  report.section("Repair Actions");
  report.paragraph(ctx.lifecycleDraft?.completion_notes || ctx.form.recommendation || "Repair actions completed as documented.");
  report.section("Replacement Parts");
  report.table(["Part", "Quantity", "Warehouse", "Cost"], detailedPartRows(ctx).map(row => [row[0], row[3], row[2], row[5]]), { colWidths: [88, 28, 36, 30] });
  report.section("Lessons Learned");
  report.paragraph(ctx.form.lessons_learned || "No lessons learned recorded.");
  report.section("Recommendations");
  report.paragraph(ctx.form.recommendation || "Review recurring failures and update preventive maintenance plan if required.");
  report.qrCode("Scan to open Breakdown Work Order");
  report.signatures();
  report.finalize(fileName(ctx, "breakdown"));
}

function createReport(ctx, title, subtitle) {
  return new PdfReport({
    title,
    subtitle,
    branding: ctx.branding,
    documentCode: ctx.documentCode,
    version: ctx.branding.documentVersion,
    workOrderUrl: ctx.workOrderUrl
  });
}

function generalRows(ctx) {
  return [
    row("Work Order Number", ctx.woReference),
    row("Document Code", ctx.documentCode),
    row("Issue No", ctx.issueNo),
    row("Issue Date", ctx.issueDate),
    row("Asset", assetName(ctx)),
    row("Location", locationName(ctx)),
    row("Priority", ctx.form.priority),
    row("Status", ctx.form.status || ctx.savedOrder.status),
    row("Maintenance Type", ctx.form.maintenance_type),
    row("Assigned Technician", assignedTechnician(ctx)),
    row("Shift Engineer", ctx.form.shift_engineer_name || ctx.engineer.name),
    row("Runtime", runtime(ctx))
  ];
}

function assetRows(ctx) {
  return [
    row("Asset Name", assetName(ctx)),
    row("Asset Code", ctx.equipment.asset_code || ctx.equipment.code || "-"),
    row("Serial Number", ctx.form.serial_number || ctx.equipment.serial_number),
    row("Manufacturer", ctx.equipment.manufacturer || "-"),
    row("Model", ctx.equipment.model || "-"),
    row("Criticality", ctx.equipment.criticality || "-"),
    row("Site", locationName(ctx)),
    row("Department", ctx.equipment.department || "-")
  ];
}

function partRows(ctx) {
  return (ctx.form.spare_parts_items || []).filter(item => item.name || item.part || item.qty).map(item => ({
    name: item.name || item.part || "-",
    code: item.code || item.part_code || "-",
    warehouse: item.warehouse || "Inventory",
    unit_cost: item.unit_cost || item.cost || "0",
    qty: item.qty || item.quantity || 0,
    notes: item.notes || item.warehouse || "",
    total: item.total || item.total_cost || item.cost || "0"
  }));
}

function detailedPartRows(ctx) {
  const rows = partRows(ctx);
  return rows.length ? rows.map(item => [item.name, item.code || "-", item.warehouse || "Inventory", item.qty, item.unit_cost || "0", item.total]) : [["-", "-", "-", "-", "-", "-"]];
}

function laborRows(ctx) {
  return [[
    assignedTechnician(ctx),
    `${ctx.form.start_date || "-"} ${ctx.form.start_time || ""}`.trim(),
    `${ctx.form.finished_date || "-"} ${ctx.form.finished_time || ""}`.trim(),
    ctx.duration || "-",
    runtime(ctx),
    ctx.lifecycleDraft?.completion_notes || ctx.lifecycleDraft?.notes || "-"
  ]];
}

function measurementRows(ctx) {
  const readings = ctx.form.measurements || ctx.form.measurement_items || [];
  if (Array.isArray(readings) && readings.length) {
    return readings.map(item => [item.name || item.measurement || "-", item.value || item.reading || "-", item.unit || "-", item.notes || ""]);
  }
  return [["Runtime Hours", runtime(ctx), "Hours", "Meter reading captured from the work order."]];
}

function checklistRows(ctx) {
  const tasks = [
    ctx.form.task_description || "Work description confirmed",
    ctx.form.requirements || "Necessary requirements checked",
    "Safety and QHSE requirements reviewed",
    "Photos and completion evidence prepared"
  ];
  return tasks.map(task => [task, ctx.checklistProgress === 100 ? "OK" : "Pending", ""]);
}

function timelineRows(ctx) {
  const timeline = ctx.savedOrder.timeline || [];
  if (timeline.length) {
    return timeline.map(event => [event.created_at || "-", event.actor_name || event.user_name || "-", event.event_type || "-", event.description || "-"]);
  }
  return [
    ["Created", ctx.savedOrder.created_at || ctx.form.start_date || "-", ctx.engineer.name || "-", "Work order created"],
    ["Scheduled", ctx.form.start_date || "-", ctx.engineer.name || "-", "Work order scheduled"],
    ["Due", ctx.form.finished_date || ctx.savedOrder.due_date || "-", ctx.engineer.name || "-", "Expected finish"]
  ];
}

function approvalRows(ctx) {
  return [
    ["Technician", ctx.form.executor_name || assignedTechnician(ctx), ctx.form.signature_executor ? "Signed" : "Pending"],
    ["Supervisor", ctx.form.shift_engineer_name || ctx.engineer.name || "-", ctx.form.signature_shift_engineer ? "Signed" : "Pending"],
    ["Maintenance Manager", ctx.form.manager_name || "-", ctx.form.signature_manager ? "Signed" : "Pending"],
    ["Operations Manager", "-", "Pending"]
  ];
}

function fileName(ctx, type) {
  const date = (ctx.form.start_date || new Date().toISOString().slice(0, 10)).replaceAll("-", "");
  const number = ctx.woNumber || "0000";
  const names = {
    standard: `WO-${number}-${date}.pdf`,
    detailed: `WO-${number}-Detailed.pdf`,
    completion: `WO-${number}-Completion.pdf`,
    pm: `PM-${number}.pdf`,
    breakdown: `BD-${number}.pdf`
  };
  return sanitizePdfFileName(names[type] || `WO-${number}.pdf`);
}

function row(label, value) {
  return { label, value: value || "-" };
}

function assetName(ctx) {
  return ctx.equipment.name || ctx.savedOrder.equipment_name || "Asset";
}

function locationName(ctx) {
  return ctx.customer.name || ctx.savedOrder.customer_name || ctx.form.location || ctx.equipment.location || "-";
}

function assignedTechnician(ctx) {
  return ctx.form.assigned_to || ctx.form.executor_name || ctx.engineer.name || ctx.savedOrder.engineer_name || "-";
}

function runtime(ctx) {
  return `${Number(ctx.form.service_hours || ctx.equipment.current_hours || ctx.savedOrder.service_hours || 0).toLocaleString()} h`;
}

function extractNumber(value) {
  return String(value || "").match(/-(\d{1,})\b/)?.[1] || "";
}
