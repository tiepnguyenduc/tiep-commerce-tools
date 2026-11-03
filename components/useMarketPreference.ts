"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_MARKET,
  MARKET_PREFERENCE_KEY,
  parseMarketPreference,
  type MarketPreference,
} from "@/lib/market-preference";

const listeners = new Set<() => void>();
let current: MarketPreference = DEFAULT_MARKET;
let loaded = false;

function readPreference() {
  if (!loaded) {
    try {
      current = parseMarketPreference(
        window.localStorage.getItem(MARKET_PREFERENCE_KEY),
      );
    } catch {
      /* Keep the in-memory preference when storage is unavailable. */
    }
    loaded = true;
  }
  return current;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key === MARKET_PREFERENCE_KEY || event.key === null) {
      current = parseMarketPreference(event.newValue);
      loaded = true;
      listeners.forEach((notify) => notify());
    }
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
function updatePreference(next: MarketPreference) {
  current = next;
  loaded = true;
  try {
    window.localStorage.setItem(MARKET_PREFERENCE_KEY, next);
  } catch {
    /* Still usable for this session. */
  }
  listeners.forEach((notify) => notify());
}
export function useMarketPreference() {
  const preference = useSyncExternalStore(
    subscribe,
    readPreference,
    () => DEFAULT_MARKET,
  );
  return [preference, updatePreference] as const;
}
