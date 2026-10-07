import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readB2BSession: vi.fn(),
  readB2BWishlists: vi.fn(),
  createB2BWishlist: vi.fn(),
  renameB2BWishlist: vi.fn(),
  deleteB2BWishlist: vi.fn(),
  addB2BWishlistItem: vi.fn(),
  removeB2BWishlistItem: vi.fn(),
}));

vi.mock("../lib/b2b/session", () => ({ readB2BSession: mocks.readB2BSession }));
vi.mock("../lib/ct/b2b-wishlist", () => ({
  ...mocks,
  b2bWishlistErrorStatus: (error: unknown) =>
    error instanceof Error && error.message === "B2B login required." ? 401 : 500,
}));

import { GET, POST as CREATE } from "../app/api/b2b/wishlists/route";
import { DELETE as DELETE_LIST, PUT } from "../app/api/b2b/wishlists/[wishlistId]/route";
import { DELETE as REMOVE_ITEM, POST as ADD_ITEM } from "../app/api/b2b/wishlists/[wishlistId]/items/route";

const customer = { id: "customer-1", email: "buyer@example.com" };
const wishlist = { id: "list-1", version: 1, name: "My Wishlist", isDefault: true, lines: [] };
const productId = "f4f7f0a4-ab56-4b5c-81de-95503be9c1e3";
const context = { params: Promise.resolve({ wishlistId: wishlist.id }) };

describe("B2B multiple wishlist routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readB2BSession.mockResolvedValue({ customer });
    mocks.readB2BWishlists.mockResolvedValue([wishlist]);
    mocks.createB2BWishlist.mockResolvedValue(wishlist);
    mocks.renameB2BWishlist.mockResolvedValue(wishlist);
    mocks.addB2BWishlistItem.mockResolvedValue(wishlist);
    mocks.removeB2BWishlistItem.mockResolvedValue(wishlist);
  });

  it("lists all personal wishlists", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.readB2BWishlists).toHaveBeenCalledWith(customer.id);
    await expect(response.json()).resolves.toEqual({ wishlists: [wishlist] });
  });

  it("creates a named wishlist", async () => {
    const response = await CREATE(new Request("https://shop.test/api/b2b/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Project North" }),
    }));
    expect(response.status).toBe(201);
    expect(mocks.createB2BWishlist).toHaveBeenCalledWith(customer.id, "Project North");
  });

  it("renames and deletes an owned wishlist", async () => {
    await PUT(new Request("https://shop.test/api/b2b/wishlists/list-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    }), context);
    expect(mocks.renameB2BWishlist).toHaveBeenCalledWith(customer.id, wishlist.id, "Renamed");

    const response = await DELETE_LIST(new Request("https://shop.test"), context);
    expect(response.status).toBe(200);
    expect(mocks.deleteB2BWishlist).toHaveBeenCalledWith(customer.id, wishlist.id);
  });

  it("adds and removes items in a selected wishlist", async () => {
    await ADD_ITEM(new Request("https://shop.test/api/b2b/wishlists/list-1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, variantId: 2 }),
    }), context);
    expect(mocks.addB2BWishlistItem).toHaveBeenCalledWith(
      customer.id,
      { productId, variantId: 2 },
      wishlist.id,
    );

    await REMOVE_ITEM(new Request("https://shop.test/api/b2b/wishlists/list-1/items?lineItemId=line-1", { method: "DELETE" }), context);
    expect(mocks.removeB2BWishlistItem).toHaveBeenCalledWith(customer.id, "line-1", wishlist.id);
  });

  it("rejects anonymous reads", async () => {
    mocks.readB2BSession.mockResolvedValue({});
    expect((await GET()).status).toBe(401);
    expect(mocks.readB2BWishlists).not.toHaveBeenCalled();
  });
});
