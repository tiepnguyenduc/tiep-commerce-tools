import "server-only";
import type {
  AssociateRoleAssignmentDraft,
  BaseAddress,
  BusinessUnit,
  BusinessUnitUpdateAction,
} from "@commercetools/platform-sdk";
import { z } from "zod";
import type { B2BSession } from "../b2b/session";
import type { CompanyWorkspace } from "../b2b/company-types";
import { getB2BApiRoot } from "./client";
import { assertMember, B2BError, requireCustomer, unitStores } from "./b2b";

const shortText = z.string().trim().max(200);
const unitKey = z.string().trim().min(1).max(256);
const companyAddress = z.object({
  id: shortText.optional(),
  company: shortText,
  streetName: shortText.min(1, "Street address is required."),
  streetNumber: shortText.optional(),
  city: shortText.min(1, "City is required."),
  region: shortText.optional(),
  postalCode: shortText.min(1, "Postal code is required."),
  country: z.string().regex(/^[A-Z]{2}$/),
});

export const companyAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update-unit"),
    businessUnitKey: unitKey,
    name: shortText.min(2),
    email: z.string().trim().email().max(254),
  }),
  z.object({
    action: z.literal("save-address"),
    businessUnitKey: unitKey,
    address: companyAddress,
  }),
  z.object({
    action: z.literal("remove-address"),
    businessUnitKey: unitKey,
    addressId: shortText.min(1),
  }),
  z.object({
    action: z.literal("save-associate"),
    businessUnitKey: unitKey,
    customerId: shortText.optional(),
    email: z.string().trim().email().max(254),
    roleKeys: z.array(shortText.min(1)).min(1),
  }),
  z.object({
    action: z.literal("remove-associate"),
    businessUnitKey: unitKey,
    customerId: shortText.min(1),
  }),
  z.object({
    action: z.literal("create-unit"),
    parentKey: unitKey,
    name: shortText.min(2),
    email: z.string().trim().email().max(254),
  }),
]);

function api() {
  const root = getB2BApiRoot();
  if (!root) throw new B2BError("Business accounts are unavailable.", 503);
  return root;
}

export async function memberUnits(customerId: string) {
  const units: BusinessUnit[] = [];
  for (let offset = 0; ; offset += 100) {
    const { body } = await api().businessUnits().get({
      queryArgs: {
        where: `status=\"Active\" and (associates(customer(id=${JSON.stringify(customerId)})) or inheritedAssociates(customer(id=${JSON.stringify(customerId)})))`,
        limit: 100,
        offset,
      },
    }).execute();
    units.push(...body.results);
    if (body.results.length < 100) break;
  }
  return units.filter((unit) => {
    try { assertMember(unit, customerId); return true; } catch { return false; }
  });
}

export async function unitFor(session: B2BSession, key: string) {
  const customer = requireCustomer(session);
  const { body } = await api().asAssociate()
    .withAssociateIdValue({ associateId: customer.id })
    .businessUnits().withKey({ key }).get().execute();
  assertMember(body, customer.id);
  return body;
}

export async function permissions(unit: BusinessUnit, customerId: string) {
  const keys = [...unit.associates, ...(unit.inheritedAssociates ?? [])]
    .filter((associate) => associate.customer.id === customerId)
    .flatMap((associate) => associate.associateRoleAssignments.map((assignment) => assignment.associateRole.key));
  const roles = await Promise.all([...new Set(keys)].map((key) =>
    api().associateRoles().withKey({ key }).get().execute(),
  ));
  return new Set(roles.flatMap(({ body }) => body.permissions));
}

