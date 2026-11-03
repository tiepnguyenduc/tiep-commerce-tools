import "server-only";
import type {
  CustomerDraft,
  CustomerSignin,
} from "@commercetools/platform-sdk";
import { getEnvReadiness } from "../env";
import { getApiRoot } from "./client";
import { getCartId, setCartId, setCustomerSession } from "./session";

export type CustomerAuthInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

function requireApiRoot() {
  const apiRoot = getApiRoot();
  if (!apiRoot || !getEnvReadiness().ready) {
    throw new Error("commercetools API is not configured.");
  }
  return apiRoot;
}

function mapCustomerResult(result: {
  customer: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  cart?: { id: string };
}) {
  setCustomerSession({
    id: result.customer.id,
    email: result.customer.email,
    firstName: result.customer.firstName,
    lastName: result.customer.lastName,
  });
  setCartId("b2c", result.cart?.id);

  return {
    id: result.customer.id,
    email: result.customer.email,
    firstName: result.customer.firstName,
    lastName: result.customer.lastName,
    activeCartId: result.cart?.id,
  };
}

// Only an active, unowned cart can be passed as anonymousCart.
async function getAnonymousCartId() {
  const cartId = getCartId("b2c");
  if (!cartId) return undefined;
  try {
    const { body: cart } = await requireApiRoot()
      .carts()
      .withId({ ID: cartId })
      .get()
      .execute();
    return !cart.customerId && cart.cartState === "Active"
      ? cart.id
      : undefined;
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) return undefined;
    throw error;
  }
}

export async function loginCustomer(input: CustomerAuthInput) {
  const anonymousCartId = await getAnonymousCartId();
  const body: CustomerSignin = {
    email: input.email,
    password: input.password,
    ...(anonymousCartId
      ? {
          anonymousCart: { typeId: "cart", id: anonymousCartId },
          anonymousCartSignInMode: "MergeWithExistingCustomerCart",
        }
      : {}),
  };

  const response = await requireApiRoot().login().post({ body }).execute();
  return mapCustomerResult(response.body);
}

export async function registerCustomer(input: CustomerAuthInput) {
  const anonymousCartId = await getAnonymousCartId();
  const body: CustomerDraft = {
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    ...(anonymousCartId
      ? { anonymousCart: { typeId: "cart", id: anonymousCartId } }
      : {}),
  };

  const response = await requireApiRoot().customers().post({ body }).execute();
  return mapCustomerResult(response.body);
}
