import { tr } from "../../shared/config/appConfig.jsx";

export function normalizePage(active) {
  return active;
}

export const pagePathMap = {
  dashboard: "/dashboard",
  customers: "/assets",
  equipment: "/assets",
  engineers: "/resources",
  "work-orders": "/work-orders",
  "pm-plans": "/pm-plans",
  schedule: "/schedule",
  inventory: "/inventory",
  reports: "/reports",
  kpis: "/kpis",
  "access-control": "/access-control",
  settings: "/settings"
};

export const pathPageMap = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/assets": "equipment",
  "/equipment": "equipment",
  "/resources": "engineers",
  "/technicians": "engineers",
  "/work-orders": "work-orders",
  "/pm-plans": "pm-plans",
  "/preventive-maintenance": "schedule",
  "/calendar": "schedule",
  "/schedule": "schedule",
  "/inventory": "inventory",
  "/reports": "reports",
  "/reports-analytics": "reports",
  "/kpis": "kpis",
  "/users": "access-control",
  "/access-control": "access-control",
  "/settings": "settings"
};

export function pageToPath(page) {
  return pagePathMap[normalizePage(page)] || "/dashboard";
}

export function pathToPage(pathname) {
  return pathPageMap[pathname] || "dashboard";
}

export function pageTitle(active, language = "en") {
  const titles = {
    dashboard: "Executive Dashboard",
    customers: "Customers / Sites",
    equipment: "Assets",
    engineers: "Resources",
    "work-orders": "Work Orders",
    "pm-plans": "PM Plans",
    schedule: "Maintenance Schedule",
    inventory: "Inventory",
    reports: "Reports & Analytics",
    kpis: "KPIs",
    "access-control": "Access Control",
    settings: "Settings"
  };
  return tr(language, titles[active] || active);
}
