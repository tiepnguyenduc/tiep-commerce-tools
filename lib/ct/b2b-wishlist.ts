import "server-only";

import type { ShoppingList, ShoppingListUpdateAction } from "@commercetools/platform-sdk";
import type { Wishlist } from "../types";
import { getB2BApiRoot } from "./client";
import { mapWishlist } from "./account-mappers";

const DEFAULT_WISHLIST_NAME = "My Wishlist";
const expandVariant = "lineItems[*].variant";

function api() {
  const apiRoot = getB2BApiRoot();
  if (!apiRoot) throw new Error("B2B wishlist service unavailable.");
  return apiRoot;
}

function locale() {
  return process.env.CTP_LOCALE || "en-US";
}

function escapePredicateValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function listShoppingLists(customerId: string) {
  const results: ShoppingList[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const response = await api().shoppingLists().get({
      queryArgs: {
        where: `customer(id="${escapePredicateValue(customerId)}")`,
        sort: "createdAt asc",
        limit,
        offset,
        expand: expandVariant,
      },
    }).execute();
    results.push(...response.body.results);
    if (response.body.results.length < limit) break;
  }
  return results;
}

async function createShoppingList(name: string, customerId: string) {
  return (await api().shoppingLists().post({
    queryArgs: { expand: expandVariant },
    body: {
      name: { [locale()]: name },
      customer: { typeId: "customer", id: customerId },
    },
  }).execute()).body;
}

async function ensureShoppingLists(customerId: string) {
  const existing = await listShoppingLists(customerId);
  return existing.length
    ? existing
    : [await createShoppingList(DEFAULT_WISHLIST_NAME, customerId)];
}

async function readOwnedShoppingList(id: string, customerId: string) {
  try {
    const list = (await api().shoppingLists().withId({ ID: id }).get({
      queryArgs: { expand: expandVariant },
    }).execute()).body;
    if (list.customer?.id !== customerId) throw new Error("Wishlist not found.");
    return list;
  } catch (error) {
    if (error instanceof Error && error.message === "Wishlist not found.") throw error;
    if ((error as { statusCode?: number })?.statusCode === 404) {
      throw new Error("Wishlist not found.");
    }
    throw error;
  }
}

async function updateShoppingList(list: ShoppingList, actions: ShoppingListUpdateAction[]) {
  return (await api().shoppingLists().withId({ ID: list.id }).post({
    queryArgs: { expand: expandVariant },
    body: { version: list.version, actions },
  }).execute()).body;
}

function mapWishlists(lists: ShoppingList[]) {
  return lists.map((list, index) => mapWishlist(list, locale(), index === 0));
}

export function b2bWishlistErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "B2B login required.") return 401;
  if (error.message === "B2B wishlist service unavailable.") return 503;
  if (error.message === "Wishlist not found." || error.message === "Wishlist item not found.") return 404;
  if (error.message === "Wishlist name is required." || error.message === "The default wishlist cannot be deleted.") return 400;
  return 500;
}

export async function readB2BWishlists(customerId: string): Promise<Wishlist[]> {
  return mapWishlists(await ensureShoppingLists(customerId));
}

export async function readB2BWishlist(customerId: string): Promise<Wishlist> {
  return (await readB2BWishlists(customerId))[0];
}

export async function createB2BWishlist(customerId: string, name: string): Promise<Wishlist> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Wishlist name is required.");
  const existing = await listShoppingLists(customerId);
  if (!existing.length) await createShoppingList(DEFAULT_WISHLIST_NAME, customerId);
  return mapWishlist(await createShoppingList(normalizedName, customerId), locale(), false);
}

export async function renameB2BWishlist(customerId: string, id: string, name: string): Promise<Wishlist> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Wishlist name is required.");
  const lists = await ensureShoppingLists(customerId);
  const list = await readOwnedShoppingList(id, customerId);
  const updated = await updateShoppingList(list, [
    { action: "changeName", name: { [locale()]: normalizedName } },
  ]);
  return mapWishlist(updated, locale(), list.id === lists[0].id);
}

export async function deleteB2BWishlist(customerId: string, id: string) {
  const lists = await ensureShoppingLists(customerId);
  const index = lists.findIndex((list) => list.id === id);
  if (index < 0) throw new Error("Wishlist not found.");
  if (index === 0) throw new Error("The default wishlist cannot be deleted.");
  await api().shoppingLists().withId({ ID: id }).delete({
    queryArgs: { version: lists[index].version },
  }).execute();
}

export async function addB2BWishlistItem(
  customerId: string,
  input: { productId: string; variantId?: number },
  wishlistId?: string,
): Promise<Wishlist> {
  const lists = await ensureShoppingLists(customerId);
  const list = wishlistId ? await readOwnedShoppingList(wishlistId, customerId) : lists[0];
  const existing = list.lineItems.find((line) =>
    line.productId === input.productId &&
    (input.variantId === undefined || line.variantId === input.variantId));
  if (existing) return mapWishlist(list, locale(), list.id === lists[0].id);
  const updated = await updateShoppingList(list, [{
    action: "addLineItem",
    productId: input.productId,
    variantId: input.variantId,
    quantity: 1,
  }]);
  return mapWishlist(updated, locale(), list.id === lists[0].id);
}

export async function removeB2BWishlistItem(
  customerId: string,
  lineItemId: string,
  wishlistId?: string,
): Promise<Wishlist> {
  const lists = await ensureShoppingLists(customerId);
  const list = wishlistId ? await readOwnedShoppingList(wishlistId, customerId) : lists[0];
  if (!list.lineItems.some((line) => line.id === lineItemId)) {
    throw new Error("Wishlist item not found.");
  }
  const updated = await updateShoppingList(list, [{ action: "removeLineItem", lineItemId }]);
  return mapWishlist(updated, locale(), list.id === lists[0].id);
}
