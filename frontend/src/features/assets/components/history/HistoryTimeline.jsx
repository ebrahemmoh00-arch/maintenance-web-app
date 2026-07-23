import { EmptyState } from "../../../../shared/components/EmptyState.jsx";
import { tr } from "../../../../shared/config/appConfig.jsx";
import { HistoryDetailsDialog } from "./HistoryDetailsDialog.jsx";
import { HistoryEventCard } from "./HistoryEventCard.jsx";
import { HistoryFilters } from "./HistoryFilters.jsx";
import { HistoryPagination } from "./HistoryPagination.jsx";
import { HistorySearch } from "./HistorySearch.jsx";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

export function HistoryTimeline({
  history,
  filters,
  onFiltersChange,
  onPageChange,
  onRefresh,
  technicians = [],
  loading = false,
  language
}) {
  const t = text => tr(language, text);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const items = history?.items || [];

  function resetFilters() {
    onFiltersChange({
      page: 1,
      page_size: filters.page_size || 25,
      search: "",
      event_type: "",
      date_from: "",
      date_to: "",
      technician: "",
      status: "",
      work_order: "",
      pm_cm: "",
      failure: "",
      downtime: ""
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{t("Asset History")}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{t("Enterprise Timeline")}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{t("Unified lifecycle events from work orders, PM, failures, downtime, inventory, readings, documents, and photos.")}</p>
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
            <RotateCcw className="h-4 w-4" />
            {t("Refresh")}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <HistorySearch value={filters.search} onChange={value => onFiltersChange({ ...filters, search: value, page: 1 })} language={language} />
          <label className="w-32">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{t("Page Size")}</span>
            <select value={filters.page_size || 25} onChange={event => onFiltersChange({ ...filters, page_size: Number(event.target.value), page: 1 })} className="history-filter-input">
              {[10, 25, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={resetFilters} className="self-end rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 hover:bg-white">
            {t("Reset")}
          </button>
        </div>

        <div className="mt-4">
          <HistoryFilters filters={filters} onChange={onFiltersChange} technicians={technicians} language={language} />
        </div>
      </div>

      {loading ? <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">{t("Loading asset history...")}</div> : null}

      <div className="space-y-3">
        {items.map(event => <HistoryEventCard key={event.id} event={event} onOpen={setSelectedEvent} language={language} />)}
        {!items.length && !loading ? <EmptyState title="No history events" message="No matching asset history events were found for the selected filters." language={language} /> : null}
      </div>

      <HistoryPagination
        page={history?.page || filters.page || 1}
        pages={history?.pages || 0}
        total={history?.total || 0}
        pageSize={history?.page_size || filters.page_size || 25}
        onPageChange={onPageChange}
        language={language}
      />

      <HistoryDetailsDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} language={language} />
    </div>
  );
}
