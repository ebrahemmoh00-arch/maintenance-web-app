import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { StatusBadge } from "../../../shared/components/StatusBadges.jsx";
import { getDocumentBranding, saveDocumentBranding } from "../../work-orders/documents/documentBranding.js";
import { readFileAsDataUrl } from "../../work-orders/utils/workOrderForms.js";
import { PERMISSION_ACTIONS, PERMISSION_MODULES, parsePermissions, tr } from "../../../shared/config/appConfig.jsx";
import { Activity, Lock, ShieldCheck, UsersRound, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

export function AccessControlView({
  users,
  currentUser,
  onSaveUserPermissions,
  language
}) {
  const t = text => tr(language, text);
  const activeUsers = users.filter(user => user.username || user.email);
  return <div className="space-y-6">
      <Panel title={t("Access Control")} subtitle="Admin can assign precise permissions by user email. New users start with view-only permissions until the admin increases access.">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoTile icon={ShieldCheck} title="Admin Master Access" text="The master admin account always has full permissions." />
          <InfoTile icon={UsersRound} title="Users Synced Automatically" text={`${activeUsers.length} users from Resources are available here.`} />
          <InfoTile icon={Lock} title="Default Permission" text="New users receive least privilege: view only, no add/edit/delete." />
        </div>
      </Panel>

      <div className="space-y-4">
        {activeUsers.map(user => <AccessControlUserCard key={user.id} user={user} currentUser={currentUser} onSave={onSaveUserPermissions} />)}
        {!activeUsers.length ? <Panel title="No Users">
            <EmptyState title="No users found" message="Create users from Resources, then they will appear here automatically." />
          </Panel> : null}
      </div>
    </div>;
}

export function AccessControlUserCard({
  user,
  currentUser,
  onSave
}) {
  const [permissions, setPermissions] = useState(() => parsePermissions(user.permissions, user.role));
  useEffect(() => {
    setPermissions(parsePermissions(user.permissions, user.role));
  }, [user.permissions, user.role, user.id]);
  const togglePermission = (moduleKey, action) => {
    setPermissions(current => {
      const next = parsePermissions(current);
      const modulePermissions = {
        ...next[moduleKey]
      };
      modulePermissions[action] = !modulePermissions[action];
      if (action !== "view" && modulePermissions[action]) modulePermissions.view = true;
      if (action === "view" && !modulePermissions.view) {
        modulePermissions.add = false;
        modulePermissions.edit = false;
        modulePermissions.delete = false;
      }
      return {
        ...next,
        [moduleKey]: modulePermissions
      };
    });
  };
  const enabledCount = PERMISSION_MODULES.reduce((total, module) => total + PERMISSION_ACTIONS.filter(action => permissions[module.key]?.[action.key]).length, 0);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-base font-black text-slate-950">{user.name}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{user.email || "No email"} / Username: {user.username || "-"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">{enabledCount} permissions enabled</span>
          <StatusBadge value={user.status} />
          <button type="button" onClick={() => onSave(user, permissions)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
            Save Permissions
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead className="bg-white text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="border border-slate-200 px-4 py-3 text-left">Control Area</th>
              {PERMISSION_ACTIONS.map(action => <th key={action.key} className="border border-slate-200 px-4 py-3 text-center">{action.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map(module => <tr key={module.key} className="hover:bg-slate-50">
                <td className="border border-slate-200 px-4 py-3">
                  <p className="font-black text-slate-950">{module.label}</p>
                  <p className="text-xs font-semibold text-slate-500">{module.key}</p>
                </td>
                {PERMISSION_ACTIONS.map(action => {
              const checked = Boolean(permissions[module.key]?.[action.key]);
              return <td key={action.key} className="border border-slate-200 px-4 py-3 text-center">
                      <label className={`mx-auto inline-flex h-9 w-16 cursor-pointer items-center justify-center rounded-full border text-xs font-black transition ${checked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => togglePermission(module.key, action.key)} />
                        {checked ? "ON" : "OFF"}
                      </label>
                    </td>;
            })}
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>;
}

export function SettingsSummary({
  data,
  language,
  onAccessControl,
  isAdmin = false
}) {
  const t = text => tr(language, text);
  return <div className="space-y-6">
      <Panel title={t("Settings")} subtitle={t("Presentation-ready system overview. Operational settings can be extended without changing current API contracts.")}>
        <div className="grid gap-4 md:grid-cols-3">
          <InfoTile icon={ShieldCheck} title={t("Access Control")} text={`${t("Full Admin Access")} - ${t("View, add, edit, and delete all maintenance records.")}`} onClick={isAdmin ? onAccessControl : null} />
          <InfoTile icon={Activity} title={t("API Health")} text={t("Frontend is connected to the FastAPI maintenance service.")} />
          <InfoTile icon={Wrench} title={t("Configured Assets")} text={`${data.equipment.length} ${t("equipment records available for maintenance control.")}`} />
        </div>
      </Panel>
      <DocumentBrandingSettings />
    </div>;
}

export function InfoTile({
  icon: Icon,
  title,
  text,
  onClick
}) {
  const Component = onClick ? "button" : "div";
  return <Component type={onClick ? "button" : undefined} onClick={onClick} className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-200 hover:bg-blue-50">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-700 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-4 text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </Component>;
}

export function DocumentBrandingSettings() {
  const [branding, setBranding] = useState(getDocumentBranding);
  const [saved, setSaved] = useState(false);

  function update(key, value) {
    setSaved(false);
    setBranding(current => ({
      ...current,
      [key]: value
    }));
  }

  async function uploadLogo(files) {
    const file = files?.[0];
    if (!file) return;
    update("logo", await readFileAsDataUrl(file));
  }

  function save() {
    saveDocumentBranding(branding);
    setSaved(true);
  }

  return <Panel title="Document Branding" subtitle="Company information used by the enterprise PDF templates.">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid h-32 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
            {branding.logo ? <img src={branding.logo} alt="Company logo" className="max-h-28 max-w-full object-contain" /> : <span className="text-sm font-black text-slate-400">Company Logo</span>}
          </div>
          <label className="mt-3 block rounded-lg bg-blue-700 px-3 py-2 text-center text-xs font-black text-white hover:bg-blue-800">
            Upload Logo
            <input type="file" accept="image/*" className="hidden" onChange={event => uploadLogo(event.target.files)} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <BrandingField label="Company Name" value={branding.companyName} onChange={value => update("companyName", value)} />
          <BrandingField label="Document Version" value={branding.documentVersion} onChange={value => update("documentVersion", value)} />
          <BrandingField label="Phone" value={branding.phone} onChange={value => update("phone", value)} />
          <BrandingField label="Email" value={branding.email} onChange={value => update("email", value)} />
          <BrandingField label="Website" value={branding.website} onChange={value => update("website", value)} />
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Company Address</span>
            <textarea rows={3} value={branding.companyAddress} onChange={event => update("companyAddress", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Save Document Branding</button>
            {saved ? <span className="text-sm font-black text-emerald-700">Saved</span> : null}
          </div>
        </div>
      </div>
    </Panel>;
}

function BrandingField({
  label,
  value,
  onChange
}) {
  return <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input value={value || ""} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
    </label>;
}
