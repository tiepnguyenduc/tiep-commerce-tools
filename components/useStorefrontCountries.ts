"use client";

import { useEffect, useSyncExternalStore } from "react";
import useSWR from "swr";
import { isCountryCode, countryPreferenceKey, parseStorefrontCountries, resolveStorefrontCountry, type CountryStorefront } from "@/lib/storefront-countries";

const values: Record<CountryStorefront, string | null> = { b2c: null, b2b: null };
const loaded = new Set<CountryStorefront>();
const listeners = new Set<() => void>();
function read(storefront: CountryStorefront) {
  if (!loaded.has(storefront)) {
    try {
      const value = window.localStorage.getItem(countryPreferenceKey(storefront));
      values[storefront] = isCountryCode(value) ? value : null;
    } catch { /* In-memory preferences continue working when storage is unavailable. */ }
    loaded.add(storefront);
  }
  return values[storefront];
}
function write(storefront: CountryStorefront, country: string) {
  values[storefront] = country;
  loaded.add(storefront);
  try { window.localStorage.setItem(countryPreferenceKey(storefront), country); } catch { /* Persist for this session only. */ }
  listeners.forEach((notify) => notify());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    for (const storefront of ["b2c", "b2b"] as const) {
      if (event.key === countryPreferenceKey(storefront) || event.key === null) {
        values[storefront] = isCountryCode(event.newValue) ? event.newValue : null;
        loaded.add(storefront);
      }
    }
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
export async function loadStorefrontCountries(url: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("We couldn’t load the available countries.");
  return parseStorefrontCountries(await response.json());
}
export function useStorefrontCountries(storefront: CountryStorefront) {
  const saved = useSyncExternalStore(subscribe, () => read(storefront), () => null);
  const { data, error, isLoading, mutate } = useSWR<string[]>(storefront === "b2b" ? "/api/b2b/countries" : "/api/countries", loadStorefrontCountries, { shouldRetryOnError: false, revalidateOnFocus: false });
  const countries = data ?? [];
  const country = resolveStorefrontCountry(countries, saved);
  useEffect(() => { if (country && country !== saved) write(storefront, country); }, [country, saved, storefront]);
  return { countries, country, loading: isLoading, error: Boolean(error), retry: () => { void mutate(); }, select: (value: string) => { if (countries.includes(value)) write(storefront, value); } };
}
