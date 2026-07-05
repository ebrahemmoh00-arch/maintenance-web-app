import { BarChart3, Boxes, ClipboardList, FileClock, Gauge, Package, ShieldCheck, Smartphone, UsersRound } from "lucide-react";

const content = {
  en: {
    eyebrow: "Enterprise CMMS Platform",
    title: "Enterprise Maintenance Management System",
    description: "Manage assets, preventive maintenance, work orders, inventory, inspections, and reliability from one integrated platform.",
    features: [
      ["Asset Management", Boxes],
      ["Work Orders", ClipboardList],
      ["Preventive Maintenance", FileClock],
      ["Inventory", Package],
      ["Reports & Analytics", BarChart3]
    ],
    badges: [
      ["Multi Site", Gauge],
      ["Role Based Access", UsersRound],
      ["Audit Logs", ShieldCheck],
      ["ISO 55001 Ready", FileClock],
      ["Mobile Friendly", Smartphone]
    ]
  },
  ar: {
    eyebrow: "منصة إدارة صيانة مؤسسية",
    title: "نظام إدارة الصيانة المؤسسي",
    description: "إدارة الأصول والصيانة الوقائية وأوامر الشغل والمخزون والفحوصات والاعتمادية من منصة واحدة متكاملة.",
    features: [
      ["إدارة الأصول", Boxes],
      ["أوامر الشغل", ClipboardList],
      ["الصيانة الوقائية", FileClock],
      ["المخزون", Package],
      ["التقارير والتحليلات", BarChart3]
    ],
    badges: [
      ["مواقع متعددة", Gauge],
      ["صلاحيات حسب الدور", UsersRound],
      ["سجل تدقيق", ShieldCheck],
      ["جاهز ISO 55001", FileClock],
      ["متوافق مع الجوال", Smartphone]
    ]
  }
};

export function LoginHeroSection({ language }) {
  const copy = content[language] || content.en;

  return (
    <section className="relative min-h-[360px] overflow-hidden bg-slate-950 text-white lg:min-h-screen">
      <img
        src="/login-background.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_34%),linear-gradient(90deg,rgba(2,6,23,0.88),rgba(15,23,42,0.54)_58%,rgba(15,23,42,0.36))]" />

      <div className="relative flex min-h-[360px] flex-col justify-between gap-10 p-6 sm:p-8 lg:min-h-screen lg:px-14 lg:py-12 xl:px-20">
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase text-blue-100 backdrop-blur">
          <ShieldCheck className="h-4 w-4" />
          {copy.eyebrow}
        </div>

        <div className="max-w-3xl">
          <h1 className="max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-200 sm:text-lg">
            {copy.description}
          </p>

          <div className="mt-9 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {copy.features.map(([label, Icon]) => (
              <div key={label} className="rounded-lg border border-white/12 bg-white/10 p-4 backdrop-blur">
                <div className="grid h-11 w-11 place-items-center rounded-lg border border-white/15 bg-white/12">
                  <Icon className="h-5 w-5 text-blue-100" />
                </div>
                <p className="mt-3 text-sm font-bold leading-5 text-white">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-200">
          {copy.badges.map(([label, Icon]) => (
            <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur">
              <Icon className="h-4 w-4 text-blue-100" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
