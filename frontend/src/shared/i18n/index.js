import { AR_EXTRA } from "./locales/ar.js";

export const SUPPORTED_LANGUAGES = ["en", "ar"];

export function normalizeLanguage(language) {
  return language === "ar" ? "ar" : "en";
}

export function localeFor(language) {
  return normalizeLanguage(language) === "ar" ? "ar-EG" : "en-US";
}

export function directionFor(language) {
  return normalizeLanguage(language) === "ar" ? "rtl" : "ltr";
}

export function translate(language, text, baseArabic = {}) {
  if (text === null || text === undefined) return "";
  const key = String(text);
  if (normalizeLanguage(language) !== "ar") return key;
  return AR_EXTRA[key] || baseArabic[key] || key;
}

export function createTranslator(language, dictionaries = {}) {
  const normalized = normalizeLanguage(language);
  const fallback = dictionaries.en || {};
  const selected = dictionaries[normalized] || fallback;
  return function t(key, values = {}) {
    const template = selected[key] ?? fallback[key] ?? translate(normalized, key);
    return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
  };
}

export function formatNumber(value, language = "en", options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value ?? "";
  return new Intl.NumberFormat(localeFor(language), options).format(number);
}

export function formatDate(value, language = "en", fallback = "-") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value, language = "en", fallback = "-") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatHours(value, language = "en") {
  return `${formatNumber(value, language)} ${translate(language, "h", { h: "س" })}`;
}
