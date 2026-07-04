import { StockBadge } from "../../components/StatusBadges.jsx";

export const inventoryResource = {
  title: "Inventory",
  endpoint: "inventory",
  blank: {
    part_number: "",
    name: "",
    category: "",
    stock_quantity: 0,
    minimum_quantity: 1,
    unit: "pcs",
    location: "",
    linked_work_order_id: null
  },
  fields: [{
    key: "part_number",
    label: "Part Number"
  }, {
    key: "name",
    label: "Part Name"
  }, {
    key: "category",
    label: "Category"
  }, {
    key: "stock_quantity",
    label: "Stock Quantity",
    type: "number"
  }, {
    key: "minimum_quantity",
    label: "Minimum Quantity",
    type: "number"
  }, {
    key: "unit",
    label: "Unit"
  }, {
    key: "location",
    label: "Store Location"
  }, {
    key: "linked_work_order_id",
    label: "Linked Work Order",
    type: "select",
    options: "work-orders",
    number: true
  }],
  columns: [{
    key: "part_number",
    label: "Part No."
  }, {
    key: "name",
    label: "Spare Part"
  }, {
    key: "stock_quantity",
    label: "Stock"
  }, {
    key: "minimum_quantity",
    label: "Min"
  }, {
    key: "unit",
    label: "Unit"
  }, {
    key: "stock_alert",
    label: "Alert",
    render: row => <StockBadge value={row.stock_alert} />
  }, {
    key: "linked_work_order_title",
    label: "Linked Work Order"
  }]
};
