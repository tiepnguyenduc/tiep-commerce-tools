import type { B2BProduct } from "./types";

/**
 * Only product IDs are stored: names and contract prices always come from the
 * current assortment, so a store switch never shows another store's prices.
 */
export const B2B_RECENTLY_VIEWED_KEY = "b2b-recently-viewed";
export const B2B_RECENTLY_VIEWED_LIMIT = 8;

export function parseRecentlyViewed(value: string | null): string[] {
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
        ].slice(0, B2B_RECENTLY_VIEWED_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(ids: string[], id: string): string[] {
  return [id, ...ids.filter((value) => value !== id)].slice(
    0,
    B2B_RECENTLY_VIEWED_LIMIT,
  );
}

/** Recently viewed products still in the assortment, most recent first, minus `exclude`. */
export function resolveRecentlyViewed(
  ids: string[],
  products: B2BProduct[],
  exclude?: string,
) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.filter((id) => id !== exclude).flatMap((id) => byId.get(id) ?? []);
}

/** Products sharing a category with `product`, closest category first. */
export function relatedBusinessProducts(
  product: B2BProduct,
  products: B2BProduct[],
  limit = 4,
) {
  const categoryIds = new Set(product.categoryIds ?? []);
  const score = (candidate: B2BProduct) =>
    (candidate.category === product.category ? 2 : 0) +
    ((candidate.categoryIds ?? []).some((id) => categoryIds.has(id)) ? 1 : 0);
  return products
    .filter((candidate) => candidate.id !== product.id && score(candidate) > 0)
    .map((candidate, index) => ({ candidate, index, score: score(candidate) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
