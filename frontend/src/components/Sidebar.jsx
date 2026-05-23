import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  Wrench
} from "lucide-react";

const items = [
  ["dashboard", "Dashboard", "لوحة التحكم", LayoutDashboard],
  ["equipment", "Assets", "الأصول والمعدات", Wrench],
  ["work-orders", "Work Orders", "أوامر الشغل", ClipboardList],
  ["schedule", "Schedule", "الجدول الزمني", CalendarDays],
  ["inventory", "Inventory", "المخزون", Boxes],
  ["engineers", "Resources", "الفريق", HardHat],
  ["reports", "Reports", "التقارير", BarChart3],
  ["access-control", "Access Control", "الصلاحيات", ShieldCheck],
  ["settings", "Settings", "الإعدادات", Settings2]
];

export default function Sidebar({ active, setActive, collapsed, setCollapsed, language = "en", isAdmin = false }) {
  const isArabic = language === "ar";
  const visibleItems = isAdmin ? items : items.filter(([key]) => key !== "access-control");
  return (
    <aside className={`flex h-screen shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-white transition-all duration-300 ${collapsed ? "w-20" : "w-72"}`}>
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan-400/70 bg-cyan-400/10">
            <Settings2 className="h-5 w-5 text-cyan-300" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <h1 className="text-sm font-black uppercase tracking-[0.22em] text-white">MaintOps</h1>
              <p className="truncate text-xs text-slate-400">{isArabic ? "منظومة الصيانة الصناعية" : "Industrial Maintenance Suite"}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-300 hover:border-cyan-400/60 hover:text-white"
            title={collapsed ? (isArabic ? "توسيع القائمة" : "Expand sidebar") : (isArabic ? "طي القائمة" : "Collapse sidebar")}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map(([key, label, arabicLabel, Icon]) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            title={collapsed ? (isArabic ? arabicLabel : label) : undefined}
            className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm font-medium transition ${
              active === key
                ? "border-cyan-400/70 bg-cyan-400/10 text-white shadow-[inset_3px_0_0_#22d3ee]"
                : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active === key ? "text-cyan-300" : "text-slate-500 group-hover:text-cyan-300"}`} />
            {!collapsed ? <span className="truncate">{isArabic ? arabicLabel : label}</span> : null}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className={`rounded-lg border border-white/10 bg-white/5 p-3 ${collapsed ? "text-center" : ""}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{collapsed ? "API" : (isArabic ? "حالة النظام" : "System Status")}</p>
          {!collapsed ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-300">{isArabic ? "FastAPI متصل" : "FastAPI Online"}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </div>
          ) : (
            <span className="mx-auto mt-2 block h-2 w-2 rounded-full bg-emerald-400" />
          )}
        </div>
      </div>
    </aside>
  );
}
