import { AuthenticationProviders } from "./AuthenticationProviders.jsx";
import { AuthFooter } from "./AuthFooter.jsx";
import { ConnectionStatus } from "./ConnectionStatus.jsx";
import { LanguageSelector } from "./LanguageSelector.jsx";
import { LoginForm } from "./LoginForm.jsx";
import { ProductMark } from "./ProductMark.jsx";

export function EnterpriseLoginCard({
  language,
  setLanguage,
  value,
  setValue,
  error,
  onSubmit,
  t
}) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 sm:px-8 lg:bg-white">
      <div className="w-full max-w-[430px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.14)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <ProductMark title={t("auth.product.name")} subtitle={t("auth.product.tagline")} compact />
            <LanguageSelector language={language} setLanguage={setLanguage} t={t} />
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">{t("auth.card.title")}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">{t("auth.card.subtitle")}</p>
            </div>
            <ConnectionStatus t={t} />
          </div>

          <LoginForm value={value} setValue={setValue} error={error} onSubmit={onSubmit} t={t} />
          <AuthenticationProviders t={t} />
        </div>

        <AuthFooter t={t} />
      </div>
    </section>
  );
}
