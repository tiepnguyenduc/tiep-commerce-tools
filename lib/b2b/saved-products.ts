import type { B2BState } from "./types";
export function savedProductsKey(state: B2BState) {
  return `b2b-saved:${JSON.stringify([state.customer?.id || "guest", state.context?.businessUnitKey || "", state.context?.storeKey || ""])}`;
}
export function parseSavedProducts(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0 && id.length <= 256))] : [];
  } catch { return []; }
}
