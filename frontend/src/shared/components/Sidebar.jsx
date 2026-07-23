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

import { tr } from "../config/appConfig.jsx";

const sidebarSections = [
  {
    key: "dashboard",
    standalone: true,
    items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }]
  },
  {
    key: "operations",
    label: "Operations",
    items: [
      { key: "equipment", label: "Assets", icon: Wrench },
      { key: "work-orders", label: "Work Orders", icon: ClipboardList },
      { key: "pm-plans", label: "PM Plans", icon: CalendarDays },
      { key: "schedule", label: "Schedule", icon: CalendarDays }
    ]
  },
  {
    key: "maintenance",
    label: "Maintenance",
    items: [
      { key: "failures", target: "reports", label: "Failures", icon: AlertTriangle },
      { key: "downtime", target: "reports", label: "Downtime", icon: TimerReset },
      { key: "inventory", label: "Inventory", icon: Boxes }
    ]
  },
  {
    key: "analytics",
    label: "Analytics",
    items: [
      { key: "reports", label: "Reports", icon: BarChart3 },
      { key: "kpis", label: "KPIs", icon: Gauge }
    ]
  },
  {
    key: "administration",
    label: "Administration",
    items: [
      { key: "engineers", label: "Resources", icon: HardHat },
      { key: "access-control", label: "Access Control", icon: ShieldCheck, adminOnly: true },
      { key: "settings", label: "Settings", icon: Settings2 }
    ]
  }
];

export default function Sidebar({ active, setActive, collapsed, setCollapsed, language = "en", isAdmin = false }) {
  const t = text => tr(language, text);
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

  if (collapsed) {
    return (
      <aside className="flex h-auto w-full shrink-0 items-center border-b border-slate-800 bg-slate-950 p-3 text-white transition-all duration-300 lg:h-screen lg:w-16 lg:flex-col lg:border-b-0 lg:border-r lg:border-slate-200">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={t("Show sidebar")}
          title={t("Show sidebar")}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <Menu className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  const nestedRailClass = language === "ar" ? "space-y-1 border-r border-white/10 pr-2" : "space-y-1 border-l border-white/10 pl-2";

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
              <p className="truncate text-xs text-slate-400">{t("Industrial Maintenance Suite")}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="ms-auto grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-300 hover:border-cyan-400/60 hover:text-white"
            title={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
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
            return <SidebarItem key={item.key} item={item} active={active} setActive={setActive} collapsed={collapsed} language={language} />;
          }
          return (
            <div key={section.key} className="space-y-1">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-start text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                >
                  <span>{t(section.label)}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                </button>
              ) : null}
              {collapsed || isOpen ? (
                <div className={collapsed ? "space-y-2" : nestedRailClass}>
                  {section.items.map(item => <SidebarItem key={item.key} item={item} active={active} setActive={setActive} collapsed={collapsed} language={language} />)}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 p-4 lg:block">
        <div className={`rounded-lg border border-white/10 bg-white/5 p-3 ${collapsed ? "text-center" : ""}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{collapsed ? "API" : t("System Status")}</p>
          {!collapsed ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-300">{t("FastAPI Online")}</span>
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

function SidebarItem({ item, active, setActive, collapsed, language }) {
  const Icon = item.icon;
  const target = item.target || item.key;
  const isActive = active === item.key;
  const label = tr(language, item.label);

  return (
    <button
      type="button"
      onClick={() => setActive(target)}
      title={collapsed ? label : undefined}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-start text-sm font-medium transition ${
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
