import "server-only";
import type {
  Customer,
  CustomerUpdateAction,
} from "@commercetools/platform-sdk";
import { z } from "zod";
import { getB2BApiRoot } from "./client";
import { B2BError, requireCustomer, assertMember, unitStores } from "./b2b";
import type { B2BSession } from "../b2b/session";
import type { B2BAccountProfile } from "../b2b/account-types";
const text = z.string().trim().max(200);
const address = z
  .object({
    id: text.min(1).optional(),
    company: text.min(1, "Company name is required."),
    firstName: text.min(1),
    lastName: text.min(1),
    streetName: text.min(1),
    streetNumber: text.optional(),
    city: text.min(1),
    region: text.optional(),
    postalCode: text.min(1),
    country: z.string().regex(/^[A-Z]{2}$/),
    phone: text.optional(),
  })
  .strict();
export const accountAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("update-profile"),
      email: z.string().trim().email().max(254),
      firstName: text,
      lastName: text,
    })
    .strict(),
  z
    .object({
      action: z.literal("change-password"),
      currentPassword: z.string().min(1).max(256),
      newPassword: z.string().min(8).max(256),
    })
    .strict(),
  z
    .object({
      action: z.literal("save-address"),
      address,
      defaultShipping: z.boolean().optional(),
      defaultBilling: z.boolean().optional(),
    })
    .strict(),
  z
    .object({ action: z.literal("delete-address"), addressId: text.min(1) })
    .strict(),
  z
    .object({
      action: z.literal("set-default-address"),
      addressId: text.min(1),
      kind: z.enum(["shipping", "billing"]),
    })
    .strict(),
]);
export const deleteAccountInput = z
  .object({
    password: z.string().min(1).max(256),
    confirmation: z.literal("DELETE"),
  })
  .strict();
function api() {
  const root = getB2BApiRoot();
  if (!root) throw new B2BError("Business accounts are unavailable.", 503);
  return root;
}
async function customerFor(session: B2BSession) {
  return (
    await api()
      .customers()
      .withId({ ID: requireCustomer(session).id })
      .get()
      .execute()
  ).body;
}
function sync(session: B2BSession, c: Customer) {
  session.customer = {
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
  };
}
export async function readBusinessAccount(
  session: B2BSession,
): Promise<B2BAccountProfile> {
  const customer = await customerFor(session);
  const { body: project } = await api().get().execute();
  const companies: B2BAccountProfile["companies"] = [];
  for (let offset = 0; ; offset += 100) {
    const { body } = await api()
      .businessUnits()
      .get({
        queryArgs: {
          where: `status="Active" and (associates(customer(id=${JSON.stringify(customer.id)})) or inheritedAssociates(customer(id=${JSON.stringify(customer.id)})))`,
          limit: 100,
          offset,
        },
      })
      .execute();
    for (const unit of body.results) {
      try {
        assertMember(unit, customer.id);
      } catch {
        continue;
      }
      const members = [
        ...unit.associates,
        ...(unit.inheritedAssociates || []),
      ].filter((a) => a.customer.id === customer.id);
      companies.push({
        key: unit.key,
        name: unit.name,
        roles: [
          ...new Set(
            members.flatMap((a) =>
              a.associateRoleAssignments.map((r) => r.associateRole.key),
            ),
          ),
        ],
        stores: unitStores(unit).map((s) => s.key),
      });
    }
    if (body.results.length < 100) break;
  }
  sync(session, customer);
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName || "",
    lastName: customer.lastName || "",
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      company: a.company || "",
      firstName: a.firstName,
      lastName: a.lastName,
      streetName: a.streetName || "",
      streetNumber: a.streetNumber,
      city: a.city || "",
      region: a.region ?? a.state,
      postalCode: a.postalCode || "",
      country: a.country,
      phone: a.phone,
    })),
    defaultShippingAddressId: customer.defaultShippingAddressId,
    defaultBillingAddressId: customer.defaultBillingAddressId,
    countries: project.countries,
    companies,
  };
}
export async function mutateBusinessAccount(session: B2BSession, raw: unknown) {
  const input = accountAction.parse(raw);
  const customer = await customerFor(session);
  const root = api();
  let actions: CustomerUpdateAction[] = [];
  if (input.action === "change-password") {
    const { body } = await root
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
    delete session.customer;
    delete session.context;
    delete session.cartId;
    return;
  }
  if (input.action === "update-profile")
    actions = [
      { action: "changeEmail", email: input.email },
      { action: "setFirstName", firstName: input.firstName },
      { action: "setLastName", lastName: input.lastName },
    ];
  else {
    const id =
      input.action === "save-address" ? input.address.id : input.addressId;
    if (id && !customer.addresses.some((a) => a.id === id))
      throw new B2BError("This address does not belong to your account.", 404);
    if (input.action === "save-address") {
      const { body: project } = await root.get().execute();
      const existing = customer.addresses.find((address) => address.id === id);
      if (
        !project.countries.includes(input.address.country) &&
        existing?.country !== input.address.country
      )
        throw new B2BError(
          "Choose a country supported by this business storefront.",
          400,
        );
      const { id: _, ...draft } = input.address;
      const { id: existingId, ...existingFields } = existing ?? {};
      const updatedAddress = {
        ...existingFields,
        ...draft,
        // Existing state-only addresses use the same region control in the UI.
        ...(existing?.state && !existing.region && draft.region !== undefined
          ? { state: draft.region }
          : {}),
      };
      // A unique address key lets defaults refer to a newly added address atomically.
      const key = `personal-${crypto.randomUUID()}`;
      actions.push(
        id
          ? { action: "changeAddress", addressId: id, address: updatedAddress }
          : { action: "addAddress", address: { ...draft, key } },
      );
      if (input.defaultShipping)
        actions.push({
          action: "setDefaultShippingAddress",
          ...(id ? { addressId: id } : { addressKey: key }),
        });
      if (
        input.defaultShipping === false &&
        id &&
        customer.defaultShippingAddressId === id
      )
        actions.push({ action: "setDefaultShippingAddress" });
      if (input.defaultBilling)
        actions.push({
          action: "setDefaultBillingAddress",
          ...(id ? { addressId: id } : { addressKey: key }),
        });
      if (
        input.defaultBilling === false &&
        id &&
        customer.defaultBillingAddressId === id
      )
        actions.push({ action: "setDefaultBillingAddress" });
    } else if (input.action === "delete-address")
      actions = [{ action: "removeAddress", addressId: input.addressId }];
    else
      actions = [
        {
          action:
            input.kind === "shipping"
              ? "setDefaultShippingAddress"
              : "setDefaultBillingAddress",
          addressId: input.addressId,
        },
      ];
  }
  const { body } = await root
    .customers()
    .withId({ ID: customer.id })
    .post({ body: { version: customer.version, actions } })
    .execute();
  sync(session, body);
}
export async function deleteBusinessAccount(session: B2BSession, raw: unknown) {
  const input = deleteAccountInput.parse(raw);
  const customer = await customerFor(session);
  const { body: login } = await api()
    .login()
    .post({ body: { email: customer.email, password: input.password } })
    .execute();
  if (login.customer.id !== customer.id)
    throw new B2BError("Account verification failed.", 403);
  await api()
    .customers()
    .withId({ ID: customer.id })
    .delete({ queryArgs: { version: customer.version } })
    .execute();
  delete session.customer;
  delete session.context;
  delete session.cartId;
}
