import { lazy, Suspense } from "react";

const AppRoutes = lazy(() => import("./routes/AppRoutes.jsx"));

function AppFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl shadow-slate-950/30">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">MaintOps</p>
        <p className="mt-2 text-base font-semibold text-slate-100">Loading maintenance console...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<AppFallback />}>
      <AppRoutes />
    </Suspense>
  );
}
