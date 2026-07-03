import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const AuthEntryPage = lazy(() => import("../features/authentication/pages/AuthEntryPage.jsx"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage.jsx"));
const AssetsPage = lazy(() => import("../features/assets/pages/AssetsPage.jsx"));
const WorkOrdersPage = lazy(() => import("../features/work-orders/pages/WorkOrdersPage.jsx"));
const PMPlansPage = lazy(() => import("../features/pm/pages/PMPlansPage.jsx"));
const SchedulePage = lazy(() => import("../features/schedule/pages/SchedulePage.jsx"));
const InventoryPage = lazy(() => import("../features/inventory/pages/InventoryPage.jsx"));
const ResourcesPage = lazy(() => import("../features/resources/pages/ResourcesPage.jsx"));
const ReportsPage = lazy(() => import("../features/reports/pages/ReportsPage.jsx"));
const SettingsPage = lazy(() => import("../features/settings/pages/SettingsPage.jsx"));
const AccessControlPage = lazy(() => import("../features/settings/pages/AccessControlPage.jsx"));

const routePages = [
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/assets", element: <AssetsPage /> },
  { path: "/equipment", element: <AssetsPage /> },
  { path: "/work-orders", element: <WorkOrdersPage /> },
  { path: "/pm-plans", element: <PMPlansPage /> },
  { path: "/preventive-maintenance", element: <SchedulePage /> },
  { path: "/calendar", element: <SchedulePage /> },
  { path: "/schedule", element: <SchedulePage /> },
  { path: "/inventory", element: <InventoryPage /> },
  { path: "/resources", element: <ResourcesPage /> },
  { path: "/technicians", element: <ResourcesPage /> },
  { path: "/reports", element: <ReportsPage /> },
  { path: "/reports-analytics", element: <ReportsPage /> },
  { path: "/users", element: <AccessControlPage /> },
  { path: "/access-control", element: <AccessControlPage /> },
  { path: "/settings", element: <SettingsPage /> }
];

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-900">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm font-bold text-slate-600">Loading page...</p>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<AuthEntryPage />} />
          {routePages.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
