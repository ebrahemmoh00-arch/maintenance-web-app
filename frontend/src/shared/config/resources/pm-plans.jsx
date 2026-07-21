import { todayIso } from "../../../features/work-orders/utils/workOrderForms.js";
import { PriorityBadge, StatusBadge } from "../../components/StatusBadges.jsx";

export const pmPlansResource = {
  title: "PM Plans",
  endpoint: "pm-plans",
  blank: {
    equipment_id: "",
    name: "",
    description: "",
    priority: "medium",
    recurrence_type: "Runtime Hours",
    interval_value: 1000,
    start_date: todayIso(),
    next_due_date: "",
    next_due_runtime: 0,
    last_service_date: "",
    last_runtime: 0,
    estimated_duration_minutes: 60,
    required_skills: "",
    checklist_template: "",
    planned_spare_parts: "",
    status: "active"
  },
  fields: [{
    key: "equipment_id",
    label: "Asset",
    type: "select",
    options: "equipment",
    number: true
  }, {
    key: "name",
    label: "Plan Name"
  }, {
    key: "recurrence_type",
    label: "Interval Based On",
    type: "select",
    options: [{
      value: "Runtime Hours",
      label: "Operating Hours"
    }, {
      value: "Daily",
      label: "Calendar Days"
    }],
    hint: "Choose Operating Hours for runtime-based PM, or Calendar Days for date-based PM."
  }, {
    key: "interval_value",
    label: "Interval Value",
    type: "number",
    hint: "If the plan is based on Operating Hours, this value is hours. If it is based on Calendar Days, this value is days."
  }, {
    key: "start_date",
    label: "Start Date",
    type: "date"
  }, {
    key: "next_due_date",
    label: "Next Due Date",
    type: "date",
    visibleWhen: value => value.recurrence_type !== "Runtime Hours",
    readOnly: true,
    hint: "Calculated automatically from Start Date and Interval Value."
  }, {
    key: "next_due_runtime",
    label: "Next Due Runtime",
    type: "number",
    visibleWhen: value => value.recurrence_type === "Runtime Hours"
  }, {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["low", "medium", "high", "critical"]
  }, {
    key: "status",
    label: "Status",
    type: "select",
    options: ["active", "paused"]
  }, {
    key: "estimated_duration_minutes",
    label: "Estimated Duration (Minutes)",
    type: "number"
  }, {
    key: "required_skills",
    label: "Required Skills"
  }, {
    key: "description",
    label: "Description",
    type: "textarea"
  }, {
    key: "checklist_template",
    label: "Checklist Template",
    type: "textarea"
  }, {
    key: "planned_spare_parts",
    label: "Planned Spare Parts",
    type: "textarea"
  }],
  columns: [{
    key: "name",
    label: "PM Plan"
  }, {
    key: "equipment_name",
    label: "Asset"
  }, {
    key: "recurrence_type",
    label: "Interval Type",
    render: row => row.recurrence_type === "Runtime Hours" ? "Operating Hours" : row.recurrence_type === "Daily" ? "Calendar Days" : row.recurrence_type
  }, {
    key: "interval_value",
    label: "Interval",
    render: row => <span className="font-black text-slate-800">{row.interval_value} {row.recurrence_type === "Runtime Hours" ? "Hours" : row.recurrence_type === "Daily" ? "Days" : row.recurrence_type}</span>
  }, {
    key: "next_due_date",
    label: "Next Due Date"
  }, {
    key: "next_due_runtime",
    label: "Next Due Runtime"
  }, {
    key: "priority",
    label: "Priority",
    render: row => <PriorityBadge value={row.priority} />
  }, {
    key: "status",
    label: "Status",
    render: row => <StatusBadge value={row.status} />
  }]
};
