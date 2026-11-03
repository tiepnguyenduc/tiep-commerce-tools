import "server-only";
import type {
  ShoppingList,
  ShoppingListUpdateAction,
} from "@commercetools/platform-sdk";
import { getEnvReadiness } from "../env";
import { products } from "../sample-data";
import type { Wishlist, WishlistLine } from "../types";
import { getApiRoot } from "./client";
import { requireCommerceConfig } from "./context";
import { mapWishlist } from "./account-mappers";
import { readCommerceSession } from "./session";

const DEFAULT_WISHLIST_NAME = "My Wishlist";
const expandVariant = "lineItems[*].variant";

declare global {
  var __trainingWishlists: Map<string, Wishlist[]> | undefined;
}

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

function trainingStore() {
  return (globalThis.__trainingWishlists ??= new Map());
}

function nextTrainingId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readTrainingWishlists(): Wishlist[] {
  const customerId = requireCustomerId();
  const store = trainingStore();
  let wishlists = store.get(customerId);
  if (!wishlists) {
    wishlists = [
      {
        id: `training-wishlist-${customerId}`,
        version: 1,
        name: DEFAULT_WISHLIST_NAME,
        isDefault: true,
        lines: [],
      },
    ];
    store.set(customerId, wishlists);
  }
  return wishlists;
}

function replaceTrainingWishlist(updated: Wishlist) {
  const customerId = requireCustomerId();
  const wishlists = readTrainingWishlists().map((wishlist) =>
    wishlist.id === updated.id ? updated : wishlist,
  );
  trainingStore().set(customerId, wishlists);
  return updated;
}

function escapePredicateValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function listLiveShoppingLists(customerId: string) {
  const results: ShoppingList[] = [];
  const limit = 100;

  for (let offset = 0; ; offset += limit) {
    const response = await requireApiRoot()
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

async function createLiveShoppingList(name: string, customerId: string) {
  const { locale } = requireCommerceConfig();
  return (
    await requireApiRoot()
      .shoppingLists()
      .post({
        queryArgs: { expand: expandVariant },
        body: {
          name: { [locale]: name },
          customer: { typeId: "customer", id: customerId },
        },
      })
      .execute()
  ).body;
}

async function ensureLiveWishlists(customerId: string) {
  const existing = await listLiveShoppingLists(customerId);
  if (existing.length) return existing;
  return [await createLiveShoppingList(DEFAULT_WISHLIST_NAME, customerId)];
}

async function readOwnedLiveWishlist(id: string, customerId: string) {
  try {
    const list = (
      await requireApiRoot()
        .shoppingLists()
        .withId({ ID: id })
        .get({ queryArgs: { expand: expandVariant } })
        .execute()
    ).body;
    if (list.customer?.id !== customerId)
      throw new Error("Wishlist not found.");
    return list;
  } catch (error) {
    if (error instanceof Error && error.message === "Wishlist not found.") {
      throw error;
    }
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404) throw new Error("Wishlist not found.");
    throw error;
  }
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

function mapLiveWishlists(lists: ShoppingList[]) {
  const { locale } = requireCommerceConfig();
  return lists.map((list, index) => mapWishlist(list, locale, index === 0));
}

export function wishlistErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "Customer login required.") return 401;
  if (error.message === "Wishlist not found.") return 404;
  if (error.message === "Wishlist item not found.") return 404;
  if (error.message === "The default wishlist cannot be deleted.") return 400;
  return 500;
}

export async function readWishlists(): Promise<Wishlist[]> {
  if (!getEnvReadiness().ready) return readTrainingWishlists();
  const customerId = requireCustomerId();
  return mapLiveWishlists(await ensureLiveWishlists(customerId));
}

/** Backwards-compatible accessor for the protected default wishlist. */
export async function readWishlist(): Promise<Wishlist> {
  return (await readWishlists())[0];
}

export async function createWishlist(name: string): Promise<Wishlist> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Wishlist name is required.");

  if (!getEnvReadiness().ready) {
    const customerId = requireCustomerId();
    const wishlists = readTrainingWishlists();
    const wishlist: Wishlist = {
      id: nextTrainingId("training-wishlist"),
      version: 1,
      name: normalizedName,
      isDefault: false,
      lines: [],
    };
    trainingStore().set(customerId, [...wishlists, wishlist]);
    return wishlist;
  }

  const customerId = requireCustomerId();
  const existing = await listLiveShoppingLists(customerId);
  if (!existing.length) {
    await createLiveShoppingList(DEFAULT_WISHLIST_NAME, customerId);
  }
  const created = await createLiveShoppingList(normalizedName, customerId);
  return mapWishlist(created, requireCommerceConfig().locale, false);
}

