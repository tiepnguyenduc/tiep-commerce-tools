import { describe, expect, it } from "vitest";
import { businessPage, nextSuggestionIndex, canSortBusinessPrices, normalizeBusinessSort, sortBusinessProducts, updateBusinessQuery } from "../lib/b2b/catalog-browsing";
import { filterBusinessProducts } from "../lib/b2b/catalog-navigation";
import type { B2BProduct } from "../lib/b2b/types";
const product = (id: string, name: string, amount: number | null, currencyCode = "EUR") => ({ id, name, category: "Loaders", categoryIds: ["loaders"], variants: [{ sku: `SKU-${id}` }], price: amount === null ? null : { centAmount: amount, currencyCode, formatted: String(amount) } }) as B2BProduct;
const products = [product("one", "Zulu", 300), product("two", "Alpha", null), product("three", "Bravo", 100)];

describe("B2B catalog browsing", () => {
  it("starts ArrowUp at the last suggestion and wraps keyboard navigation", () => {
    expect(nextSuggestionIndex(-1, 5, "up")).toBe(4);
    expect(nextSuggestionIndex(-1, 5, "down")).toBe(0);
    expect(nextSuggestionIndex(0, 5, "up")).toBe(4);
    expect(nextSuggestionIndex(4, 5, "down")).toBe(0);
    expect(nextSuggestionIndex(0, 0, "down")).toBe(-1);
  });
  it("gates price sorting by purchasing context and a single known currency", () => {
    expect(canSortBusinessPrices(products, false)).toBe(false);
    expect(canSortBusinessPrices(products, true)).toBe(true);
    expect(canSortBusinessPrices([product("x", "X", null)], true)).toBe(false);
    expect(canSortBusinessPrices([...products, product("usd", "US", 200, "USD")], true)).toBe(false);
    expect(normalizeBusinessSort("price-desc", false)).toBe("recommended");
    expect(normalizeBusinessSort("invalid", true)).toBe("recommended");
  });
  it("sorts names and keeps unavailable prices last in both directions without mutating data", () => {
    expect(sortBusinessProducts(products, "name-asc").map((p) => p.id)).toEqual(["two", "three", "one"]);
    expect(sortBusinessProducts(products, "name-desc").map((p) => p.id)).toEqual(["one", "three", "two"]);
    expect(sortBusinessProducts(products, "price-asc").map((p) => p.id)).toEqual(["three", "one", "two"]);
    expect(sortBusinessProducts(products, "price-desc").map((p) => p.id)).toEqual(["one", "three", "two"]);
    expect(products.map((p) => p.id)).toEqual(["one", "two", "three"]);
  });
  it("clamps malformed/out-of-range pages and computes the last partial page", () => {
    expect(businessPage(29, "3")).toEqual({ page: 3, pageCount: 3, start: 24, end: 29 });
    expect(businessPage(29, "999").page).toBe(3);
    for (const raw of [null, "-2", "1.5", "oops", "Infinity", "9007199254740992"]) expect(businessPage(29, raw).page).toBe(1);
    expect(businessPage(0, "5")).toEqual({ page: 1, pageCount: 1, start: 0, end: 0 });
  });
  it("resets page on filtering or sorting while preserving independent query fields", () => {
    const current = "q=loader&categoryId=root&category=Loaders&page=5&sort=name-asc";
    const changedSort = updateBusinessQuery(current, { sort: "name-desc" });
    expect(changedSort.get("page")).toBeNull();
    expect(changedSort.get("categoryId")).toBe("root");
    expect(changedSort.get("q")).toBe("loader");
    expect(updateBusinessQuery(current, { category: "Parts" }).get("categoryId")).toBeNull();
    expect(updateBusinessQuery(current, { page: "2" }).get("sort")).toBe("name-asc");
    expect(updateBusinessQuery(current, { page: "1" }).get("page")).toBeNull();
  });
  it("matches partial SKU/name case-insensitively within the active category", () => {
    expect(filterBusinessProducts(products, "", "sku-THREE", "loaders").map((p) => p.id)).toEqual(["three"]);
    expect(filterBusinessProducts(products, "", "brav", "loaders")).toHaveLength(1);
    expect(filterBusinessProducts(products, "", "brav", "other")).toHaveLength(0);
  });
});
