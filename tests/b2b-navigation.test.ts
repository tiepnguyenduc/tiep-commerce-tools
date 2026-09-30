import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, ProductProjection } from "@commercetools/platform-sdk";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getB2BApiRoot: vi.fn(), getApiRoot: vi.fn() }));
vi.mock("../lib/ct/client", () => mocks);
import { buildB2BNavigation, loadB2BNavigation } from "../lib/ct/b2b-navigation";
import { mapB2BProduct } from "../lib/ct/b2b";
import { GET } from "../app/api/b2b/navigation/route";
const category = (id: string, parent?: string, hint = "0.5") => ({
  id, name: { en: id, de: `DE ${id}` }, slug: { en: id }, orderHint: hint,
  ancestors: [], ...(parent ? { parent: { id: parent } } : {}),
}) as unknown as Category;
beforeEach(() => vi.resetAllMocks());
describe("B2B taxonomy navigation", () => {
  it("builds localized ordered branches including categories without products", () => {
    const tree = buildB2BNavigation([category("late", undefined, "0.9"), category("child", "first"), category("first", undefined, "0.1")], "de-DE");
    expect(tree.map(c => c.id)).toEqual(["first", "late"]);
    expect(tree[0].children[0]).toEqual({ id: "child", name: "DE child", slug: "child", children: [] });
  });
  it("keeps orphaned and cyclic categories reachable", () => {
    const tree = buildB2BNavigation([category("orphan", "missing"), category("a", "b"), category("b", "a")], "en-US");
    expect(tree.map(c => c.id).sort()).toEqual(["a", "b", "orphan"]);
    expect(() => JSON.stringify(tree)).not.toThrow();
  });
  it("paginates the B2B categories endpoint without querying the B2C root or products", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ body: { results: Array.from({length: 500}, (_, i) => category(`id-${String(i).padStart(3, "0")}`)) } }).mockResolvedValueOnce({ body: { results: [category("last")] } });
    const get = vi.fn((_args: { queryArgs: Record<string, unknown> }) => ({ execute }));
    mocks.getB2BApiRoot.mockReturnValue({ categories: () => ({ get }) });
    const result = await loadB2BNavigation();
    expect(result).toHaveLength(501);
    expect(get.mock.calls[1][0].queryArgs).toMatchObject({ sort: "id asc", where: 'id > "id-499"', withTotal: false });
    expect(mocks.getApiRoot).not.toHaveBeenCalled();
  });
  it("serves localized public category data", async () => {
    mocks.getB2BApiRoot.mockReturnValue({ categories: () => ({ get: () => ({ execute: async () => ({ body: { results: [category("equipment")] } }) }) }) });
    const response = await GET(new Request("http://localhost/api/b2b/navigation?locale=de"));
    expect(response.status).toBe(200);
    expect((await response.json()).categories[0].name).toBe("DE equipment");
  });
  it("returns safe unavailable and upstream errors without credentials", async () => {
    mocks.getB2BApiRoot.mockReturnValue(null);
    expect((await GET(new Request("http://localhost/api/b2b/navigation"))).status).toBe(503);
    mocks.getB2BApiRoot.mockImplementation(() => { throw new Error("secret upstream details"); });
    const response = await GET(new Request("http://localhost/api/b2b/navigation"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret");
  });
  it("maps all direct and ancestor category IDs without changing guest pricing", () => {
    const product = { id: "p", name: { en: "Loader" }, slug: { en: "loader" }, categories: [{ id: "child", obj: { name: { en: "Loaders" }, ancestors: [{ id: "root" }] } }, { id: "root" }], masterVariant: { id: 1 }, variants: [] } as unknown as ProductProjection;
    expect(mapB2BProduct(product)).toMatchObject({ category: "Loaders", categoryIds: ["child", "root"], price: null });
  });
});
