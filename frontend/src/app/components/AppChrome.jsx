import { Bell, Globe2, LogOut, Moon, Plus, RefreshCw, ShieldCheck, Sun } from "lucide-react";

import { NotificationMenu } from "../../features/dashboard/components/AnalyticsAndNotifications.jsx";
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
    notificationAnchor,
    setNotificationAnchor,
    setDashboardAlertsOpen,
    language,
    setLanguage,
    alerts,
    loading,
    error,
    isAdmin,
    canAddWorkOrders,
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
                  type="button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setNotificationAnchor({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left });
                    setNotificationsOpen((open) => !open);
                  }}
                  aria-expanded={notificationsOpen}
                  className={`relative grid h-10 w-10 place-items-center rounded-lg border bg-white text-slate-600 hover:text-slate-950 ${notificationsOpen ? "border-blue-300 shadow-sm ring-2 ring-blue-100" : "border-slate-200"}`}
                  title={t("Notifications")}
                >
                  <Bell className="h-4 w-4" />
                  {alerts.length ? <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">{alerts.length}</span> : null}
                </button>
                {notificationsOpen ? (
                  <>
                    <button type="button" aria-label="Close notifications" className="fixed inset-0 z-[80] cursor-default bg-transparent" onClick={() => setNotificationsOpen(false)} />
                    <NotificationMenu
                      alerts={alerts}
                      language={language}
                      anchor={notificationAnchor}
                      onViewAlerts={() => {
                        setActive("dashboard");
                        setDashboardAlertsOpen(true);
                        setNotificationsOpen(false);
                        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
                      }}
                    />
                  </>
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
                <button onClick={() => setActive("work-orders")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800">
                  <Plus className="h-4 w-4" />
                  {t("Add Work Order")}
                </button>
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
