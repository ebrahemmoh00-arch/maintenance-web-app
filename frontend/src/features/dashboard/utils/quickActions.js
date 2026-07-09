import { AlertTriangle, CalendarClock, FilePlus2, Gauge, PackageCheck, PlusCircle } from "lucide-react";

export const QUICK_ACTIONS = [
  {
    key: "add-asset",
    label: "Add Asset",
    icon: PlusCircle,
    resourceKey: "equipment"
  },
  {
    key: "create-work-order",
    label: "Create Work Order",
    icon: FilePlus2,
    route: "work-orders"
  },
  {
    key: "create-pm-plan",
    label: "Create PM Plan",
    icon: CalendarClock,
    resourceKey: "pm-plans"
  },
  {
    key: "report-failure",
    label: "Report Failure",
    icon: AlertTriangle,
    route: "work-orders"
  },
  {
    key: "issue-spare-part",
    label: "Issue Spare Part",
    icon: PackageCheck,
    resourceKey: "inventory"
  },
  {
    key: "add-meter-reading",
    label: "Add Meter Reading",
    icon: Gauge,
    route: "equipment"
  }
];
