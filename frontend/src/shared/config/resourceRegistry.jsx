import { customersResource } from "./resources/customers.jsx";
import { engineersResource } from "./resources/engineers.jsx";
import { equipmentResource } from "./resources/equipment.jsx";
import { workOrdersResource } from "./resources/work-orders.jsx";
import { inventoryResource } from "./resources/inventory.jsx";
import { preventiveMaintenanceResource } from "./resources/preventive-maintenance.jsx";
import { pmPlansResource } from "./resources/pm-plans.jsx";

export const resources = {
  "customers": customersResource,
  "engineers": engineersResource,
  "equipment": equipmentResource,
  "work-orders": workOrdersResource,
  "inventory": inventoryResource,
  "preventive-maintenance": preventiveMaintenanceResource,
  "pm-plans": pmPlansResource
};
