import { beforeEach, describe, expect, it, vi } from "vitest";

const readWishlists = vi.hoisted(() => vi.fn());
const createWishlist = vi.hoisted(() => vi.fn());
const renameWishlist = vi.hoisted(() => vi.fn());
const deleteWishlist = vi.hoisted(() => vi.fn());
const addWishlistItem = vi.hoisted(() => vi.fn());
const removeWishlistItem = vi.hoisted(() => vi.fn());

vi.mock("../lib/ct/wishlist", () => ({
  readWishlists,
  createWishlist,
  renameWishlist,
  deleteWishlist,
  addWishlistItem,
  removeWishlistItem,
  wishlistErrorStatus: (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message === "Customer login required.") return 401;
    if (message === "Wishlist not found.") return 404;
    if (message === "The default wishlist cannot be deleted.") return 400;
    return 500;
  },
}));

import { GET, POST as create } from "../app/api/wishlists/route";
import {
  DELETE as remove,
  PUT as rename,
} from "../app/api/wishlists/[wishlistId]/route";
import {
  DELETE as removeItem,
  POST as addItem,
} from "../app/api/wishlists/[wishlistId]/items/route";

const defaultWishlist = {
  id: "list-default",
  version: 1,
  name: "My Wishlist",
  isDefault: true,
  lines: [],
};

describe("multiple wishlist routes", () => {
  beforeEach(() => {
    readWishlists.mockReset();
    createWishlist.mockReset();
    renameWishlist.mockReset();
    deleteWishlist.mockReset();
    addWishlistItem.mockReset();
    removeWishlistItem.mockReset();
  });

  it("lists all wishlists for the current customer", async () => {
    readWishlists.mockResolvedValue([defaultWishlist]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      wishlists: [defaultWishlist],
    });
  });

  it("validates and creates a named wishlist", async () => {
    createWishlist.mockResolvedValue({
      ...defaultWishlist,
      id: "list-room",
      name: "Living room",
      isDefault: false,
    });

    const response = await create(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  Living room  " }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createWishlist).toHaveBeenCalledWith("Living room");
  });

  it("returns a safe client error when default deletion is rejected", async () => {
    deleteWishlist.mockRejectedValue(
      new Error("The default wishlist cannot be deleted."),
    );

    const response = await remove(
      new Request("http://localhost/api/wishlists/list-default", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ wishlistId: "list-default" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The default wishlist cannot be deleted.",
    });
  });

  it("validates and renames the selected wishlist", async () => {
    renameWishlist.mockResolvedValue({
      ...defaultWishlist,
      id: "list-room",
      name: "Guest room",
      isDefault: false,
    });

    const response = await rename(
      new Request("http://localhost/api/wishlists/list-room", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  Guest room  " }),
      }),
      { params: Promise.resolve({ wishlistId: "list-room" }) },
    );

    expect(response.status).toBe(200);
    expect(renameWishlist).toHaveBeenCalledWith("list-room", "Guest room");
    await expect(response.json()).resolves.toMatchObject({
      wishlist: { id: "list-room", name: "Guest room" },
    });
  });

  it("rejects an empty wishlist name", async () => {
    const response = await rename(
      new Request("http://localhost/api/wishlists/list-room", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ wishlistId: "list-room" }) },
    );

    expect(response.status).toBe(400);
    expect(renameWishlist).not.toHaveBeenCalled();
  });

  it("targets the selected wishlist when adding and removing products", async () => {
    addWishlistItem.mockResolvedValue(defaultWishlist);
    removeWishlistItem.mockResolvedValue(defaultWishlist);
    const params = { params: Promise.resolve({ wishlistId: "list-room" }) };

    const addResponse = await addItem(
      new Request("http://localhost/api/wishlists/list-room/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "product-1", variantId: 2 }),
      }),
      params,
    );
    const removeResponse = await removeItem(
      new Request(
        "http://localhost/api/wishlists/list-room/items?lineItemId=line-1",
        { method: "DELETE" },
      ),
      params,
    );

    expect(addResponse.status).toBe(200);
    expect(addWishlistItem).toHaveBeenCalledWith(
      { productId: "product-1", variantId: 2 },
      "list-room",
    );
    expect(removeResponse.status).toBe(200);
    expect(removeWishlistItem).toHaveBeenCalledWith("line-1", "list-room");
  });
});
