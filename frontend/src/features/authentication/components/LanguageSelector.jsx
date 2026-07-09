import { ChevronDown, Globe2 } from "lucide-react";

export function LanguageSelector({ language, setLanguage, t }) {
  return (
    <label className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
      <Globe2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
      <span className="sr-only">{t("auth.language.label")}</span>
      <select
        value={language}
        onChange={event => setLanguage(event.target.value)}
        className="appearance-none bg-transparent pe-6 text-sm font-bold text-slate-700 outline-none"
        aria-label={t("auth.language.label")}
      >
        <option value="en">{t("auth.language.english")}</option>
        <option value="ar">{t("auth.language.arabic")}</option>
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
    </label>
  );
}
