import "server-only";
import { randomUUID } from "node:crypto";
import type {
  BaseAddress,
  BusinessUnit,
  Cart as CtCart,
} from "@commercetools/platform-sdk";
import { z } from "zod";
import type { B2BSession } from "../b2b/session";
import type { ApprovalFlowStatus } from "../b2b/approval-types";
import type {
  B2BCheckout,
  B2BOrderAddress,
  B2BOrderConfirmation,
} from "../b2b/order-types";
import { getB2BApiRoot } from "./client";
import { mapCommercetoolsCart, mapMoney } from "./mappers";
import {
  B2BError,
  cartFor,
  cartRoot,
  requireCustomer,
  verifiedContext,
} from "./b2b";
import { unitFor } from "./b2b-company";

export const placeOrderInput = z.object({
  purchaseOrderNumber: z
    .string()
    .trim()
    .min(1, "Enter a purchase order number.")
    .max(50, "Use at most 50 characters for the purchase order number.")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/,
      "Use letters, numbers, spaces and . _ / - in the purchase order number.",
    ),
  addressId: z.string().trim().min(1, "Choose a delivery address.").max(256),
  cartVersion: z.number().int().positive(),
});
const orderId = z.string().regex(/^[a-zA-Z0-9-]{1,64}$/);
const unitKey = z.string().trim().min(1).max(256);

function api() {
  const root = getB2BApiRoot();
  if (!root) throw new B2BError("Business accounts are unavailable.", 503);
  return root;
}

const locale = () => process.env.CTP_B2B_LOCALE || "en-US";
const localized = (value?: Record<string, string>) =>
  value?.[locale()] ||
  value?.[locale().split("-")[0]] ||
  value?.en ||
  Object.values(value ?? {})[0] ||
  "";

function asAssociate(customerId: string, businessUnitKey: string) {
  return api()
    .asAssociate()
    .withAssociateIdValue({ associateId: customerId })
    .inBusinessUnitKeyWithBusinessUnitKeyValue({ businessUnitKey });
}

function mapAddress(address: BaseAddress) {
  return {
    company: address.company ?? "",
    name: [address.firstName, address.lastName].filter(Boolean).join(" "),
    street: [address.streetNumber, address.streetName]
      .filter(Boolean)
      .join(" "),
    city: address.city ?? "",
    region: address.region ?? address.state ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country,
  };
}

function unitAddresses(unit: BusinessUnit): B2BOrderAddress[] {
  return unit.addresses.flatMap((address) =>
    address.id ? [{ id: address.id, ...mapAddress(address) }] : [],
  );
}

