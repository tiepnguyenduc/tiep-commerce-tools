import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductProjection } from "@commercetools/platform-sdk";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getApiRoot: vi.fn(),
  getB2BApiRoot: vi.fn(),
  readB2BSession: vi.fn(),
}));
vi.mock("../lib/ct/client", () => ({ getApiRoot: mocks.getApiRoot, getB2BApiRoot: mocks.getB2BApiRoot }));
vi.mock("../lib/b2b/session", () => ({ readB2BSession: mocks.readB2BSession }));

import { mapB2BProduct } from "../lib/ct/b2b";
import { readProductReviews } from "../lib/ct/reviews";
import {
  parseRecentlyViewed,
  pushRecentlyViewed,
  relatedBusinessProducts,
  resolveRecentlyViewed,
  B2B_RECENTLY_VIEWED_LIMIT,
} from "../lib/b2b/recently-viewed";
import { optionGroupsFor, variantForOption } from "../lib/variant-options";
import { GET, POST } from "../app/api/b2b/products/[productId]/reviews/route";
import type { B2BProduct } from "../lib/b2b/types";

const context = {
  businessUnitKey: "acme",
  storeKey: "acme-store",
  currency: "USD",
  country: "US",
  distributionChannelId: "price-acme",
};
const money = (centAmount: number) => ({ type: "centPrecision", fractionDigits: 2, centAmount, currencyCode: "USD" });
const projection = {
  id: "p",
  name: { en: "Loader" },
  slug: { en: "loader" },
  categories: [],
  masterVariant: {
    id: 1,
    sku: "L-1",
    images: [{ url: "https://img/1.jpg" }, { url: "https://img/2.jpg" }],
    attributes: [{ name: "colorLabel", value: "Red" }],
    availability: { isOnStock: true, availableQuantity: 7 },
    price: {
      channel: { id: "price-acme" },
      value: money(12000),
      discounted: { value: money(9000) },
    },
  },
  variants: [{ id: 2, sku: "L-2", images: [], attributes: [] }],
} as unknown as ProductProjection;

const product = (id: string, category: string, categoryIds: string[] = []): B2BProduct => ({
  id,
  slug: id,
  name: id,
  description: "",
  category,
  categoryIds,
  image: "",
  images: [],
  price: null,
  variants: [{ id: 1, sku: id, image: "", price: null, attributes: [] }],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getApiRoot.mockReturnValue(null);
  mocks.getB2BApiRoot.mockReturnValue(null);
});

describe("B2B product detail data", () => {
  it("maps every variant image, the undiscounted price, attribute labels and stock", () => {
    const [master, second] = mapB2BProduct(projection, context, "en").variants;
    expect(master.images).toEqual(["https://img/1.jpg", "https://img/2.jpg"]);
    expect(master.price).toMatchObject({ centAmount: 9000 });
    expect(master.originalPrice).toMatchObject({ centAmount: 12000 });
    expect(master.attributes).toEqual([{ name: "colorLabel", label: "Color Label", value: "Red" }]);
    expect(master.availability).toEqual({ isOnStock: true, availableQuantity: 7 });
    // No channel price, no discount and untracked inventory stay absent.
    expect(second).toMatchObject({ images: [], price: null, originalPrice: null });
    expect(second).not.toHaveProperty("availability");
  });

  it("does not expose a struck-through price without a discount", () => {
    const plain = {
      ...projection,
      masterVariant: { ...projection.masterVariant, price: { channel: { id: "price-acme" }, value: money(12000) } },
    } as unknown as ProductProjection;
    const [master] = mapB2BProduct(plain, context, "en").variants;
    expect(master.price).toMatchObject({ centAmount: 12000 });
    expect(master.originalPrice).toBeNull();
  });
});

describe("variant options", () => {
  const variants = [
    { id: 1, attributes: [{ name: "color", label: "Color", value: "Red" }, { name: "size", label: "Size", value: "S" }] },
    { id: 2, attributes: [{ name: "color", label: "Color", value: "Red" }, { name: "size", label: "Size", value: "L" }] },
    { id: 3, attributes: [{ name: "color", label: "Color", value: "Blue" }, { name: "size", label: "Size", value: "L" }] },
  ];
  const groups = optionGroupsFor(variants);

  it("offers only attributes that vary between variants", () => {
    expect(groups.map((group) => [group.name, group.values])).toEqual([
      ["color", ["Red", "Blue"]],
      ["size", ["S", "L"]],
    ]);
  });

  it("keeps the other choices when possible and falls back to any matching variant", () => {
    expect(variantForOption(variants, groups, variants[0], "size", "L").id).toBe(2);
    expect(variantForOption(variants, groups, variants[0], "color", "Blue").id).toBe(3);
  });
});

