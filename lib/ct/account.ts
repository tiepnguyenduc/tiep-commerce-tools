import "server-only";
import type {
  AddressDraft,
  CustomerUpdateAction,
} from "@commercetools/platform-sdk";
import { getEnvReadiness } from "../env";
import type {
  CustomerAddress,
  CustomerOrderSummary,
  CustomerProfile,
} from "../types";
import { getApiRoot } from "./client";
import { requireCommerceConfig } from "./context";
import {
  mapCustomerOrder,
  mapCustomerProfile,
} from "./account-mappers";
import {
  clearCustomerSession,
  readCommerceSession,
  setCustomerSession,
} from "./session";

export type ProfileUpdateInput = {
  email: string;
  firstName?: string;
  lastName?: string;
};

export type PasswordUpdateInput = {
  currentPassword: string;
  newPassword: string;
};

export type AddressUpdateInput = CustomerAddress;

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

function trainingProfile(): CustomerProfile {
  const session = readCommerceSession();
  if (!session.customerId || !session.customerEmail) {
    throw new Error("Customer login required.");
  }

  return {
    id: session.customerId,
    email: session.customerEmail,
    firstName: session.customerFirstName,
    lastName: session.customerLastName,
    addresses: [],
  };
}

function normalizeAddress(input: AddressUpdateInput): AddressDraft {
  return {
    country: input.country || "US",
    firstName: input.firstName || undefined,
    lastName: input.lastName || undefined,
    streetName: input.streetName || undefined,
    streetNumber: input.streetNumber || undefined,
    city: input.city || undefined,
    region: input.region || undefined,
    postalCode: input.postalCode || undefined,
    phone: input.phone || undefined,
  };
}

async function fetchLiveCustomer() {
  const customerId = requireCustomerId();
  const response = await requireApiRoot()
    .customers()
    .withId({ ID: customerId })
    .get()
    .execute();
  return response.body;
}

export async function readCustomerProfile(): Promise<CustomerProfile> {
  if (!getEnvReadiness().ready) return trainingProfile();

  const customer = await fetchLiveCustomer();
  setCustomerSession({
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
  });
  return mapCustomerProfile(customer);
}

export async function updateCustomerProfile(
  input: ProfileUpdateInput,
): Promise<CustomerProfile> {
  if (!getEnvReadiness().ready) {
    const session = readCommerceSession();
    if (!session.customerId) throw new Error("Customer login required.");
    setCustomerSession({
      id: session.customerId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    return trainingProfile();
  }

  const customer = await fetchLiveCustomer();
  const actions: CustomerUpdateAction[] = [
    { action: "setFirstName", firstName: input.firstName || undefined },
    { action: "setLastName", lastName: input.lastName || undefined },
    ...(input.email && input.email !== customer.email
      ? [{ action: "changeEmail" as const, email: input.email }]
      : []),
  ];
  const updated = await requireApiRoot()
    .customers()
    .withId({ ID: customer.id })
    .post({ body: { version: customer.version, actions } })
    .execute();

  setCustomerSession({
    id: updated.body.id,
    email: updated.body.email,
    firstName: updated.body.firstName,
    lastName: updated.body.lastName,
  });
  return mapCustomerProfile(updated.body);
}

export async function updateCustomerPassword(input: PasswordUpdateInput) {
  if (!getEnvReadiness().ready) return { changed: true };

  const customer = await fetchLiveCustomer();
  await requireApiRoot()
    .customers()
    .password()
    .post({
      body: {
        id: customer.id,
        version: customer.version,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      },
    })
    .execute();
  return { changed: true };
}

export async function upsertCustomerAddress(
  input: AddressUpdateInput,
): Promise<CustomerProfile> {
  if (!getEnvReadiness().ready) return trainingProfile();

  const customer = await fetchLiveCustomer();
  const address = normalizeAddress(input);
  const action: CustomerUpdateAction = input.id
    ? { action: "changeAddress", addressId: input.id, address }
    : { action: "addAddress", address };
  const updated = await requireApiRoot()
    .customers()
    .withId({ ID: customer.id })
    .post({ body: { version: customer.version, actions: [action] } })
    .execute();

  return mapCustomerProfile(updated.body);
}

export async function removeCustomerAddress(
  addressId: string,
): Promise<CustomerProfile> {
  if (!getEnvReadiness().ready) return trainingProfile();

  const customer = await fetchLiveCustomer();
  const updated = await requireApiRoot()
    .customers()
    .withId({ ID: customer.id })
    .post({
      body: {
        version: customer.version,
        actions: [{ action: "removeAddress", addressId }],
      },
    })
    .execute();

  return mapCustomerProfile(updated.body);
}

export async function listCustomerOrders(): Promise<CustomerOrderSummary[]> {
  if (!getEnvReadiness().ready) return [];

  const customerId = requireCustomerId();
  const { locale } = requireCommerceConfig();
  const response = await requireApiRoot()
    .orders()
    .get({
      queryArgs: {
        where: `customerId="${customerId.replaceAll('"', '\\"')}"`,
        sort: "createdAt desc",
        limit: 20,
      },
    })
    .execute();

  return response.body.results.map((order) => mapCustomerOrder(order, locale));
}

export function logoutCustomer() {
  clearCustomerSession();
}
