import "server-only";
import { getApiRoot, getB2BApiRoot } from "./client";

export class StorefrontCountriesUnavailable extends Error {}

/** Only expose the configured project countries, in project order. */
export function projectCountries(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string" && /^[a-z]{2}$/i.test(value)).map((value) => value.toUpperCase()))];
}
export async function loadStorefrontCountries(storefront: "b2c" | "b2b") {
  const api = storefront === "b2b" ? getB2BApiRoot() : getApiRoot();
  if (!api) throw new StorefrontCountriesUnavailable("Storefront countries are not configured.");
  const { body } = await api.get().execute();
  return projectCountries(body.countries);
}
