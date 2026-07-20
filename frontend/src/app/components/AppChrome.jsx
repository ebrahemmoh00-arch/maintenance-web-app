import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, ChevronDown, Globe2, LogOut, Moon, Plus, RefreshCw, ShieldCheck, Sun } from "lucide-react";

import { NotificationMenu } from "../../features/dashboard/components/AnalyticsAndNotifications.jsx";
import { QUICK_ACTIONS } from "../../features/dashboard/utils/quickActions.js";
import { FormModal } from "../../shared/components/FormModal.jsx";
import { Sidebar } from "../../shared/components/Sidebar.jsx";
import { localizedConfig, tr } from "../../shared/config/appConfig.jsx";
import { pageTitle } from "../utils/navigation.js";

export function AppChrome({ app, children }) {
  const {
    active,
    setActive,
    collapsed,
    setCollapsed,
    darkMode,
    setDarkMode,
    notificationsOpen,
    setNotificationsOpen,
    setDashboardAlertsOpen,
    language,
    setLanguage,
    alerts,
    loading,
    error,
    isAdmin,
    canAddWorkOrders,
    openCreate,
    loadAll,
    handleLogout,
    modal,
    formValue,
    updateModalForm,
    saveRecord,
    setModal,
    options,
    addJobTitle
  } = app;
  const t = (text) => tr(language, text);
  const notificationButtonRef = useRef(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  function runQuickAction(action) {
    setQuickActionsOpen(false);
    if (action.resourceKey) {
      openCreate?.(action.resourceKey);
      return;
    }
    if (action.route) setActive(action.route);
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className={`flex min-h-screen w-full flex-col overflow-x-hidden lg:flex-row ${darkMode ? "bg-slate-900" : "bg-slate-100"} text-slate-900`}>
      <Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} language={language} isAdmin={isAdmin} />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-4 backdrop-blur sm:px-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="break-words text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 sm:text-xs sm:tracking-[0.22em]">{t("Professional Industrial Maintenance Dashboard")}</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{pageTitle(active, language)}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                <Globe2 className="h-4 w-4 text-blue-700" />
                <span className="sr-only">{t("Language")}</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" title={t("Language")}>
                  <option value="en">{t("English")}</option>
                  <option value="ar">{t("Arabic")}</option>
                </select>
              </label>
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  type="button"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-expanded={notificationsOpen}
                  className={`relative grid h-10 w-10 place-items-center rounded-lg border bg-white text-slate-600 hover:text-slate-950 ${notificationsOpen ? "border-blue-300 shadow-sm ring-2 ring-blue-100" : "border-slate-200"}`}
                  title={t("Notifications")}
                >
                  <Bell className="h-4 w-4" />
                  {alerts.length ? <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">{alerts.length}</span> : null}
                </button>
                {notificationsOpen && typeof document !== "undefined" ? createPortal(
                  <>
                    <button type="button" aria-label="Close notifications" className="fixed inset-0 z-30 cursor-default bg-transparent" onClick={() => setNotificationsOpen(false)} />
                    <NotificationMenu
                      alerts={alerts}
                      language={language}
                      triggerRef={notificationButtonRef}
                      onViewAlerts={() => {
                        setActive("dashboard");
                        setDashboardAlertsOpen(true);
                        setNotificationsOpen(false);
                      }}
                    />
                  </>,
                  document.body
                ) : null}
              </div>
              <button type="button" onClick={() => setDarkMode(!darkMode)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-950" title="Toggle dark frame">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button onClick={loadAll} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {t("Refresh")}
              </button>
              {isAdmin ? (
                <button type="button" onClick={() => setActive("access-control")} className="grid h-10 w-10 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100" title={t("Access Control")}>
                  <ShieldCheck className="h-4 w-4" />
                </button>
              ) : null}
              {canAddWorkOrders ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setQuickActionsOpen(open => !open)}
                    aria-expanded={quickActionsOpen}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
                    title={t("Quick Actions")}
                  >
                    <Plus className="h-4 w-4" />
                    {t("Quick Actions")}
                    <ChevronDown className={`h-4 w-4 transition ${quickActionsOpen ? "rotate-180" : ""}`} />
                  </button>
                  {quickActionsOpen ? (
                    <>
                      <button type="button" aria-label={t("Close")} className="fixed inset-0 z-30 cursor-default bg-transparent" onClick={() => setQuickActionsOpen(false)} />
                      <div className="absolute end-0 top-12 z-40 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
                        <div className="border-b border-slate-100 px-3 py-2">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{t("Quick Actions")}</p>
                        </div>
                        <div className="py-2">
                          {QUICK_ACTIONS.map(action => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.key}
                                type="button"
                                onClick={() => runQuickAction(action)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                              >
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span>{t(action.label)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              {isAdmin ? <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{t("Full Admin Access")}</span> : null}
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-red-300 hover:text-red-700">
                <LogOut className="h-4 w-4" />
                {t("Logout")}
              </button>
            </div>
          </div>
        </header>

        {error ? <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
        <div className="min-w-0 space-y-6 p-3 sm:p-4 lg:p-6">
          {children}
        </div>
      </main>
      {modal ? (
        <FormModal
          title={`${modal.mode === "edit" ? t("EditMode") : t("CreateMode")} ${localizedConfig(modal.resourceKey, language).title}`}
          fields={localizedConfig(modal.resourceKey, language).fields}
          value={formValue}
          setValue={updateModalForm}
          onSubmit={saveRecord}
          onClose={() => setModal(null)}
          options={options}
          onAddOption={async (field, optionName) => {
            if (field.key === "job_title") return addJobTitle(optionName);
            return false;
          }}
          labels={{ record: t("Maintenance Record"), close: t("Close"), cancel: t("Cancel"), save: t("Save Changes"), select: t("Select") }}
        />
      ) : null}
    </div>
  );
}
