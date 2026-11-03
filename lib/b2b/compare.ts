import type { B2BProduct, B2BState } from "./types";
export const B2B_COMPARE_LIMIT = 4;
export function businessCompareKey(state: B2BState) {
  return `b2b-compare:${JSON.stringify([state.customer?.id || "guest", state.context?.businessUnitKey || "", state.context?.storeKey || ""])}`;
}
export function parseBusinessCompare(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? [
          ...new Set(
            parsed.filter(
              (id): id is string =>
                typeof id === "string" &&
                id.trim().length > 0 &&
                id.length <= 256,
            ),
          ),
        ].slice(0, B2B_COMPARE_LIMIT)
      : [];
  } catch {
    return [];
  }
}
export function toggleBusinessCompare(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((value) => value !== id);
  return ids.length < B2B_COMPARE_LIMIT ? [...ids, id] : ids;
}
export function resolveBusinessCompare(ids: string[], products: B2BProduct[]) {
  return ids.map((id) => ({
    id,
    product: products.find((product) => product.id === id),
  }));
}
