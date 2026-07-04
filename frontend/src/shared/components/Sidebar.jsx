import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Gauge,
  HardHat,
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  TimerReset,
  Wrench
} from "lucide-react";
import { useMemo, useState } from "react";

const sidebarSections = [
  {
    key: "dashboard",
    standalone: true,
    items: [{ key: "dashboard", label: "Dashboard", arabicLabel: "لوحة التحكم", icon: LayoutDashboard }]
  },
  {
    key: "operations",
    label: "Operations",
    arabicLabel: "التشغيل",
    items: [
      { key: "equipment", label: "Assets", arabicLabel: "الأصول", icon: Wrench },
      { key: "work-orders", label: "Work Orders", arabicLabel: "أوامر الشغل", icon: ClipboardList },
      { key: "pm-plans", label: "PM Plans", arabicLabel: "خطط الصيانة", icon: CalendarDays },
      { key: "schedule", label: "Schedule", arabicLabel: "الجدول الزمني", icon: CalendarDays }
    ]
  },
  {
    key: "maintenance",
    label: "Maintenance",
    arabicLabel: "الصيانة",
    items: [
      { key: "failures", target: "reports", label: "Failures", arabicLabel: "الأعطال", icon: AlertTriangle },
      { key: "downtime", target: "reports", label: "Downtime", arabicLabel: "التوقفات", icon: TimerReset },
      { key: "inventory", label: "Inventory", arabicLabel: "المخزون", icon: Boxes }
    ]
  },
  {
    key: "analytics",
    label: "Analytics",
    arabicLabel: "التحليلات",
    items: [
      { key: "reports", label: "Reports", arabicLabel: "التقارير", icon: BarChart3 },
      { key: "kpis", target: "reports", label: "KPIs", arabicLabel: "مؤشرات الأداء", icon: Gauge }
    ]
  },
  {
    key: "administration",
    label: "Administration",
    arabicLabel: "الإدارة",
    items: [
      { key: "engineers", label: "Resources", arabicLabel: "الموارد", icon: HardHat },
      { key: "access-control", label: "Access Control", arabicLabel: "الصلاحيات", icon: ShieldCheck, adminOnly: true },
      { key: "settings", label: "Settings", arabicLabel: "الإعدادات", icon: Settings2 }
    ]
  }
];

export default function Sidebar({ active, setActive, collapsed, setCollapsed, language = "en", isAdmin = false }) {
  const isArabic = language === "ar";
  const [openSections, setOpenSections] = useState(() => new Set(sidebarSections.map(section => section.key)));
  const visibleSections = useMemo(() => sidebarSections.map(section => ({
    ...section,
    items: section.items.filter(item => isAdmin || !item.adminOnly)
  })).filter(section => section.items.length), [isAdmin]);

  function toggleSection(sectionKey) {
    setOpenSections(current => {
      const next = new Set(current);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }

  return (
    <aside className={`flex h-auto w-full shrink-0 flex-col border-b border-slate-800 bg-slate-950 text-white transition-all duration-300 lg:h-screen lg:border-b-0 lg:border-r lg:border-slate-200 ${collapsed ? "lg:w-20" : "lg:w-72"}`}>
      <div className="border-b border-white/10 p-3 lg:p-4">
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

      <nav className="flex flex-col gap-2 overflow-y-auto px-3 py-3 lg:flex-1 lg:py-4">
        {visibleSections.map(section => {
          const isOpen = openSections.has(section.key);
          if (section.standalone) {
            const item = section.items[0];
            return <SidebarItem key={item.key} item={item} active={active} setActive={setActive} collapsed={collapsed} isArabic={isArabic} />;
          }
          return (
            <div key={section.key} className="space-y-1">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                >
                  <span>{isArabic ? section.arabicLabel : section.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                </button>
              ) : null}
              {collapsed || isOpen ? (
                <div className={`${collapsed ? "space-y-2" : "space-y-1 border-l border-white/10 pl-2"}`}>
                  {section.items.map(item => <SidebarItem key={item.key} item={item} active={active} setActive={setActive} collapsed={collapsed} isArabic={isArabic} />)}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 p-4 lg:block">
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

function SidebarItem({ item, active, setActive, collapsed, isArabic }) {
  const Icon = item.icon;
  const target = item.target || item.key;
  const isActive = active === item.key;
  const label = isArabic ? item.arabicLabel : item.label;

  return (
    <button
      type="button"
      onClick={() => setActive(target)}
      title={collapsed ? label : undefined}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm font-medium transition ${
        isActive
          ? "border-cyan-400/70 bg-cyan-400/10 text-white shadow-[inset_3px_0_0_#22d3ee]"
          : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-300" : "text-slate-500 group-hover:text-cyan-300"}`} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );
}

export { Sidebar };
