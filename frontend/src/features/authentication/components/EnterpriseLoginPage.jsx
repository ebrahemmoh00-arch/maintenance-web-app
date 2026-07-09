import { useMemo } from "react";

import { createTranslator, directionFor, normalizeLanguage } from "../../../shared/i18n/index.js";
import { AUTH_TRANSLATIONS } from "../utils/authTranslations.js";
import { EnterpriseHeroSection } from "./EnterpriseHeroSection.jsx";
import { EnterpriseLoginCard } from "./EnterpriseLoginCard.jsx";

export function EnterpriseLoginPage({
  language,
  setLanguage,
  value,
  setValue,
  error,
  onSubmit
}) {
  const normalizedLanguage = normalizeLanguage(language);
  const t = useMemo(() => createTranslator(normalizedLanguage, AUTH_TRANSLATIONS), [normalizedLanguage]);

  return (
    <main dir={directionFor(normalizedLanguage)} className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,3fr)_minmax(430px,2fr)]">
        <EnterpriseHeroSection t={t} />
        <EnterpriseLoginCard
          language={normalizedLanguage}
          setLanguage={setLanguage}
          value={value}
          setValue={setValue}
          error={error}
          onSubmit={onSubmit}
          t={t}
        />
      </div>
    </main>
  );
}
