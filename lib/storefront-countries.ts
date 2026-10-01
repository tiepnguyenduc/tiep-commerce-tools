export type CountryStorefront = "b2c" | "b2b";
export function countryPreferenceKey(storefront: CountryStorefront) {
  return `workshop-country-${storefront}`;
}
export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}
export function parseStorefrontCountries(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("countries" in value) || !Array.isArray(value.countries) || !value.countries.every(isCountryCode)) {
    throw new Error("We couldn’t load the available countries.");
  }
  return [...new Set(value.countries)];
}
export function resolveStorefrontCountry(countries: string[], saved: string | null): string | null {
  return saved && countries.includes(saved) ? saved : countries[0] ?? null;
}
export function countryDisplayName(country: string, displayLocale = "en") {
  try { return new Intl.DisplayNames([displayLocale], { type: "region" }).of(country) || country; } catch { return country; }
}
export function countryFlag(country: string) {
  return isCountryCode(country) ? String.fromCodePoint(...[...country].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)) : "";
}
