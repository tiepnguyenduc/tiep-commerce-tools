import "server-only";
import { getApiRoot, getB2BApiRoot } from "./client";

export class StorefrontLanguagesUnavailable extends Error {}

/** Keep complete locale tags: regional variants are separate project languages. */
export function canonicalStorefrontLocale(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 255)
    return undefined;
  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch {
    return undefined;
  }
}

export function projectLanguages(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map(canonicalStorefrontLocale)
        .filter((locale): locale is string => Boolean(locale)),
    ),
  ];
}

export async function loadStorefrontLanguages(storefront: "b2c" | "b2b") {
  const api = storefront === "b2b" ? getB2BApiRoot() : getApiRoot();
  if (!api)
    throw new StorefrontLanguagesUnavailable(
      "Storefront languages are not configured.",
    );
  const { body } = await api.get().execute();
  return projectLanguages(body.languages);
}
