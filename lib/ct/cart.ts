import "server-only";
import type {
  Cart as CtCart,
  CartDraft,
  CartUpdateAction,
  Order,
  OrderFromCartDraft,
} from "@commercetools/platform-sdk";
import { getEnvReadiness } from "../env";
import {
  addDiscountCodeAction,
  removeDiscountCodeAction,
} from "../cart-discount";
import { emptyCart } from "../cart-engine";
import type { Cart, StoreMode } from "../types";
import { getApiRoot } from "./client";
import {
  type B2BContext,
  requireB2BContext,
  requireCommerceConfig,
} from "./context";
import { mapCommercetoolsCart } from "./mappers";
import { getCartId, setCartId } from "./session";

type CartUpdateTarget = {
  get(): Promise<CtCart>;
  update(version: number, actions: CartUpdateAction[]): Promise<CtCart>;
};

const discountCodeExpand = "discountCodes[*].discountCode";

type CartUpdateInput = {
  productId: string;
  sku?: string;
  quantity: number;
  mode: StoreMode;
};

function requireApiRoot() {
  const apiRoot = getApiRoot();
  if (!apiRoot || !getEnvReadiness().ready) {
    throw new Error("commercetools API is not configured.");
  }
  return apiRoot;
}

function b2bChain(context: B2BContext) {
  return requireApiRoot()
    .asAssociate()
    .withAssociateIdValue({ associateId: context.associateId })
    .inBusinessUnitKeyWithBusinessUnitKeyValue({
      businessUnitKey: context.businessUnitKey,
    });
}

function draft(mode: StoreMode, context?: B2BContext): CartDraft {
  const config = requireCommerceConfig();
  return {
    currency: config.currency,
    country: config.country,
    locale: config.locale,
    ...(mode === "b2b" && context?.storeKey
      ? { store: { typeId: "store", key: context.storeKey } }
      : {}),
  };
}

async function createCart(mode: StoreMode) {
  if (mode === "b2b") {
    const context = requireB2BContext();
    const response = await b2bChain(context)
      .carts()
      .post({ body: draft(mode, context) })
      .execute();
    return response.body;
  }

  const response = await requireApiRoot().carts().post({ body: draft(mode) }).execute();
  return response.body;
}

async function targetForCart(mode: StoreMode, cartId: string): Promise<CartUpdateTarget> {
  if (mode === "b2b") {
    const context = requireB2BContext();
    const builder = b2bChain(context).carts().withId({ ID: cartId });
    return {
      get: async () =>
        (await builder.get({ queryArgs: { expand: discountCodeExpand } }).execute())
          .body,
      update: async (version, actions) =>
        (
          await builder
            .post({
              queryArgs: { expand: discountCodeExpand },
              body: { version, actions },
            })
            .execute()
        ).body,
    };
  }

  const builder = requireApiRoot().carts().withId({ ID: cartId });
  return {
    get: async () =>
      (await builder.get({ queryArgs: { expand: discountCodeExpand } }).execute())
        .body,
    update: async (version, actions) =>
      (
        await builder
          .post({
            queryArgs: { expand: discountCodeExpand },
            body: { version, actions },
          })
          .execute()
      ).body,
  };
}

function isConcurrentModification(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 409
  );
}

async function withRetry(target: CartUpdateTarget, actionsFor: (cart: CtCart) => CartUpdateAction[]) {
  let cart = await target.get();
  try {
    return await target.update(cart.version, actionsFor(cart));
  } catch (error) {
    if (!isConcurrentModification(error)) throw error;
    cart = await target.get();
    return target.update(cart.version, actionsFor(cart));
  }
}

function lineMatches(line: CtCart["lineItems"][number], input: Pick<CartUpdateInput, "productId" | "sku">) {
  return input.sku
    ? line.variant.sku === input.sku
    : line.productId === input.productId;
}

function addLineAction(input: CartUpdateInput): CartUpdateAction {
  const productSelector = input.sku
    ? { sku: input.sku }
    : { productId: input.productId };
  const context = input.mode === "b2b" ? requireB2BContext() : undefined;

  return {
    action: "addLineItem",
    ...productSelector,
    quantity: input.quantity,
    ...(context?.distributionChannelKey
      ? {
          distributionChannel: {
            typeId: "channel" as const,
            key: context.distributionChannelKey,
          },
        }
      : {}),
    ...(context?.supplyChannelKey
      ? {
          supplyChannel: {
            typeId: "channel" as const,
            key: context.supplyChannelKey,
          },
        }
      : {}),
  };
}

