import type { B2BProduct } from "./types";

export type BusinessSort =
  "recommended" | "name-asc" | "name-desc" | "price-asc" | "price-desc";
export function canSortBusinessPrices(
  products: B2BProduct[],
  hasContext: boolean,
) {
  const prices = products
    .map((product) => product.price)
    .filter((price) => price && Number.isFinite(price.centAmount));
  return (
    hasContext &&
    prices.length > 0 &&
    new Set(prices.map((price) => price!.currencyCode)).size === 1
  );
}
export function normalizeBusinessSort(
  value: string | null,
  pricesAllowed: boolean,
): BusinessSort {
  if (value === "name-asc" || value === "name-desc") return value;
  if (pricesAllowed && (value === "price-asc" || value === "price-desc"))
    return value;
  return "recommended";
}
export function sortBusinessProducts(
  products: B2BProduct[],
  sort: BusinessSort,
) {
  if (sort === "recommended") return products;
  return [...products].sort((a, b) => {
    if (sort.startsWith("name"))
      return a.name.localeCompare(b.name) * (sort === "name-desc" ? -1 : 1);
    const left =
      a.price && Number.isFinite(a.price.centAmount)
        ? a.price.centAmount
        : null;
    const right =
      b.price && Number.isFinite(b.price.centAmount)
        ? b.price.centAmount
        : null;
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (left - right) * (sort === "price-desc" ? -1 : 1);
  });
}
export function businessPage(total: number, rawPage: string | null, size = 12) {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const number = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Math.min(
    pageCount,
    Math.max(1, Number.isSafeInteger(number) ? number : 1),
  );
  return {
    page,
    pageCount,
    start: (page - 1) * size,
    end: Math.min(page * size, total),
  };
}
export function updateBusinessQuery(
  current: string,
  changes: Record<string, string>,
) {
  const next = new URLSearchParams(current);
  if (Object.keys(changes).some((key) => key !== "page")) next.delete("page");
  if ("category" in changes && !("categoryId" in changes))
    next.delete("categoryId");
  for (const [key, value] of Object.entries(changes)) {
    if (
      !value ||
      (key === "page" && value === "1") ||
      (key === "sort" && value === "recommended")
    )
      next.delete(key);
    else next.set(key, value);
  }
  return next;
}

export function nextSuggestionIndex(
  current: number,
  count: number,
  direction: "up" | "down",
) {
  if (!count) return -1;
  if (current < 0 || current >= count)
    return direction === "down" ? 0 : count - 1;
  return (current + (direction === "down" ? 1 : -1) + count) % count;
}
