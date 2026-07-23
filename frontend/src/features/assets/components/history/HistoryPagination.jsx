import { ChevronLeft, ChevronRight } from "lucide-react";
import { tr } from "../../../../shared/config/appConfig.jsx";
import { formatNumber } from "../../../../shared/i18n/index.js";

export function HistoryPagination({ page = 1, pages = 0, total = 0, pageSize = 25, onPageChange, language }) {
  const canPrevious = page > 1;
  const canNext = pages > 0 && page < pages;
  const t = text => tr(language, text);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {formatNumber(total, language)} {t("events")} / {t("page")} {formatNumber(page, language)} {t("of")} {formatNumber(Math.max(pages, 1), language)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPrevious}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("Previous")}
        </button>
        <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">{formatNumber(pageSize, language)} {t("per page")}</span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("Next")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
