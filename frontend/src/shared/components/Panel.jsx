import { uiText } from "../i18n/index.js";

export default function Panel({ title, subtitle, actions, children, className = "", language }) {
  const displayTitle = uiText(title, language);
  const displaySubtitle = subtitle ? uiText(subtitle, language) : "";

  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900">{displayTitle}</h2>
          {displaySubtitle ? <p className="mt-1 text-sm text-slate-500">{displaySubtitle}</p> : null}
        </div>
        {actions ? <div className="ml-auto shrink-0">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export { Panel };