export async function readCompanyWorkspace(session: B2BSession): Promise<CompanyWorkspace> {
  const customer = requireCustomer(session);
  const [units, rolePage, project] = await Promise.all([
    memberUnits(customer.id),
    api().associateRoles().get({ queryArgs: { limit: 100, sort: "name asc" } }).execute(),
    api().get().execute(),
  ]);
  const customerIds = [...new Set(units.flatMap((unit) =>
    [...unit.associates, ...(unit.inheritedAssociates ?? [])].map((associate) => associate.customer.id),
  ))];
  const customers = customerIds.length
    ? (await api().customers().get({
        queryArgs: { where: `id in (${customerIds.map((id) => JSON.stringify(id)).join(",")})`, limit: 500 },
      }).execute()).body.results
    : [];
  const customerById = new Map(customers.map((item) => [item.id, item]));
  return {
    countries: project.body.countries,
    roles: rolePage.body.results.map((role) => ({ key: role.key, name: role.name || role.key })),
    units: await Promise.all(units.map(async (unit) => {
      const allowed = await permissions(unit, customer.id);
      return {
        key: unit.key,
        name: unit.name,
        email: unit.contactEmail ?? "",
        unitType: unit.unitType,
        parentKey: unit.parentUnit?.key ?? "",
        stores: unitStores(unit).map((store) => store.key),
        canEditDetails: allowed.has("UpdateBusinessUnitDetails"),
        canManageAssociates: allowed.has("UpdateAssociates"),
        canAddChildUnits: allowed.has("AddChildUnits"),
        addresses: unit.addresses.map((address) => ({
          id: address.id ?? "",
          company: address.company ?? unit.name,
          streetName: address.streetName ?? "",
          streetNumber: address.streetNumber ?? "",
          city: address.city ?? "",
          region: address.region ?? address.state ?? "",
          postalCode: address.postalCode ?? "",
          country: address.country,
        })),
        associates: [
          ...unit.associates.map((associate) => ({ associate, inherited: false })),
          ...(unit.inheritedAssociates ?? []).map((associate) => ({ associate, inherited: true })),
        ].map(({ associate, inherited }) => {
          const item = customerById.get(associate.customer.id);
          return {
            customerId: associate.customer.id,
            name: [item?.firstName, item?.lastName].filter(Boolean).join(" ") || item?.email || "Associate",
            email: item?.email ?? "",
            roleKeys: associate.associateRoleAssignments.map((assignment) => assignment.associateRole.key),
            inherited,
          };
        }),
      };
    })),
  };
}

function addressDraft(input: z.infer<typeof companyAddress>): BaseAddress {
  return {
    company: input.company || undefined,
    streetName: input.streetName,
    streetNumber: input.streetNumber || undefined,
    city: input.city,
    region: input.region || undefined,
    postalCode: input.postalCode,
    country: input.country,
  };
}

function assignments(roleKeys: string[]): AssociateRoleAssignmentDraft[] {
  return [...new Set(roleKeys)].map((key) => ({
    associateRole: { typeId: "associate-role", key },
    inheritance: "Enabled",
  }));
}

export async function mutateCompanyWorkspace(session: B2BSession, raw: unknown) {
  const input = companyAction.parse(raw);
  const customer = requireCustomer(session);
  if (input.action === "create-unit") {
    const parent = await unitFor(session, input.parentKey);
    await api().asAssociate().withAssociateIdValue({ associateId: customer.id })
      .businessUnits().post({ body: {
        unitType: "Division",
        key: `division-${crypto.randomUUID()}`,
        name: input.name,
        contactEmail: input.email,
        status: "Active",
        parentUnit: { typeId: "business-unit", key: parent.key },
        storeMode: "FromParent",
        associateMode: "ExplicitAndFromParent",
      }}).execute();
    return;
  }
  const unit = await unitFor(session, input.businessUnitKey);
  const actions: BusinessUnitUpdateAction[] = [];
  if (input.action === "update-unit") {
    if (input.name !== unit.name) actions.push({ action: "changeName", name: input.name });
    if (input.email !== (unit.contactEmail ?? "")) actions.push({ action: "setContactEmail", contactEmail: input.email });
  } else if (input.action === "save-address") {
    if (input.address.id) {
      if (!unit.addresses.some((item) => item.id === input.address.id)) throw new B2BError("Address not found.", 404);
      actions.push({ action: "changeAddress", addressId: input.address.id, address: addressDraft(input.address) });
    } else actions.push({ action: "addAddress", address: addressDraft(input.address) });
  } else if (input.action === "remove-address") {
    if (!unit.addresses.some((item) => item.id === input.addressId)) throw new B2BError("Address not found.", 404);
    actions.push({ action: "removeAddress", addressId: input.addressId });
  } else if (input.action === "remove-associate") {
    if (input.customerId === customer.id) throw new B2BError("You cannot remove yourself from the active business unit.");
    actions.push({ action: "removeAssociate", customer: { typeId: "customer", id: input.customerId } });
  } else {
    const target = input.customerId
      ? (await api().customers().withId({ ID: input.customerId }).get().execute()).body
      : (await api().customers().get({ queryArgs: { where: `email=${JSON.stringify(input.email)}`, limit: 1 } }).execute()).body.results[0];
    if (!target) throw new B2BError("The associate must register an account with this email first.", 404);
    const draft = { customer: { typeId: "customer" as const, id: target.id }, associateRoleAssignments: assignments(input.roleKeys) };
    actions.push({ action: input.customerId ? "changeAssociate" : "addAssociate", associate: draft });
  }
  if (!actions.length) return;
  await api().asAssociate().withAssociateIdValue({ associateId: customer.id })
    .businessUnits().withKey({ key: unit.key })
    .post({ body: { version: unit.version, actions } }).execute();
}
