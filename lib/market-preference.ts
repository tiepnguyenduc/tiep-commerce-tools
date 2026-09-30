import { getLocalizationInfo } from "./launchpad/project.config";

export type MarketPreference = "en" | "de";
export const MARKET_PREFERENCE_KEY = "workshop-market-preference";
export const DEFAULT_MARKET: MarketPreference = "en";
export const MARKETS = (["en", "de"] as const).map((key) => ({
  key,
  ...getLocalizationInfo(key),
  flag: key === "en" ? "🇺🇸" : "🇩🇪",
}));

export function parseMarketPreference(value: string | null): MarketPreference {
  return value === "de" ? "de" : DEFAULT_MARKET;
}
