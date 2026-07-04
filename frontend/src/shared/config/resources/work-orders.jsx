import { PriorityBadge, WorkOrderStatus } from "../../components/StatusBadges.jsx";

export const workOrdersResource = {
  title: "Work Orders",
  endpoint: "work-orders",
  blank: {
    title: "",
    description: "",
    customer_id: "",
    equipment_id: "",
    engineer_id: "",
    scheduled_date: "",
    due_date: "",
    status: "pending",
    priority: "medium",
    service_hours: 0,
    notes: ""
  },
  fields: [{
    key: "title",
    label: "Title"
  }, {
    key: "customer_id",
    label: "Department",
    type: "select",
    options: "customers",
    number: true
  }, {
    key: "equipment_id",
    label: "Asset",
    type: "select",
    options: "equipment",
    number: true
  }, {
    key: "engineer_id",
    label: "Resource",
    type: "select",
    options: "engineers",
    number: true
  }, {
    key: "scheduled_date",
    label: "Scheduled Date",
    type: "date"
  }, {
    key: "due_date",
    label: "Due Date",
    type: "date"
  }, {
    key: "status",
    label: "Status",
    type: "select",
    options: ["draft", "new", "pending", "assigned", "accepted", "in_progress", "waiting_for_parts", "completed", "pending_supervisor_review", "approved", "closed", "rejected", "cancelled", "on_hold", "overdue"]
  }, {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["low", "medium", "high", "critical"]
  }, {
    key: "service_hours",
    label: "Service Hours",
    type: "number"
  }, {
    key: "description",
    label: "Description",
    type: "textarea"
  }, {
    key: "notes",
    label: "Notes",
    type: "textarea"
  }],
  columns: [{
    key: "title",
    label: "Work Order"
  }, {
    key: "customer_name",
    label: "Department"
  }, {
    key: "equipment_name",
    label: "Asset"
  }, {
    key: "engineer_name",
    label: "Resource"
  }, {
    key: "scheduled_date",
    label: "Schedule"
  }, {
    key: "status",
    label: "Status",
    render: row => <WorkOrderStatus value={row.status} priority={row.priority} />
  }, {
    key: "priority",
    label: "Priority",
    render: row => <PriorityBadge value={row.priority} />
  }]
};
