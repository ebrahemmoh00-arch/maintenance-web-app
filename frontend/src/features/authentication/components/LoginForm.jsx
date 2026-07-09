import { AlertCircle, KeyRound, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { PasswordField } from "./PasswordField.jsx";

function normalizeServerError(error, t) {
  if (!error) return "";
  if (String(error).toLowerCase().includes("failed to fetch")) return t("auth.error.server");
  if (String(error).toLowerCase().includes("invalid") || String(error).toLowerCase().includes("access denied")) return t("auth.error.invalid");
  return error;
}

export function LoginForm({ value, setValue, error, onSubmit, t }) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState({});
  const serverError = useMemo(() => normalizeServerError(error, t), [error, t]);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextValidation = {};
    if (!String(value.username || "").trim()) nextValidation.username = t("auth.validation.username");
    if (!String(value.password || "").trim()) nextValidation.password = t("auth.validation.password");
    setValidation(nextValidation);
    if (Object.keys(nextValidation).length) return;

    setSubmitting(true);
    try {
      await onSubmit(event);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800">
        <span className="inline-flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {t("auth.method.password")}
        </span>
      </div>

      <div>
        <label htmlFor="auth-username" className="block text-sm font-black text-slate-800">
          {t("auth.username.label")}
        </label>
        <div className={`auth-field-shell mt-2 flex h-12 items-center gap-3 rounded-xl border bg-white px-3 transition ${validation.username ? "border-red-300" : "border-slate-200"}`}>
          <UserRound className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            id="auth-username"
            type="text"
            value={value.username}
            onChange={event => setValue({ ...value, username: event.target.value })}
            className="auth-field-input h-full w-full bg-white text-sm font-bold text-slate-950 placeholder:text-slate-400"
            placeholder={t("auth.username.placeholder")}
            autoComplete="username"
            aria-invalid={Boolean(validation.username)}
            aria-describedby={validation.username ? "auth-username-error" : undefined}
            disabled={submitting}
          />
        </div>
        {validation.username ? <p id="auth-username-error" className="mt-2 text-xs font-bold text-red-600">{validation.username}</p> : null}
      </div>

      <PasswordField
        id="auth-password"
        value={value.password}
        onChange={password => setValue({ ...value, password })}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        onCapsLockChange={setCapsLock}
        disabled={submitting}
        error={validation.password}
        t={t}
      />

      {capsLock ? (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {t("auth.capsLock")}
        </div>
      ) : null}

      {serverError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="inline-flex items-center gap-2 font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={event => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            disabled={submitting}
          />
          {t("auth.remember")}
        </label>
        <button type="button" disabled className="font-bold text-slate-400" title={t("auth.forgot.disabled")} aria-disabled="true">
          {t("auth.forgot")}
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {submitting ? t("auth.submit.loading") : t("auth.submit")}
      </button>
    </form>
  );
}
