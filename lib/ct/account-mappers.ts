import type {
  Address,
  Customer,
  Order,
  ShoppingList,
  ShoppingListLineItem,
} from "@commercetools/platform-sdk";
import type {
  CustomerAddress,
  CustomerOrderSummary,
  CustomerProfile,
  Wishlist,
  WishlistLine,
} from "../types";
import { mapMoney } from "./mappers";

const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23f3f0ea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23847b6d' font-family='Arial' font-size='28'%3EProduct image%3C/text%3E%3C/svg%3E";

function localized(
  value: Record<string, string> | undefined,
  locale: string,
  fallback = "",
) {
  return value?.[locale] || value?.en || Object.values(value ?? {})[0] || fallback;
}

export function mapCustomerAddress(address: Address): CustomerAddress {
  return {
    id: address.id,
    firstName: address.firstName,
    lastName: address.lastName,
    streetName: address.streetName,
    streetNumber: address.streetNumber,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
  };
}

export function mapCustomerProfile(customer: Customer): CustomerProfile {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    addresses: customer.addresses.map(mapCustomerAddress),
  };
}

export function mapCustomerOrder(
  order: Pick<
    Order,
    "id" | "orderNumber" | "createdAt" | "orderState" | "lineItems" | "totalPrice"
  >,
  locale = "en-US",
): CustomerOrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber || order.id,
    createdAt: order.createdAt,
    orderState: order.orderState,
    lineCount: order.lineItems.reduce((sum, line) => sum + line.quantity, 0),
    total: mapMoney(order.totalPrice, locale),
  };
}

function lineVariant(line: ShoppingListLineItem) {
  return line.variant;
}

function mapWishlistLine(line: ShoppingListLineItem, locale: string): WishlistLine {
  const variant = lineVariant(line);
  return {
    id: line.id,
    productId: line.productId,
    variantId: line.variantId,
    sku: variant?.sku || line.productId,
    name: localized(line.name, locale, "Wishlist item"),
    image: variant?.images?.[0]?.url || fallbackImage,
    quantity: line.quantity,
  };
}

export function mapWishlist(list: ShoppingList, locale = "en-US"): Wishlist {
  return {
    id: list.id,
    version: list.version,
    name: localized(list.name, locale, "My Wishlist"),
    lines: list.lineItems.map((line) => mapWishlistLine(line, locale)),
  };
}
