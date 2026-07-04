import { EMPLOYEE_ROLE_OPTIONS } from "../../../features/authentication/services/authSession.js";
import { StatusBadge } from "../../components/StatusBadges.jsx";

export const engineersResource = {
  title: "Employees Management",
  endpoint: "engineers",
  blank: {
    employee_code: "",
    name: "",
    job_title: "",
    specialty: "",
    department: "",
    role: "viewer",
    phone: "",
    email: "",
    work_location: "",
    supervisor: "",
    username: "",
    password: "",
    permissions: "",
    status: "active"
  },
  fields: [{
    key: "employee_code",
    label: "Employee ID"
  }, {
    key: "name",
    label: "Full Name"
  }, {
    key: "job_title",
    label: "Job Title",
    type: "select",
    options: "jobTitles",
    allowAddOption: true,
    addPlaceholder: "Add Job Title",
    addLabel: "Add"
  }, {
    key: "department",
    label: "Department"
  }, {
    key: "role",
    label: "Role",
    type: "select",
    options: EMPLOYEE_ROLE_OPTIONS
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "work_location",
    label: "Work Location",
    type: "select",
    options: "customerLocations"
  }, {
    key: "supervisor",
    label: "Supervisor"
  }, {
    key: "username",
    label: "Username"
  }, {
    key: "password",
    label: "Password"
  }, {
    key: "status",
    label: "Status",
    type: "select",
    options: ["active", "off_duty", "inactive"]
  }],
  columns: [{
    key: "employee_code",
    label: "Employee ID"
  }, {
    key: "name",
    label: "Full Name"
  }, {
    key: "job_title",
    label: "Job Title"
  }, {
    key: "department",
    label: "Department"
  }, {
    key: "role",
    label: "Role"
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "work_location",
    label: "Work Location"
  }, {
    key: "status",
    label: "Availability",
    render: row => <StatusBadge value={row.status} />
  }]
};
