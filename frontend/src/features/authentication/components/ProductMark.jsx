import { Hexagon, Wrench } from "lucide-react";

export function ProductMark({ title, subtitle, compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-10 w-10" : "h-12 w-12"} relative grid shrink-0 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700`}>
        <Hexagon className={`${compact ? "h-7 w-7" : "h-8 w-8"}`} />
        <Wrench className="absolute h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className={`${compact ? "text-base" : "text-lg"} font-black tracking-tight text-slate-950`}>{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}