describe("recently viewed and related business products", () => {
  it("stores unique IDs, most recent first, within the limit", () => {
    let ids: string[] = [];
    for (let i = 0; i < B2B_RECENTLY_VIEWED_LIMIT + 2; i++) ids = pushRecentlyViewed(ids, `p${i}`);
    ids = pushRecentlyViewed(ids, "p5");
    expect(ids[0]).toBe("p5");
    expect(ids).toHaveLength(B2B_RECENTLY_VIEWED_LIMIT);
    expect(new Set(ids).size).toBe(ids.length);
    expect(parseRecentlyViewed('["a","a",1,"",null,"b"]')).toEqual(["a", "b"]);
    expect(parseRecentlyViewed("not json")).toEqual([]);
  });

  it("resolves only products still in the assortment, excluding the current one", () => {
    const products = [product("a", "Tools"), product("b", "Tools")];
    expect(resolveRecentlyViewed(["gone", "b", "a"], products, "a").map((p) => p.id)).toEqual(["b"]);
  });

  it("ranks products of the same category before those sharing an ancestor", () => {
    const current = product("p", "Drills", ["drills", "tools"]);
    const products = [current, product("x", "Saws", ["saws", "tools"]), product("y", "Drills", ["drills", "tools"]), product("z", "Paint", ["paint"])];
    expect(relatedBusinessProducts(current, products).map((p) => p.id)).toEqual(["y", "x"]);
  });
});

describe("B2B product reviews", () => {
  const routeContext = { params: Promise.resolve({ productId: "p1" }) };
  const review = { authorName: "Alex", title: "Solid", text: "Works well.", rating: 4 };
  const post = (headers: Record<string, string> = { origin: "http://localhost" }) =>
    new Request("http://localhost/api/b2b/products/p1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(review),
    });

  it("reads reviews from the B2B project, not the B2C one", async () => {
    const get = vi.fn(() => ({ execute: vi.fn().mockResolvedValue({ body: { results: [] } }) }));
    mocks.getB2BApiRoot.mockReturnValue({ reviews: () => ({ get }) });
    expect(await readProductReviews("p1", {}, "b2b")).toMatchObject({ total: 0 });
    expect(get).toHaveBeenCalled();
    expect(mocks.getApiRoot).not.toHaveBeenCalled();
    const response = await GET(new Request("http://localhost/api/b2b/products/p1/reviews"), routeContext);
    expect(response.status).toBe(200);
  });

  it("refuses submissions from guests and other origins", async () => {
    mocks.readB2BSession.mockResolvedValue({});
    expect((await POST(post(), routeContext)).status).toBe(401);
    mocks.readB2BSession.mockResolvedValue({ customer: { id: "alice", email: "a@example.test" } });
    expect((await POST(post({ origin: "https://evil.example" }), routeContext)).status).toBe(403);
    expect((await POST(post({}), routeContext)).status).toBe(403);
  });

  it("publishes a signed-in associate's review to the B2B project", async () => {
    mocks.readB2BSession.mockResolvedValue({ customer: { id: "alice", email: "a@example.test" } });
    const reviewPost = vi.fn(() => ({ execute: vi.fn().mockResolvedValue({ body: { ...review, id: "r1", createdAt: "2026-10-15T00:00:00Z" } }) }));
    const withId = vi.fn(() => ({ get: () => ({ execute: vi.fn().mockResolvedValue({ body: { id: "p1" } }) }) }));
    mocks.getB2BApiRoot.mockReturnValue({ productProjections: () => ({ withId }), reviews: () => ({ post: reviewPost }) });
    const response = await POST(post(), routeContext);
    expect(response.status).toBe(201);
    expect(reviewPost).toHaveBeenCalledWith({ body: expect.objectContaining({ ...review, target: { typeId: "product", id: "p1" } }) });
    expect(mocks.getApiRoot).not.toHaveBeenCalled();
  });
});
