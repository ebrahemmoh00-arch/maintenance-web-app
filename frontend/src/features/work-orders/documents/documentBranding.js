export const BRANDING_STORAGE_KEY = "cmms-system-branding";

export const defaultDocumentBranding = {
  companyName: "Maintenance Management System",
  companyAddress: "System settings / company address",
  phone: "",
  website: "",
  email: "",
  logo: "",
  documentVersion: "1.0"
};

export function getDocumentBranding() {
  if (typeof window === "undefined") return defaultDocumentBranding;
  try {
    const stored = JSON.parse(window.localStorage.getItem(BRANDING_STORAGE_KEY) || "{}");
    return {
      ...defaultDocumentBranding,
      ...stored
    };
  } catch {
    return defaultDocumentBranding;
  }
}

export function saveDocumentBranding(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify({
    ...defaultDocumentBranding,
    ...value
  }));
}
