export type LanguageStorefront = "b2c" | "b2b";
export function languagePreferenceKey(storefront: LanguageStorefront) {
  return `workshop-language-${storefront}`;
}
export function isLocale(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 64) return false;
  try { return Intl.getCanonicalLocales(value).length === 1; } catch { return false; }
}
export function parseStorefrontLanguages(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("languages" in value) || !Array.isArray(value.languages) || !value.languages.every(isLocale)) {
    throw new Error("We couldn’t load the available languages.");
  }
  return [...new Set(value.languages)];
}
export function resolveStorefrontLanguage(languages: string[], saved: string | null): string | null {
  if (saved && languages.includes(saved)) return saved;
  return languages[0] ?? null;
}
export function languageDisplayName(locale: string, displayLocale = "en") {
  try { return new Intl.DisplayNames([displayLocale], { type: "language", languageDisplay: "standard" }).of(locale) || locale; } catch { return locale; }
}

/** Compact labels retain regional suffixes so options remain distinguishable. */
export function languageShortCode(locale: string) {
  const [language, ...region] = locale.split("-");
  const codes: Record<string, string> = { en: "ENG", de: "GER", fr: "FRA", es: "ESP", it: "ITA", vi: "VIE", pt: "POR", nl: "NLD", ja: "JPN", zh: "ZHO" };
  return [codes[language.toLowerCase()] ?? language.toUpperCase(), ...region.map((part) => part.toUpperCase())].join("-");
}
