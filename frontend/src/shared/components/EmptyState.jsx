import { Inbox } from "lucide-react";

export default function EmptyState({ title = "No data available", message = "Records will appear here once they are created." }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export { EmptyState };
