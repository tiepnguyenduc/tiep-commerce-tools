import "server-only";

import type {
  ShoppingList,
  ShoppingListUpdateAction,
} from "@commercetools/platform-sdk";
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
    const response = await api()
      .shoppingLists()
      .get({
        queryArgs: {
          where: `customer(id="${escapePredicateValue(customerId)}")`,
          sort: "createdAt asc",
          limit,
          offset,
          expand: expandVariant,
        },
      })
      .execute();
    results.push(...response.body.results);
    if (response.body.results.length < limit) break;
  }

  return results;
}

async function createDefaultWishlist(customerId: string) {
  return (
    await api()
      .shoppingLists()
      .post({
        queryArgs: { expand: expandVariant },
        body: {
          name: { [locale()]: DEFAULT_WISHLIST_NAME },
          customer: { typeId: "customer", id: customerId },
        },
      })
      .execute()
  ).body;
}

async function defaultShoppingList(customerId: string) {
  const existing = await listShoppingLists(customerId);
  return existing[0] ?? createDefaultWishlist(customerId);
}

async function readOwnedShoppingList(id: string, customerId: string) {
  try {
    const list = (
      await api()
        .shoppingLists()
        .withId({ ID: id })
        .get({ queryArgs: { expand: expandVariant } })
        .execute()
    ).body;
    if (list.customer?.id !== customerId) throw new Error("Wishlist not found.");
    return list;
  } catch (error) {
    if (error instanceof Error && error.message === "Wishlist not found.") {
      throw error;
    }
    if ((error as { statusCode?: number })?.statusCode === 404) {
      throw new Error("Wishlist not found.");
    }
    throw error;
  }
}

async function updateShoppingList(
  list: ShoppingList,
  actions: ShoppingListUpdateAction[],
) {
  return (
    await api()
      .shoppingLists()
      .withId({ ID: list.id })
      .post({
        queryArgs: { expand: expandVariant },
        body: { version: list.version, actions },
      })
      .execute()
  ).body;
}

function mapDefaultWishlist(list: ShoppingList): Wishlist {
  return mapWishlist(list, locale(), true);
}

export function b2bWishlistErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (
    error.message === "B2B login required." ||
    error.message === "B2B wishlist service unavailable."
  ) {
    return error.message === "B2B login required." ? 401 : 503;
  }
  if (
    error.message === "Wishlist not found." ||
    error.message === "Wishlist item not found."
  ) {
    return 404;
  }
  return 500;
}

export async function readB2BWishlist(customerId: string): Promise<Wishlist> {
  return mapDefaultWishlist(await defaultShoppingList(customerId));
}

export async function addB2BWishlistItem(
  customerId: string,
  input: { productId: string; variantId?: number },
): Promise<Wishlist> {
  const defaultList = await defaultShoppingList(customerId);
  const list = await readOwnedShoppingList(defaultList.id, customerId);
  const existing = list.lineItems.find(
    (line) =>
      line.productId === input.productId &&
      (input.variantId === undefined || line.variantId === input.variantId),
  );
  if (existing) return mapDefaultWishlist(list);

  return mapDefaultWishlist(
    await updateShoppingList(list, [
      {
        action: "addLineItem",
        productId: input.productId,
        variantId: input.variantId,
        quantity: 1,
      },
    ]),
  );
}

export async function removeB2BWishlistItem(
  customerId: string,
  lineItemId: string,
): Promise<Wishlist> {
  const defaultList = await defaultShoppingList(customerId);
  const list = await readOwnedShoppingList(defaultList.id, customerId);
  if (!list.lineItems.some((line) => line.id === lineItemId)) {
    throw new Error("Wishlist item not found.");
  }

  return mapDefaultWishlist(
    await updateShoppingList(list, [
      { action: "removeLineItem", lineItemId },
    ]),
  );
}
