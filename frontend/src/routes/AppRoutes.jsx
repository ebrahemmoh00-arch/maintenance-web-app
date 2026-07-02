import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const LegacyApp = lazy(() => import("../pages/LegacyApp/LegacyApp.jsx"));

const routePages = [
  { path: "/dashboard", initialPage: "dashboard" },
  { path: "/assets", initialPage: "equipment" },
  { path: "/equipment", initialPage: "equipment" },
  { path: "/work-orders", initialPage: "work-orders" },
  { path: "/pm-plans", initialPage: "pm-plans" },
  { path: "/preventive-maintenance", initialPage: "schedule" },
  { path: "/calendar", initialPage: "schedule" },
  { path: "/schedule", initialPage: "schedule" },
  { path: "/inventory", initialPage: "inventory" },
  { path: "/resources", initialPage: "engineers" },
  { path: "/technicians", initialPage: "engineers" },
  { path: "/reports", initialPage: "reports" },
  { path: "/reports-analytics", initialPage: "reports" },
  { path: "/users", initialPage: "access-control" },
  { path: "/access-control", initialPage: "access-control" },
  { path: "/settings", initialPage: "settings" }
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

function LegacyRoute({ initialPage = "" }) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <LegacyApp initialPage={initialPage} />
    </Suspense>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LegacyRoute />} />
        {routePages.map((route) => (
          <Route key={route.path} path={route.path} element={<LegacyRoute initialPage={route.initialPage} />} />
        ))}
        <Route path="*" element={<LegacyRoute initialPage="dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
