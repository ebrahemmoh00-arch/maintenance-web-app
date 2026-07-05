import { LoginCard } from "./LoginCard.jsx";
import { LoginHeroSection } from "./LoginHeroSection.jsx";

export function LoginScreen({
  language,
  setLanguage,
  value,
  setValue,
  error,
  onSubmit
}) {
  const isArabic = language === "ar";
  return (
    <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,3fr)_minmax(420px,2fr)]">
        <LoginHeroSection language={language} />
        <LoginCard
          language={language}
          setLanguage={setLanguage}
          value={value}
          setValue={setValue}
          error={error}
          onSubmit={onSubmit}
        />
      </div>
    </main>
  );
}
