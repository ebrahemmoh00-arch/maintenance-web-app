import { BarChart3, Boxes, ClipboardList, FileClock } from "lucide-react";

const features = [
  { key: "auth.feature.assets", Icon: Boxes },
  { key: "auth.feature.pm", Icon: FileClock },
  { key: "auth.feature.workOrders", Icon: ClipboardList },
  { key: "auth.feature.reliability", Icon: BarChart3 }
];

export function EnterpriseHeroSection({ t }) {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:block">
      <img
        src="/login-background.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/72" />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(15,23,42,0.95),rgba(15,23,42,0.74)_48%,rgba(15,23,42,0.45))]" />

      <div className="relative flex min-h-screen flex-col justify-center px-12 py-14 xl:px-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-black leading-tight tracking-tight xl:text-6xl">
            {t("auth.hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-200">
            {t("auth.hero.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid max-w-3xl grid-cols-2 gap-4">
          {features.map(({ key, Icon }) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-sm backdrop-blur-sm">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/10 text-blue-100">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm font-black text-white">{t(key)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
