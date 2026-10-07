import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readB2BSession: vi.fn(),
  readB2BWishlist: vi.fn(),
  addB2BWishlistItem: vi.fn(),
  removeB2BWishlistItem: vi.fn(),
}));

vi.mock("../lib/b2b/session", () => ({
  readB2BSession: mocks.readB2BSession,
}));

vi.mock("../lib/ct/b2b-wishlist", () => ({
  readB2BWishlist: mocks.readB2BWishlist,
  addB2BWishlistItem: mocks.addB2BWishlistItem,
  removeB2BWishlistItem: mocks.removeB2BWishlistItem,
  b2bWishlistErrorStatus: (error: unknown) =>
    error instanceof Error && error.message === "B2B login required."
      ? 401
      : 500,
}));

import { GET } from "../app/api/b2b/wishlist/route";
import {
  DELETE,
  POST,
} from "../app/api/b2b/wishlist/items/route";

const wishlist = {
  id: "wishlist-1",
  version: 1,
  name: "My Wishlist",
  isDefault: true,
  lines: [],
};
const customer = { id: "customer-1", email: "buyer@example.com" };
const productId = "f4f7f0a4-ab56-4b5c-81de-95503be9c1e3";

describe("B2B My Wishlist routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readB2BSession.mockResolvedValue({ customer });
    mocks.readB2BWishlist.mockResolvedValue(wishlist);
    mocks.addB2BWishlistItem.mockResolvedValue(wishlist);
    mocks.removeB2BWishlistItem.mockResolvedValue(wishlist);
  });

  it("uses the customer from the protected B2B session", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.readB2BWishlist).toHaveBeenCalledWith(customer.id);
    await expect(response.json()).resolves.toEqual({ wishlist });
  });

  it("rejects anonymous wishlist reads", async () => {
    mocks.readB2BSession.mockResolvedValue({});

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.readB2BWishlist).not.toHaveBeenCalled();
  });

  it("adds the selected product variant for the signed-in customer", async () => {
    const response = await POST(
      new Request("https://shop.test/api/b2b/wishlist/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId: 2 }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.addB2BWishlistItem).toHaveBeenCalledWith(customer.id, {
      productId,
      variantId: 2,
    });
  });

  it("removes a wishlist line for the signed-in customer", async () => {
    const response = await DELETE(
      new Request(
        "https://shop.test/api/b2b/wishlist/items?lineItemId=line-1",
        { method: "DELETE" },
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.removeB2BWishlistItem).toHaveBeenCalledWith(
      customer.id,
      "line-1",
    );
  });
});
