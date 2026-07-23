import { ChevronDown, FileText, Printer } from "lucide-react";
import { useState } from "react";
import { tr } from "../../../shared/config/appConfig.jsx";
import { documentTemplates } from "./documentTemplates.js";

export function DocumentCenterMenu({
  onExport,
  onPrint,
  onOpen,
  label = "Export",
  compact = false,
  language
}) {
  const [open, setOpen] = useState(false);
  const t = text => tr(language, text);

  function choose(templateKey) {
    setOpen(false);
    onExport(templateKey);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(value => {
            const next = !value;
            if (next) onOpen?.();
            return next;
          });
        }}
        className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 ${compact ? "px-3 py-2 text-xs" : "h-11 px-4 text-sm"}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FileText className="h-4 w-4" />
        {t(label)}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {documentTemplates.map(template => (
            <button
              key={template.key}
              type="button"
              onClick={() => choose(template.key)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              role="menuitem"
            >
              <FileText className="h-4 w-4" />
              {t(template.label)}
            </button>
          ))}
          <div className="my-2 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPrint();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
            role="menuitem"
          >
            <Printer className="h-4 w-4" />
            {t("Print")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
