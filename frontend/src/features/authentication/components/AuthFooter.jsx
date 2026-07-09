import { AUTH_FOOTER_LINKS } from "../utils/authProviders.js";

const APP_VERSION = "1.0.0";

function environmentLabel(t) {
  const mode = import.meta.env.MODE || "production";
  return t(`auth.environment.${mode}`) === `auth.environment.${mode}` ? mode : t(`auth.environment.${mode}`);
}

export function AuthFooter({ t }) {
  return (
    <footer className="mt-7 space-y-4 text-center text-xs font-semibold text-slate-500">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {AUTH_FOOTER_LINKS.map(link => (
          <a key={link.key} href={link.href} className="transition hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            {t(link.labelKey)}
          </a>
        ))}
      </div>
      <div className="space-y-1">
        <p>{t("auth.footer.version", { version: APP_VERSION })}</p>
        <p>{t("auth.footer.environment", { environment: environmentLabel(t) })}</p>
        <p>{t("auth.footer.copyright")}</p>
      </div>
    </footer>
  );
}
