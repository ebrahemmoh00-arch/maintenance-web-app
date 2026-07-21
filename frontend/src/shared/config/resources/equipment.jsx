import { MaintenanceBadge, StatusBadge } from "../../components/StatusBadges.jsx";

export const DEFAULT_ASSET_TYPES = ["Engine", "Generator", "Compressor", "Pump", "Chiller", "Boiler"];

export const equipmentResource = {
  title: "Assets",
  endpoint: "equipment",
  blank: {
    customer_id: "",
    name: "",
    serial_number: "",
    model: "",
    description: "",
    category: "",
    manufacturer: "",
    location: "",
    parent_id: null,
    asset_type: "",
    asset_level: "Equipment",
    asset_code: "",
    qr_code: "",
    barcode: "",
    criticality: "Medium",
    site: "",
    department: "",
    commission_date: "",
    installation_date: "",
    warranty_start: "",
    warranty_end: "",
    expected_life_years: 0,
    replacement_cost: 0,
    current_condition: "",
    maintenance_interval_hours: 1000,
    maintenance_interval_days: 90,
    current_hours: 0,
    last_reading: 0,
    current_reading: 0,
    last_pm_date: "",
    next_pm_date: "",
    last_breakdown_date: "",
    last_repair_date: "",
    purchase_cost: 0,
    total_maintenance_cost: 0,
    spare_parts_cost: 0,
    labor_cost: 0,
    contractor_cost: 0,
    last_maintenance_date: "",
    status: "Active"
  },
  fields: [{
    key: "customer_id",
    label: "Customer / Location",
    type: "select",
    options: "customers",
    number: true
  }, {
    key: "parent_id",
    label: "Parent Asset",
    type: "select",
    options: "assetParents",
    number: true
  }, {
    key: "name",
    label: "Asset Name"
  }, {
    key: "asset_type",
    label: "Asset Type",
    type: "select",
    options: "assetTypes",
    allowAddOption: true,
    addPlaceholder: "Add Asset Type",
    addLabel: "Add"
  }, {
    key: "asset_level",
    label: "Hierarchy Level",
    type: "select",
    options: ["Site", "Area / Department", "System", "Equipment", "Component"]
  }, {
    key: "asset_code",
    label: "Asset Code"
  }, {
    key: "serial_number",
    label: "Serial Number"
  }, {
    key: "model",
    label: "Model"
  }, {
    key: "manufacturer",
    label: "Manufacturer"
  }, {
    key: "category",
    label: "Category"
  }, {
    key: "description",
    label: "Description"
  }, {
    key: "location",
    label: "Asset Location"
  }, {
    key: "site",
    label: "Site"
  }, {
    key: "department",
    label: "Department"
  }, {
    key: "qr_code",
    label: "QR Code"
  }, {
    key: "barcode",
    label: "Barcode"
  }, {
    key: "current_hours",
    label: "Current Hours / Running Hours",
    type: "number"
  }, {
    key: "current_reading",
    label: "Current Reading",
    type: "number"
  }, {
    key: "last_reading",
    label: "Last Reading",
    type: "number"
  }, {
    key: "criticality",
    label: "Criticality",
    type: "select",
    options: ["Low", "Medium", "High", "Critical"]
  }, {
    key: "current_condition",
    label: "Current Condition",
    type: "select",
    options: ["Excellent", "Good", "Warning", "Critical", "Needs Inspection"]
  }, {
    key: "commission_date",
    label: "Commission Date",
    type: "date"
  }, {
    key: "installation_date",
    label: "Installation Date",
    type: "date"
  }, {
    key: "warranty_start",
    label: "Warranty Start",
    type: "date"
  }, {
    key: "warranty_end",
    label: "Warranty End",
    type: "date"
  }, {
    key: "expected_life_years",
    label: "Expected Life (Years)",
    type: "number"
  }, {
    key: "purchase_cost",
    label: "Purchase Cost",
    type: "number"
  }, {
    key: "replacement_cost",
    label: "Replacement Cost",
    type: "number"
  }, {
    key: "total_maintenance_cost",
    label: "Total Maintenance Cost",
    type: "number"
  }, {
    key: "spare_parts_cost",
    label: "Spare Parts Cost",
    type: "number"
  }, {
    key: "labor_cost",
    label: "Labor Cost",
    type: "number"
  }, {
    key: "contractor_cost",
    label: "Contractor Cost",
    type: "number"
  }, {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Active", "Down", "Maintenance", "operational", "warning", "down"]
  }],
  columns: [{
    key: "asset_code",
    label: "Asset Code"
  }, {
    key: "name",
    label: "Asset"
  }, {
    key: "asset_level",
    label: "Level"
  }, {
    key: "asset_type",
    label: "Type"
  }, {
    key: "serial_number",
    label: "Serial"
  }, {
    key: "location",
    label: "Location"
  }, {
    key: "criticality",
    label: "Criticality"
  }, {
    key: "current_hours",
    label: "Run Hours"
  }, {
    key: "next_maintenance_date",
    label: "Next Maintenance"
  }, {
    key: "maintenance_alert",
    label: "Alert",
    render: row => <MaintenanceBadge value={row.maintenance_alert} />
  }, {
    key: "status",
    label: "Status",
    render: row => <StatusBadge value={row.status} />
  }]
};
