import { Eye, EyeOff, Globe2, Lock, UserRound, Wifi } from "lucide-react";
import { useState } from "react";

const APP_VERSION = "1.0.0";

const content = {
  en: {
    welcome: "Welcome Back",
    subtitle: "Sign in to your account",
    username: "Username / Email",
    usernamePlaceholder: "Enter your username or email",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    remember: "Remember me",
    forgot: "Forgot password",
    signIn: "Sign In",
    connected: "Connected",
    powered: "Powered by MAINTOPS CMMS",
    rights: "All rights reserved.",
    english: "English",
    arabic: "العربية"
  },
  ar: {
    welcome: "مرحبًا بعودتك",
    subtitle: "سجّل الدخول إلى حسابك",
    username: "اسم المستخدم / البريد الإلكتروني",
    usernamePlaceholder: "أدخل اسم المستخدم أو البريد الإلكتروني",
    password: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    remember: "تذكرني",
    forgot: "نسيت كلمة المرور",
    signIn: "تسجيل الدخول",
    connected: "متصل",
    powered: "مدعوم بواسطة MAINTOPS CMMS",
    rights: "جميع الحقوق محفوظة.",
    english: "English",
    arabic: "العربية"
  }
};

export function LoginCard({
  language,
  setLanguage,
  value,
  setValue,
  error,
  onSubmit
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const copy = content[language] || content.en;

  return (
    <section className="flex min-h-full items-center justify-center bg-slate-100 px-5 py-8 text-slate-950 sm:px-8 lg:px-10">
      <div className="w-full max-w-[420px]">
        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-white bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-8"
          aria-label="Enterprise CMMS login form"
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                <Wifi className="h-3.5 w-3.5" />
                {copy.connected}
              </p>
              <h2 className="mt-5 text-3xl font-black text-slate-950">{copy.welcome}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">{copy.subtitle}</p>
            </div>

            <label className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
              <Globe2 className="h-4 w-4 text-blue-700" />
              <span className="sr-only">Language</span>
              <select
                value={language}
                onChange={event => setLanguage(event.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                aria-label="Select language"
              >
                <option value="en">{copy.english}</option>
                <option value="ar">{copy.arabic}</option>
              </select>
            </label>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-800">{copy.username}</span>
              <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                <UserRound className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={value.username}
                  onChange={event => setValue({ ...value, username: event.target.value })}
                  className="h-12 w-full bg-transparent text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                  placeholder={copy.usernamePlaceholder}
                  autoComplete="username"
                  aria-label={copy.username}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-800">{copy.password}</span>
              <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={value.password}
                  onChange={event => setValue({ ...value, password: event.target.value })}
                  className="h-12 w-full bg-transparent text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                  placeholder={copy.passwordPlaceholder}
                  autoComplete="current-password"
                  aria-label={copy.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 text-sm">
            <label className="inline-flex items-center gap-2 font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={event => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              {copy.remember}
            </label>
            <button
              type="button"
              disabled
              className="font-bold text-slate-400"
              aria-disabled="true"
              title="Password recovery is not enabled yet"
            >
              {copy.forgot}
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-7 h-12 w-full rounded-lg bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:bg-blue-900"
          >
            {copy.signIn}
          </button>
        </form>

        <footer className="mt-6 text-center text-xs font-semibold leading-6 text-slate-500">
          <p>Version {APP_VERSION}</p>
          <p>{copy.powered}</p>
          <p>© 2026 MAINTOPS CMMS. {copy.rights}</p>
        </footer>
      </div>
    </section>
  );
}
