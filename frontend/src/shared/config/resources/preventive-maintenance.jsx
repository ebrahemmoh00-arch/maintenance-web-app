import { MaintenanceBadge, StatusBadge } from "../../components/StatusBadges.jsx";

export const preventiveMaintenanceResource = {
  title: "Preventive Maintenance",
  endpoint: "preventive-maintenance",
  blank: {
    equipment_id: "",
    task_name: "",
    interval_hours: 1000,
    interval_days: 42,
    last_service_hours: 0,
    last_service_date: "",
    next_due_date: "",
    status: "active"
  },
  fields: [{
    key: "equipment_id",
    label: "Asset",
    type: "select",
    options: "equipment",
    number: true
  }, {
    key: "task_name",
    label: "PM Task"
  }, {
    key: "interval_hours",
    label: "Interval Hours",
    type: "number"
  }, {
    key: "last_service_hours",
    label: "Last Service Hours",
    type: "number"
  }, {
    key: "last_service_date",
    label: "Maintenance Date",
    type: "date"
  }, {
    key: "status",
    label: "Status",
    type: "select",
    options: ["active", "paused", "completed"]
  }],
  columns: [{
    key: "task_name",
    label: "PM Task"
  }, {
    key: "equipment_name",
    label: "Asset"
  }, {
    key: "hours_until_due",
    label: "Hours Remaining"
  }, {
    key: "days_until_due",
    label: "Days Remaining"
  }, {
    key: "next_due_date",
    label: "Next Due"
  }, {
    key: "pm_alert",
    label: "Alert",
    render: row => <MaintenanceBadge value={row.pm_alert} />
  }, {
    key: "status",
    label: "Status",
    render: row => <StatusBadge value={row.status} />
  }]
};
