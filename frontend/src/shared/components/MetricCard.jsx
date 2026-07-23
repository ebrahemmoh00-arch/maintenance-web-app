import { uiText } from "../i18n/index.js";

export default function MetricCard({ label, value, icon: Icon, tone = "blue", helper, language }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{uiText(label, language)}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {helper ? <p className="mt-4 text-sm text-slate-500">{uiText(helper, language)}</p> : null}
    </div>
  );
}

export { MetricCard };
