import { Eye, EyeOff, Lock } from "lucide-react";

export function PasswordField({
  id,
  value,
  onChange,
  showPassword,
  setShowPassword,
  onCapsLockChange,
  disabled,
  error,
  t
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-black text-slate-800">
        {t("auth.password.label")}
      </label>
      <div className={`auth-field-shell mt-2 flex h-12 items-center gap-3 rounded-xl border bg-white px-3 transition ${error ? "border-red-300" : "border-slate-200"}`}>
        <Lock className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => onCapsLockChange(Boolean(event.getModifierState?.("CapsLock")))}
          onKeyUp={event => onCapsLockChange(Boolean(event.getModifierState?.("CapsLock")))}
          className="auth-field-input h-full w-full bg-white text-sm font-bold text-slate-950 placeholder:text-slate-400"
          placeholder={t("auth.password.placeholder")}
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShowPassword(current => !current)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          aria-label={showPassword ? t("auth.password.hide") : t("auth.password.show")}
          disabled={disabled}
        >
          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
