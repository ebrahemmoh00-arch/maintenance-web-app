import { Wifi } from "lucide-react";

export function ConnectionStatus({ t }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{t("auth.status.connected")}</span>
    </div>
  );
}
