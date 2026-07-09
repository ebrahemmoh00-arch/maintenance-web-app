import { EnterpriseLoginPage } from "./EnterpriseLoginPage.jsx";

export function LoginScreen({
  language,
  setLanguage,
  value,
  setValue,
  error,
  onSubmit
}) {
  return <EnterpriseLoginPage language={language} setLanguage={setLanguage} value={value} setValue={setValue} error={error} onSubmit={onSubmit} />;
}
