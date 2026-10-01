import { describe, expect, it } from "vitest";
import { businessCompareKey, parseBusinessCompare, resolveBusinessCompare, toggleBusinessCompare } from "../lib/b2b/compare";
import type { B2BProduct, B2BState } from "../lib/b2b/types";
describe("business comparison", () => {
  it("rejects malformed storage and keeps only distinct bounded IDs", () => {
    expect(parseBusinessCompare("invalid")).toEqual([]);
    expect(parseBusinessCompare('{"id":"p"}')).toEqual([]);
    expect(parseBusinessCompare('["a","a",null,17,"","b","c","d","e"]')).toEqual(["a", "b", "c", "d"]);
    expect(parseBusinessCompare(JSON.stringify([{ id: "p", price: 900 }]))).toEqual([]);
  });
  it("enforces four choices while allowing removal at the limit", () => {
    expect(toggleBusinessCompare(["a", "b", "c", "d"], "e")).toEqual(["a", "b", "c", "d"]);
    expect(toggleBusinessCompare(["a", "b", "c", "d"], "b")).toEqual(["a", "c", "d"]);
    expect(toggleBusinessCompare(["a"], "b")).toEqual(["a", "b"]);
  });
  it("separates customers, business units and stores from guest and retail selections", () => {
    const state = { customer: null, context: null } as B2BState;
    const a = { ...state, customer: { id: "a", email: "a@example.com" } };
    expect(businessCompareKey(a)).not.toBe(businessCompareKey(state));
    const scoped = { ...a, context: { businessUnitKey: "unit", storeKey: "store" } } as B2BState;
    expect(businessCompareKey(scoped)).not.toBe(businessCompareKey(a));
    expect(businessCompareKey({ ...scoped, context: { ...scoped.context!, storeKey: "other" } })).not.toBe(businessCompareKey(scoped));
    expect(businessCompareKey({ ...scoped, context: { ...scoped.context!, businessUnitKey: "other" } })).not.toBe(businessCompareKey(scoped));
    expect(businessCompareKey(state)).toMatch(/^b2b-compare:/);
  });
  it("resolves live assortment values and never retains unavailable product data", () => {
    const p = { id: "a", name: "Loader", price: { formatted: "$20" } } as B2BProduct;
    const changed = { ...p, price: { ...p.price!, formatted: "$30" } };
    expect(resolveBusinessCompare(["a"], [p])[0].product?.price?.formatted).toBe("$20");
    expect(resolveBusinessCompare(["a"], [changed])[0].product?.price?.formatted).toBe("$30");
    expect(resolveBusinessCompare(["a"], [])).toEqual([{ id: "a", product: undefined }]);
    expect(resolveBusinessCompare(["a"], [{ ...p, price: null }])[0].product?.price).toBeNull();
  });
});