function updateActions(input: CartUpdateInput) {
  return (cart: CtCart): CartUpdateAction[] => {
    const existing = cart.lineItems.find((line) => lineMatches(line, input));
    if (existing) {
      return input.quantity === 0
        ? [{ action: "removeLineItem", lineItemId: existing.id }]
        : [
            {
              action: "changeLineItemQuantity",
              lineItemId: existing.id,
              quantity: input.quantity,
            },
          ];
    }

    if (input.quantity === 0) return [];
    return [addLineAction(input)];
  };
}

export async function readLiveCart(mode: StoreMode): Promise<Cart | null> {
  const cartId = getCartId(mode);
  if (!cartId) return null;
  const target = await targetForCart(mode, cartId);
  const cart = await target.get();
  return mapCommercetoolsCart(cart, mode, requireCommerceConfig().locale);
}

export async function updateLiveCart(input: CartUpdateInput): Promise<Cart> {
  let cartId = getCartId(input.mode);
  if (!cartId) {
    const cart = await createCart(input.mode);
    cartId = cart.id;
    setCartId(input.mode, cart.id);
  }

  const target = await targetForCart(input.mode, cartId);
  const updated = await withRetry(target, updateActions(input));
  return mapCommercetoolsCart(updated, input.mode, requireCommerceConfig().locale);
}

export async function clearLiveCart(mode: StoreMode): Promise<Cart> {
  const cartId = getCartId(mode);
  if (!cartId) return emptyCart(mode);

  const target = await targetForCart(mode, cartId);
  const actionsFor = (cart: CtCart): CartUpdateAction[] => [
    ...cart.lineItems.map((line): CartUpdateAction => ({
      action: "removeLineItem" as const,
      lineItemId: line.id,
    })),
    ...(cart.discountCodes ?? []).map((info) =>
      removeDiscountCodeAction(info.discountCode.id),
    ),
  ];

  let cart = await target.get();
  let actions = actionsFor(cart);
  if (actions.length === 0) {
    return mapCommercetoolsCart(cart, mode, requireCommerceConfig().locale);
  }

  let updated: CtCart;
  try {
    updated = await target.update(cart.version, actions);
  } catch (error) {
    if (!isConcurrentModification(error)) throw error;
    cart = await target.get();
    actions = actionsFor(cart);
    updated =
      actions.length === 0 ? cart : await target.update(cart.version, actions);
  }

  return mapCommercetoolsCart(updated, mode, requireCommerceConfig().locale);
}

async function updateLiveCartWithActions(
  mode: StoreMode,
  actions: CartUpdateAction[],
): Promise<Cart> {
  const cartId = getCartId(mode);
  if (!cartId) {
    throw new Error("No active cart. Add an item before applying a discount code.");
  }

  const target = await targetForCart(mode, cartId);
  const updated = await withRetry(target, () => actions);
  return mapCommercetoolsCart(updated, mode, requireCommerceConfig().locale);
}

export function applyLiveDiscountCode(
  mode: StoreMode,
  code: string,
): Promise<Cart> {
  return updateLiveCartWithActions(mode, [addDiscountCodeAction(code)]);
}

export function removeLiveDiscountCode(
  mode: StoreMode,
  discountCodeId: string,
): Promise<Cart> {
  return updateLiveCartWithActions(mode, [
    removeDiscountCodeAction(discountCodeId),
  ]);
}

export async function createLiveOrder(
  mode: StoreMode,
  purchaseOrderNumber?: string,
): Promise<Order> {
  const cartId = getCartId(mode);
  if (!cartId) throw new Error("No active cart. Add an item before placing an order.");

  const target = await targetForCart(mode, cartId);
  const cart = await target.get();
  if (!cart.lineItems.length) {
    throw new Error("No active cart. Add an item before placing an order.");
  }

  const body: OrderFromCartDraft = {
    cart: { typeId: "cart", id: cart.id },
    version: cart.version,
    ...(purchaseOrderNumber ? { purchaseOrderNumber } : {}),
  };

  const response =
    mode === "b2b"
      ? await b2bChain(requireB2BContext()).orders().post({ body }).execute()
      : await requireApiRoot().orders().post({ body }).execute();

  setCartId(mode, undefined);
  return response.body;
}
