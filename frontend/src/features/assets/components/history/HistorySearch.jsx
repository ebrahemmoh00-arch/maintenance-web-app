import { Search } from "lucide-react";

export function HistorySearch({ value, onChange }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
        placeholder="Search asset history"
        value={value || ""}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}
