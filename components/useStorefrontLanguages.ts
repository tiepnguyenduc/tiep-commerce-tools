"use client";

import { useEffect, useSyncExternalStore } from "react";
import useSWR from "swr";
import {
  isLocale,
  languagePreferenceKey,
  parseStorefrontLanguages,
  resolveStorefrontLanguage,
  type LanguageStorefront,
} from "@/lib/storefront-languages";

const values: Record<LanguageStorefront, string | null> = {
  b2c: null,
  b2b: null,
};
const loaded = new Set<LanguageStorefront>();
const listeners = new Set<() => void>();
function read(storefront: LanguageStorefront) {
  if (!loaded.has(storefront)) {
    try {
      const value = window.localStorage.getItem(
        languagePreferenceKey(storefront),
      );
      values[storefront] = isLocale(value) ? value : null;
    } catch {
      /* In-memory preferences continue working when storage is unavailable. */
    }
    loaded.add(storefront);
  }
  return values[storefront];
}
function write(storefront: LanguageStorefront, locale: string) {
  values[storefront] = locale;
  loaded.add(storefront);
  try {
    window.localStorage.setItem(languagePreferenceKey(storefront), locale);
  } catch {
    /* Persist for this session only. */
  }
  listeners.forEach((notify) => notify());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    for (const storefront of ["b2c", "b2b"] as const) {
      if (
        event.key === languagePreferenceKey(storefront) ||
        event.key === null
      ) {
        values[storefront] = isLocale(event.newValue) ? event.newValue : null;
        loaded.add(storefront);
      }
    }
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
export async function loadStorefrontLanguages(url: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok)
    throw new Error("We couldn’t load the available languages.");
  return parseStorefrontLanguages(await response.json());
}
export function useStorefrontLanguages(storefront: LanguageStorefront) {
  const saved = useSyncExternalStore(
    subscribe,
    () => read(storefront),
    () => null,
  );
  const { data, error, isLoading, mutate } = useSWR<string[]>(
    storefront === "b2b" ? "/api/b2b/languages" : "/api/languages",
    loadStorefrontLanguages,
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  const languages = data ?? [];
  const locale = resolveStorefrontLanguage(languages, saved);
  useEffect(() => {
    if (locale && locale !== saved) write(storefront, locale);
  }, [locale, saved, storefront]);
  return {
    languages,
    locale,
    loading: isLoading,
    error: Boolean(error),
    retry: () => {
      void mutate();
    },
    select: (value: string) => {
      if (languages.includes(value)) write(storefront, value);
    },
  };
}
