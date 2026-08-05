import "server-only";
import type { StoreMode } from "../types";

export type CommerceSession = {
  b2cCartId?: string;
  b2bCartId?: string;
  customerId?: string;
  customerEmail?: string;
};

declare global {
  var __commerceSession: CommerceSession | undefined;
}

export function readCommerceSession() {
  return (globalThis.__commerceSession ??= {});
}

export function setCartId(mode: StoreMode, cartId?: string) {
  const session = readCommerceSession();
  if (mode === "b2b") session.b2bCartId = cartId;
  else session.b2cCartId = cartId;
  return session;
}

export function getCartId(mode: StoreMode) {
  const session = readCommerceSession();
  return mode === "b2b" ? session.b2bCartId : session.b2cCartId;
}

export function setCustomerSession(customer: { id: string; email: string }) {
  const session = readCommerceSession();
  session.customerId = customer.id;
  session.customerEmail = customer.email;
  return session;
}
