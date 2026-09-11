import { afterEach, expect, it, vi } from "vitest";
import { readCompareProducts, setCompareCustomer, writeCompareProducts } from "../lib/compare-storage";
import type { CompareProductData } from "../components/ProductCompareData";

afterEach(() => { vi.unstubAllGlobals(); });
it("restores each account selection and keeps guest selections separate", () => {
  const data = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) }, dispatchEvent: vi.fn() });
  const product = { id: "chair", slug: "chair", sku: "chair", name: "Chair", category: "Furniture", image: "/chair.png", price: { centAmount: 100, currencyCode: "EUR", formatted: "€1" } } as CompareProductData;
  setCompareCustomer(null);
  writeCompareProducts([product]);
  setCompareCustomer("a");
  expect(readCompareProducts()).toEqual([product]);
  setCompareCustomer(null);
  expect(readCompareProducts()).toEqual([]);
  setCompareCustomer("b");
  expect(readCompareProducts()).toEqual([]);
  setCompareCustomer("a");
  expect(readCompareProducts()).toEqual([product]);
});