export async function renameWishlist(
  id: string,
  name: string,
): Promise<Wishlist> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Wishlist name is required.");

  if (!getEnvReadiness().ready) {
    const wishlist = readTrainingWishlists().find((entry) => entry.id === id);
    if (!wishlist) throw new Error("Wishlist not found.");
    return replaceTrainingWishlist({
      ...wishlist,
      version: wishlist.version + 1,
      name: normalizedName,
    });
  }

  const customerId = requireCustomerId();
  const lists = await ensureLiveWishlists(customerId);
  const list = await readOwnedLiveWishlist(id, customerId);
  const updated = await updateLiveWishlist(list, [
    {
      action: "changeName",
      name: { [requireCommerceConfig().locale]: normalizedName },
    },
  ]);
  return mapWishlist(
    updated,
    requireCommerceConfig().locale,
    list.id === lists[0].id,
  );
}

export async function deleteWishlist(id: string): Promise<void> {
  if (!getEnvReadiness().ready) {
    const customerId = requireCustomerId();
    const wishlists = readTrainingWishlists();
    const index = wishlists.findIndex((wishlist) => wishlist.id === id);
    if (index < 0) throw new Error("Wishlist not found.");
    if (wishlists[index].isDefault) {
      throw new Error("The default wishlist cannot be deleted.");
    }
    trainingStore().set(
      customerId,
      wishlists.filter((wishlist) => wishlist.id !== id),
    );
    return;
  }

  const customerId = requireCustomerId();
  const lists = await ensureLiveWishlists(customerId);
  const index = lists.findIndex((list) => list.id === id);
  if (index < 0) throw new Error("Wishlist not found.");
  if (index === 0) throw new Error("The default wishlist cannot be deleted.");

  await requireApiRoot()
    .shoppingLists()
    .withId({ ID: id })
    .delete({ queryArgs: { version: lists[index].version } })
    .execute();
}

export async function addWishlistItem(
  input: { productId: string; variantId?: number },
  wishlistId?: string,
): Promise<Wishlist> {
  if (!getEnvReadiness().ready) {
    const wishlist = wishlistId
      ? readTrainingWishlists().find((entry) => entry.id === wishlistId)
      : readTrainingWishlists()[0];
    if (!wishlist) throw new Error("Wishlist not found.");
    const existing = wishlist.lines.find(
      (line) =>
        line.productId === input.productId &&
        (input.variantId === undefined || line.variantId === input.variantId),
    );
    if (existing) return wishlist;

    const product = products.find((entry) => entry.id === input.productId);
    const variant = input.variantId
      ? product?.variants?.find((entry) => entry.id === input.variantId)
      : product?.variants?.[0];
    const line: WishlistLine = {
      id: nextTrainingId("training-line"),
      productId: input.productId,
      variantId: input.variantId,
      sku: variant?.sku || product?.sku || input.productId,
      name: product?.name || "Wishlist item",
      image: variant?.image || product?.image || "",
      quantity: 1,
    };
    return replaceTrainingWishlist({
      ...wishlist,
      version: wishlist.version + 1,
      lines: [...wishlist.lines, line],
    });
  }

  const customerId = requireCustomerId();
  const lists = await ensureLiveWishlists(customerId);
  const list = wishlistId
    ? await readOwnedLiveWishlist(wishlistId, customerId)
    : lists[0];
  const existingLine = list.lineItems.find(
    (line) =>
      line.productId === input.productId &&
      (input.variantId === undefined || line.variantId === input.variantId),
  );
  const defaultId = lists[0].id;
  if (existingLine) {
    return mapWishlist(
      list,
      requireCommerceConfig().locale,
      list.id === defaultId,
    );
  }

  const updated = await updateLiveWishlist(list, [
    {
      action: "addLineItem",
      productId: input.productId,
      variantId: input.variantId,
      quantity: 1,
    },
  ]);
  return mapWishlist(
    updated,
    requireCommerceConfig().locale,
    list.id === defaultId,
  );
}

export async function removeWishlistItem(
  lineItemId: string,
  wishlistId?: string,
): Promise<Wishlist> {
  if (!getEnvReadiness().ready) {
    const wishlist = wishlistId
      ? readTrainingWishlists().find((entry) => entry.id === wishlistId)
      : readTrainingWishlists()[0];
    if (!wishlist) throw new Error("Wishlist not found.");
    if (!wishlist.lines.some((line) => line.id === lineItemId)) {
      throw new Error("Wishlist item not found.");
    }
    return replaceTrainingWishlist({
      ...wishlist,
      version: wishlist.version + 1,
      lines: wishlist.lines.filter((line) => line.id !== lineItemId),
    });
  }

  const customerId = requireCustomerId();
  const lists = await ensureLiveWishlists(customerId);
  const list = wishlistId
    ? await readOwnedLiveWishlist(wishlistId, customerId)
    : lists[0];
  if (!list.lineItems.some((line) => line.id === lineItemId)) {
    throw new Error("Wishlist item not found.");
  }
  const defaultId = lists[0].id;
  const updated = await updateLiveWishlist(list, [
    { action: "removeLineItem", lineItemId },
  ]);
  return mapWishlist(
    updated,
    requireCommerceConfig().locale,
    list.id === defaultId,
  );
}
