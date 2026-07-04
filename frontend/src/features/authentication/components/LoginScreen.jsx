import { tr } from "../../../shared/config/appConfig.jsx";
import { Eye, EyeOff, Globe2, Lock, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";

export function LoginScreen({
  language,
  setLanguage,
  value,
  setValue,
  error,
  onSubmit
}) {
  const [showPassword, setShowPassword] = useState(false);
  const t = text => tr(language, text);
  const isArabic = language === "ar";
  return <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 bg-cover bg-center text-white" style={{
    backgroundImage: "linear-gradient(90deg, rgba(2,6,23,0.74) 0%, rgba(2,6,23,0.50) 48%, rgba(248,250,252,0.88) 100%), url('/login-background.jpg')"
  }}>
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/60" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/30 bg-white/15 backdrop-blur">
                <ShieldCheck className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-white">MaintOps</p>
                <p className="text-xs text-slate-400">{t("Plant Maintenance Command")}</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">{t("Professional Industrial Maintenance Dashboard")}</p>
              <h1 className="mt-4 text-5xl font-black leading-tight text-white">{t("Maintenance Control Access")}</h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">{t("Secure sign-in for maintenance operations dashboard.")}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-slate-300">{t("Equipment Management")}</p>
                <p className="mt-2 text-2xl font-black text-white">24/7</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-slate-300">{t("Smart Maintenance Alerts")}</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">Live</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-slate-300">{t("API Health")}</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">OK</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white/72 p-6 text-slate-950 backdrop-blur-md">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/80 bg-white/95 p-6 shadow-2xl shadow-slate-950/20">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">MaintOps</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{t("Sign In")}</h2>
              </div>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                <Globe2 className="h-4 w-4 text-blue-700" />
                <select value={language} onChange={event => setLanguage(event.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none">
                  <option value="en">{t("English")}</option>
                  <option value="ar">{t("Arabic")}</option>
                </select>
              </label>
            </div>

            <div className="space-y-4">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t("Email / Username")}</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <UsersRound className="h-4 w-4 text-slate-400" />
                  <input type="text" value={value.username} onChange={event => setValue({
                  ...value,
                  username: event.target.value
                })} className="w-full bg-transparent text-sm font-semibold text-slate-950 placeholder:text-slate-400" placeholder="Enter username" autoComplete="username" />
                </div>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t("Password")}</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input type={showPassword ? "text" : "password"} value={value.password} onChange={event => setValue({
                  ...value,
                  password: event.target.value
                })} className="w-full bg-transparent text-sm font-semibold text-slate-950 placeholder:text-slate-400" placeholder="Enter password" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-700">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

            <button type="submit" className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800">
              {t("Sign In")}
            </button>
          </form>
        </section>
      </div>
    </div>;
}
