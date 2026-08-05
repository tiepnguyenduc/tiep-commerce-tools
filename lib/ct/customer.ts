import "server-only";
import type { CustomerDraft, CustomerSignin } from "@commercetools/platform-sdk";
import { getEnvReadiness } from "../env";
import { apiRoot } from "./client";
import { getCartId, setCartId, setCustomerSession } from "./session";

export type CustomerAuthInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

function requireApiRoot() {
  if (!apiRoot || !getEnvReadiness().ready) {
    throw new Error("commercetools API is not configured.");
  }
  return apiRoot;
}

function mapCustomerResult(result: {
  customer: { id: string; email: string; firstName?: string; lastName?: string };
  cart?: { id: string };
}) {
  setCustomerSession({ id: result.customer.id, email: result.customer.email });
  if (result.cart?.id) setCartId("b2c", result.cart.id);

  return {
    id: result.customer.id,
    email: result.customer.email,
    firstName: result.customer.firstName,
    lastName: result.customer.lastName,
    activeCartId: result.cart?.id,
  };
}

export async function loginCustomer(input: CustomerAuthInput) {
  const anonymousCartId = getCartId("b2c");
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
  const anonymousCartId = getCartId("b2c");
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
