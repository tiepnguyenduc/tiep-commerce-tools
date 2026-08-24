import "server-only";
import type {
  ShoppingList,
  ShoppingListUpdateAction,
} from "@commercetools/platform-sdk";
import { getEnvReadiness } from "../env";
import type { Wishlist } from "../types";
import { getApiRoot } from "./client";
import { requireCommerceConfig } from "./context";
import { mapWishlist } from "./account-mappers";
import { readCommerceSession } from "./session";

const expandVariant = "lineItems[*].variant";

function requireApiRoot() {
  const apiRoot = getApiRoot();
  if (!apiRoot || !getEnvReadiness().ready) {
    throw new Error("commercetools API is not configured.");
  }
  return apiRoot;
}

function requireCustomerId() {
  const { customerId } = readCommerceSession();
  if (!customerId) throw new Error("Customer login required.");
  return customerId;
}

function trainingWishlist(): Wishlist {
  const { customerId } = readCommerceSession();
  if (!customerId) throw new Error("Customer login required.");
  return {
    id: `training-wishlist-${customerId}`,
    version: 1,
    name: "My Wishlist",
    lines: [],
  };
}

async function getOrCreateLiveWishlist(): Promise<ShoppingList> {
  const customerId = requireCustomerId();
  const escapedCustomerId = customerId.replaceAll('"', '\\"');
  const response = await requireApiRoot()
    .shoppingLists()
    .get({
      queryArgs: {
        where: `customer(id="${escapedCustomerId}")`,
        sort: "lastModifiedAt desc",
        limit: 1,
        expand: expandVariant,
      },
    })
    .execute();

  const existing = response.body.results[0];
  if (existing) return existing;

  return (
    await requireApiRoot()
      .shoppingLists()
      .post({
        queryArgs: { expand: expandVariant },
        body: {
          name: { "en-US": "My Wishlist" },
          customer: { typeId: "customer", id: customerId },
        },
      })
      .execute()
  ).body;
}

async function updateLiveWishlist(
  list: ShoppingList,
  actions: ShoppingListUpdateAction[],
) {
  return (
    await requireApiRoot()
      .shoppingLists()
      .withId({ ID: list.id })
      .post({
        queryArgs: { expand: expandVariant },
        body: { version: list.version, actions },
      })
      .execute()
  ).body;
}

export async function readWishlist(): Promise<Wishlist> {
  if (!getEnvReadiness().ready) return trainingWishlist();
  const list = await getOrCreateLiveWishlist();
  return mapWishlist(list, requireCommerceConfig().locale);
}

export async function addWishlistItem(input: {
  productId: string;
  variantId?: number;
}): Promise<Wishlist> {
  if (!getEnvReadiness().ready) return trainingWishlist();

  const list = await getOrCreateLiveWishlist();
  const existingLine = list.lineItems.find(
    (line) => line.productId === input.productId,
  );

  if (existingLine) return mapWishlist(list, requireCommerceConfig().locale);

  const updated = await updateLiveWishlist(list, [
    {
      action: "addLineItem",
      productId: input.productId,
      variantId: input.variantId,
      quantity: 1,
    },
  ]);
  return mapWishlist(updated, requireCommerceConfig().locale);
}

export async function removeWishlistItem(lineItemId: string): Promise<Wishlist> {
  if (!getEnvReadiness().ready) return trainingWishlist();

  const list = await getOrCreateLiveWishlist();
  const updated = await updateLiveWishlist(list, [
    { action: "removeLineItem", lineItemId },
  ]);
  return mapWishlist(updated, requireCommerceConfig().locale);
}
