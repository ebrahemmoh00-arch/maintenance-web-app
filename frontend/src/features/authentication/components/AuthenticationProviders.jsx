import { AUTH_PROVIDER_CONFIG } from "../utils/authProviders.js";

export function AuthenticationProviders({ t }) {
  const providers = AUTH_PROVIDER_CONFIG.filter(provider => provider.enabled && provider.key !== "password");
  if (!providers.length) return null;

  return (
    <div className="mt-5 space-y-3">
      {providers.map(({ key, label, labelKey, Icon }) => (
        <button
          key={key}
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {labelKey ? t(labelKey) : label}
        </button>
      ))}
    </div>
  );
}