function defaultAddressId(unit: BusinessUnit, addresses: B2BOrderAddress[]) {
  return (
    [
      unit.defaultShippingAddressId,
      ...(unit.shippingAddressIds ?? []),
      addresses[0]?.id,
    ].find((id) => id && addresses.some((address) => address.id === id)) ?? ""
  );
}

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `B2B-${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/** The default shipping method that matches the cart's delivery address, if the API client may read one. */
async function matchingShippingMethodId(cartId: string) {
  try {
    const { body } = await api()
      .shippingMethods()
      .matchingCart()
      .get({ queryArgs: { cartId } })
      .execute();
    return (body.results.find((method) => method.isDefault) ?? body.results[0])
      ?.id;
  } catch {
    return undefined; // Orders can be placed without shipping info; the merchant arranges delivery.
  }
}

export async function readB2BCheckout(
  session: B2BSession,
): Promise<B2BCheckout> {
  requireCustomer(session);
  const { unit, store } = await verifiedContext(session);
  const cart = await cartFor(session);
  const addresses = unitAddresses(unit);
  return {
    businessUnit: { key: unit.key, name: unit.name },
    store: { key: store.key, name: localized(store.name) || store.key },
    cart: cart?.lineItems.length ? mapCommercetoolsCart(cart, "b2b") : null,
    addresses,
    defaultAddressId: defaultAddressId(unit, addresses),
  };
}

export async function placeB2BOrder(session: B2BSession, raw: unknown) {
  const input = placeOrderInput.parse(raw);
  const customer = requireCustomer(session);
  const { unit, context } = await verifiedContext(session);
  const cart = await cartFor(session);
  if (!cart?.lineItems.length) throw new B2BError("Your bag is empty.");
  if (cart.version !== input.cartVersion)
    throw new B2BError(
      "Your bag changed while you were checking out. Review it and place the order again.",
      409,
    );
  const address = unit.addresses.find((item) => item.id === input.addressId);
  if (!address)
    throw new B2BError("Choose one of your company’s delivery addresses.");

  const carts = cartRoot(session);
  const delivery = { ...address, id: undefined, key: undefined };
  let { body: updated }: { body: CtCart } = await carts
    .withId({ ID: cart.id })
    .post({
      body: {
        version: cart.version,
        actions: [
          { action: "setShippingAddress", address: delivery },
          { action: "setBillingAddress", address: delivery },
        ],
      },
    })
    .execute();
  const shippingMethodId = await matchingShippingMethodId(updated.id);
  if (shippingMethodId) {
    ({ body: updated } = await carts
      .withId({ ID: updated.id })
      .post({
        body: {
          version: updated.version,
          actions: [
            {
              action: "setShippingMethod",
              shippingMethod: {
                typeId: "shipping-method",
                id: shippingMethodId,
              },
            },
          ],
        },
      })
      .execute());
  }

  const { body: order } = await asAssociate(
    customer.id,
    context.businessUnitKey,
  )
    .orders()
    .post({
      body: {
        cart: { typeId: "cart", id: updated.id },
        version: updated.version,
        orderNumber: orderNumber(),
        purchaseOrderNumber: input.purchaseOrderNumber,
      },
    })
    .execute();
  // The ordered cart cannot be changed again; the next item starts a new bag.
  delete session.cartId;
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? "",
    businessUnitKey: unit.key,
  };
}

async function approvalFor(
  customerId: string,
  businessUnitKey: string,
  id: string,
) {
  try {
    const { body } = await asAssociate(customerId, businessUnitKey)
      .approvalFlows()
      .get({
        queryArgs: { where: `order(id=${JSON.stringify(id)})`, limit: 1 },
      })
      .execute();
    const flow = body.results[0];
    return flow
      ? { id: flow.id, status: flow.status as ApprovalFlowStatus }
      : null;
  } catch {
    return null; // Roles without approval permissions still see their order.
  }
}

export async function readB2BOrder(
  session: B2BSession,
  id: string,
  requestedKey: string,
): Promise<B2BOrderConfirmation> {
  const customer = requireCustomer(session);
  if (!orderId.safeParse(id).success)
    throw new B2BError("Order not found.", 404);
  const key = requestedKey || session.context?.businessUnitKey;
  if (!key) throw new B2BError("Choose a business unit first.");
  const unit = await unitFor(session, unitKey.parse(key));
  const { body: order } = await asAssociate(customer.id, unit.key)
    .orders()
    .withId({ ID: id })
    .get()
    .execute();
  if (order.businessUnit?.key !== unit.key)
    throw new B2BError("Order not found.", 404);
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? "",
    purchaseOrderNumber: order.purchaseOrderNumber ?? "",
    createdAt: order.createdAt,
    orderState: order.orderState,
    businessUnit: { key: unit.key, name: unit.name },
    storeKey: order.store?.key ?? "",
    order: mapCommercetoolsCart(
      { ...order, discountCodes: order.discountCodes ?? [] },
      "b2b",
    ),
    shippingAddress: order.shippingAddress
      ? mapAddress(order.shippingAddress)
      : null,
    shippingMethod: order.shippingInfo?.shippingMethodName ?? "",
    shippingPrice: order.shippingInfo
      ? mapMoney(order.shippingInfo.price, locale())
      : null,
    approval: await approvalFor(customer.id, unit.key, order.id),
  };
}

export function orderErrorResponse(error: unknown) {
  if (error instanceof z.ZodError)
    return {
      status: 400,
      error: error.issues[0]?.message || "Check the order details.",
    };
  if (error instanceof B2BError)
    return { status: error.status, error: error.message };
  const problem = error as {
    statusCode?: number;
    body?: { errors?: { code?: string }[] };
  };
  const code = problem.body?.errors?.[0]?.code;
  if (code === "AssociateMissingPermission" || problem.statusCode === 403)
    return {
      status: 403,
      error:
        "Your role in this business unit does not allow placing or viewing orders.",
    };
  if (code === "ConcurrentModification" || problem.statusCode === 409)
    return {
      status: 409,
      error:
        "Your bag changed while you were checking out. Review it and place the order again.",
    };
  if (code === "MissingTaxRateForCountry")
    return {
      status: 400,
      error:
        "Tax is not configured for this delivery country. Choose another address or contact your account manager.",
    };
  if (problem.statusCode === 404)
    return { status: 404, error: "Order not found." };
  if (problem.statusCode === 400)
    return {
      status: 400,
      error:
        "The order could not be placed. Check the bag and delivery address, then try again.",
    };
  return {
    status: 502,
    error: "The order service is temporarily unavailable. Please try again.",
  };
}
