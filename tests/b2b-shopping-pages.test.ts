import { describe, expect, it, vi } from "vitest";
import { parseSavedProducts, savedProductsKey } from "../lib/b2b/saved-products";
import { duplicateQuickOrderRows, resolveQuickOrderRow, runQuickOrderBatch } from "../lib/b2b/quick-order";
import type { B2BProduct, B2BState } from "../lib/b2b/types";
const products = [{ id: "p1", name: "Loader", variants: [{ id: 1, sku: "QL-100" }, { id: 2, sku: "QL-200" }] }] as B2BProduct[];

describe("saved business products", () => {
  it("stores only distinct valid IDs and handles malformed storage", () => {
    expect(parseSavedProducts('["p1","p1",{"price":123},"",null,"p2"]')).toEqual(["p1", "p2"]);
    expect(parseSavedProducts("bad JSON")).toEqual([]);
    expect(parseSavedProducts(null)).toEqual([]);
  });
  it("isolates customers, business units, stores and guests", () => {
    const state = { customer: { id: "c1" }, context: { businessUnitKey: "bu1", storeKey: "s1" } } as B2BState;
    const key = savedProductsKey(state);
    expect(savedProductsKey({ ...state, customer: null })).not.toBe(key);
    expect(savedProductsKey({ ...state, context: { ...state.context!, storeKey: "s2" } })).not.toBe(key);
    expect(savedProductsKey({ ...state, context: { ...state.context!, businessUnitKey: "bu2" } })).not.toBe(key);
    expect(key).not.toContain("b2b-compare");
  });
});
describe("quick order review", () => {
  it("resolves exact case-insensitive SKU with the selected variant", () => {
    const result = resolveQuickOrderRow({ id: "1", sku: " ql-200 ", quantity: "3" }, products);
    expect(result.error).toBeNull();
    if (result.error) throw new Error(result.error);
    expect(result.variant?.id).toBe(2);
    expect(result.quantity).toBe(3);
  });
  it("rejects blank, unknown, ambiguous SKUs and quantities outside API limits", () => {
    for (const quantity of ["0", "-1", "1.5", "1e2", "", "10001", "9007199254740992"]) expect(resolveQuickOrderRow({ id: "1", sku: "QL-100", quantity }, products).error).toBeTruthy();
    expect(resolveQuickOrderRow({ id: "1", sku: "", quantity: "1" }, products).error).toBeTruthy();
    expect(resolveQuickOrderRow({ id: "1", sku: "QL", quantity: "1" }, products).error).toContain("not found");
    expect(resolveQuickOrderRow({ id: "1", sku: "QL-100", quantity: "1" }, [...products, products[0]]).error).toContain("more than one");
    expect(resolveQuickOrderRow({ id: "1", sku: "QL-100", quantity: "10000" }, products).error).toBeNull();
  });
  it("detects duplicate SKU rows before submission", () => {
    expect([...duplicateQuickOrderRows([{ id: "1", sku: "QL-100", quantity: "1" }, { id: "2", sku: " ql-100 ", quantity: "3" }, { id: "3", sku: "QL-200", quantity: "1" }])]).toEqual(["1", "2"]);
  });
});
describe("safe sequential quick order", () => {
  it("stops on an uncertain result without retrying or adding remaining rows", async () => {
    const add = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const record = vi.fn();
    expect(await runQuickOrderBatch(["one", "two", "three"], () => true, add, record)).toEqual({ completed: 1, uncertain: true, stopped: true });
    expect(add.mock.calls.map(([id]) => id)).toEqual(["one", "two"]);
    expect(record.mock.calls).toEqual([["one", true], ["two", false]]);
  });
  it("aborts further rows when purchasing context changes while a request is running", async () => {
    let scope = "first";
    const add = vi.fn(async () => { scope = "second"; return true; });
    const record = vi.fn();
    const result = await runQuickOrderBatch(["one", "two"], () => scope === "first", add, record);
    expect(result.stopped).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    expect(record).not.toHaveBeenCalled();
  });
  it("treats thrown requests as uncertain and never retries", async () => {
    const add = vi.fn().mockRejectedValue(new Error("connection lost after mutation"));
    expect((await runQuickOrderBatch([1, 2], () => true, add, vi.fn())).uncertain).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
  });
});
