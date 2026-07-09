import { Building2, Cloud, KeyRound, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";

export const AUTH_PROVIDER_CONFIG = [
  {
    key: "password",
    labelKey: "auth.method.password",
    enabled: true,
    Icon: KeyRound
  },
  {
    key: "entra",
    label: "Microsoft Entra ID",
    enabled: false,
    Icon: ShieldCheck
  },
  {
    key: "google",
    label: "Google Workspace",
    enabled: false,
    Icon: Cloud
  },
  {
    key: "ldap",
    label: "LDAP / Active Directory",
    enabled: false,
    Icon: Building2
  },
  {
    key: "saml",
    label: "SAML 2.0 / OIDC",
    enabled: false,
    Icon: LockKeyhole
  },
  {
    key: "mfa",
    label: "MFA",
    enabled: false,
    Icon: Smartphone
  }
];

export const AUTH_FOOTER_LINKS = [
  { key: "privacy", labelKey: "auth.link.privacy", href: "#" },
  { key: "terms", labelKey: "auth.link.terms", href: "#" },
  { key: "support", labelKey: "auth.link.support", href: "#" },
  { key: "docs", labelKey: "auth.link.docs", href: "#" }
];
