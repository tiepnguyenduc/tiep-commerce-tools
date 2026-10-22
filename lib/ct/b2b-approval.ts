import "server-only";
import type {
  ApprovalFlow,
  BaseAddress,
  BusinessUnit,
  TypedMoney,
} from "@commercetools/platform-sdk";
import { z } from "zod";
import type { B2BSession } from "../b2b/session";
import type {
  ApprovalFlowDetail,
  ApprovalFlowList,
  ApprovalFlowPerson,
  ApprovalFlowStatus,
  ApprovalFlowSummary,
} from "../b2b/approval-types";
import { getB2BApiRoot } from "./client";
import { mapMoney } from "./mappers";
import { B2BError, requireCustomer } from "./b2b";
import { memberUnits, unitFor } from "./b2b-company";

const unitKey = z.string().trim().min(1).max(256);
const flowId = z.string().regex(/^[a-zA-Z0-9-]{1,64}$/);
const maxFlows = 500;

export const approvalDecision = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), businessUnitKey: unitKey }),
  z.object({
    action: z.literal("reject"),
    businessUnitKey: unitKey,
    reason: z.string().trim().min(1, "Add a reason for the rejection.").max(500),
  }),
]);

function api() {
  const root = getB2BApiRoot();
  if (!root) throw new B2BError("Business accounts are unavailable.", 503);
  return root;
}

const locale = () => process.env.CTP_B2B_LOCALE || "en-US";
const localized = (value?: Record<string, string>) =>
  value?.[locale()] || value?.[locale().split("-")[0]] || value?.en || Object.values(value ?? {})[0] || "";
const money = (value?: TypedMoney) => (value ? mapMoney(value, locale()) : null);

function flowsIn(customerId: string, businessUnitKey: string) {
  return api().asAssociate().withAssociateIdValue({ associateId: customerId })
    .inBusinessUnitKeyWithBusinessUnitKeyValue({ businessUnitKey })
    .approvalFlows();
}

function parseId(id: string) {
  if (!flowId.safeParse(id).success) throw new B2BError("Approval flow not found.", 404);
  return id;
}

function roleKeys(unit: BusinessUnit, customerId: string) {
  return new Set([...unit.associates, ...(unit.inheritedAssociates ?? [])]
    .filter((associate) => associate.customer.id === customerId)
    .flatMap((associate) => associate.associateRoleAssignments.map((assignment) => assignment.associateRole.key)));
}

function summary(flow: ApprovalFlow, unit: BusinessUnit, roles: Set<string>): ApprovalFlowSummary {
  const order = flow.order.obj;
  return {
    id: flow.id,
    status: flow.status as ApprovalFlowStatus,
    createdAt: flow.createdAt,
    businessUnitKey: unit.key,
    businessUnitName: unit.name,
    orderId: flow.order.id,
    orderNumber: order?.orderNumber ?? "",
    itemCount: order?.lineItems.reduce((count, line) => count + line.quantity, 0) ?? 0,
    total: money(order?.totalPrice),
    canDecide: flow.status === "Pending" && flow.eligibleApprovers.some((approver) => roles.has(approver.associateRole.key)),
  };
}

function address(value?: BaseAddress) {
  if (!value) return null;
  return {
    company: value.company ?? "",
    name: [value.firstName, value.lastName].filter(Boolean).join(" "),
    street: [value.streetNumber, value.streetName].filter(Boolean).join(" "),
    city: value.city ?? "",
    region: value.region ?? value.state ?? "",
    postalCode: value.postalCode ?? "",
    country: value.country,
  };
}

async function people(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const customers = unique.length
    ? (await api().customers().get({
        queryArgs: { where: `id in (${unique.map((id) => JSON.stringify(id)).join(",")})`, limit: 500 },
      }).execute()).body.results
    : [];
  const byId = new Map(customers.map((customer) => [customer.id, customer]));
  return (id?: string): ApprovalFlowPerson => {
    const customer = id ? byId.get(id) : undefined;
    return {
      name: [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || customer?.email || "Associate",
      email: customer?.email ?? "",
    };
  };
}

async function roleNames(keys: string[]) {
  const unique = [...new Set(keys)];
  if (!unique.length) return [];
  const { body } = await api().associateRoles().get({
    queryArgs: { where: `key in (${unique.map((key) => JSON.stringify(key)).join(",")})`, limit: 100 },
  }).execute();
  const byKey = new Map(body.results.map((role) => [role.key, role.name || role.key]));
  return unique.map((key) => byKey.get(key) ?? key);
}

async function detail(flow: ApprovalFlow, unit: BusinessUnit, customerId: string): Promise<ApprovalFlowDetail> {
  const roles = roleKeys(unit, customerId);
  const order = flow.order.obj;
  const [person, awaitingRoles] = await Promise.all([
    people([
      order?.customerId ?? "",
      ...flow.approvals.map((approval) => approval.approver.customer.id),
      flow.rejection?.rejecter.customer.id ?? "",
    ]),
    roleNames(flow.status === "Pending" ? flow.currentTierPendingApprovers.map((approver) => approver.associateRole.key) : []),
  ]);
  const lineTotal = order?.lineItems.reduce((sum, line) => sum + line.totalPrice.centAmount, 0);
  return {
    ...summary(flow, unit, roles),
    lastModifiedAt: flow.lastModifiedAt,
    requester: order?.customerId ? person(order.customerId) : null,
    rules: flow.rules.map((rule) => ({ name: rule.name, description: rule.description ?? "" })),
    approvals: flow.approvals
      .map((approval) => ({ ...person(approval.approver.customer.id), at: approval.approvedAt }))
      .sort((a, b) => a.at.localeCompare(b.at)),
    rejection: flow.rejection
      ? { ...person(flow.rejection.rejecter.customer.id), at: flow.rejection.rejectedAt, reason: flow.rejection.reason ?? "" }
      : null,
    awaitingRoles,
    canApprove: flow.status === "Pending" && flow.currentTierPendingApprovers.some((approver) => roles.has(approver.associateRole.key)),
    lineItems: (order?.lineItems ?? []).map((line) => ({
      id: line.id,
      name: localized(line.name),
      sku: line.variant.sku ?? "",
      image: line.variant.images?.[0]?.url ?? "",
      quantity: line.quantity,
      unitPrice: money(line.price.discounted?.value ?? line.price.value),
      total: money(line.totalPrice),
    })),
    subtotal: order && lineTotal !== undefined ? money({ ...order.totalPrice, centAmount: lineTotal }) : null,
    shipping: money(order?.shippingInfo?.price),
    tax: money(order?.taxedPrice?.totalTax),
    shippingAddress: address(order?.shippingAddress),
  };
}

export async function listApprovalFlows(session: B2BSession, requestedKey?: string | null): Promise<ApprovalFlowList> {
  const customer = requireCustomer(session);
  const units = await memberUnits(customer.id);
  if (requestedKey && !units.some((unit) => unit.key === requestedKey))
    throw new B2BError("This business unit is not available to your account.", 403);
  const key = [requestedKey, session.context?.businessUnitKey, units[0]?.key]
    .find((candidate) => candidate && units.some((unit) => unit.key === candidate));
  const options = units.map((unit) => ({ key: unit.key, name: unit.name }));
  const unit = units.find((item) => item.key === key);
  if (!unit) return { units: options, businessUnitKey: "", flows: [] };
  const roles = roleKeys(unit, customer.id);
  const flows: ApprovalFlow[] = [];
  for (let offset = 0; offset < maxFlows; offset += 100) {
    const { body } = await flowsIn(customer.id, unit.key).get({
      queryArgs: { expand: ["order"], sort: ["createdAt desc"], limit: 100, offset },
    }).execute();
    flows.push(...body.results);
    if (body.results.length < 100) break;
  }
  return { units: options, businessUnitKey: unit.key, flows: flows.map((flow) => summary(flow, unit, roles)) };
}

async function fetchFlow(session: B2BSession, id: string, businessUnitKey: string) {
  const customer = requireCustomer(session);
  const key = businessUnitKey || session.context?.businessUnitKey;
  if (!key) throw new B2BError("Choose a business unit first.");
  const unit = await unitFor(session, unitKey.parse(key));
  const { body: flow } = await flowsIn(customer.id, unit.key).withId({ ID: parseId(id) })
    .get({ queryArgs: { expand: ["order"] } }).execute();
  if (flow.businessUnit.key !== unit.key) throw new B2BError("Approval flow not found.", 404);
  return { customer, unit, flow };
}

export async function readApprovalFlow(session: B2BSession, id: string, businessUnitKey: string) {
  const { customer, unit, flow } = await fetchFlow(session, id, businessUnitKey);
  return detail(flow, unit, customer.id);
}

export async function decideApprovalFlow(session: B2BSession, id: string, raw: unknown) {
  const input = approvalDecision.parse(raw);
  const { customer, unit, flow } = await fetchFlow(session, id, input.businessUnitKey);
  if (flow.status !== "Pending")
    throw new B2BError(`This approval flow has already been ${flow.status.toLowerCase()}.`, 409);
  const { body } = await flowsIn(customer.id, unit.key).withId({ ID: flow.id }).post({
    queryArgs: { expand: ["order"] },
    body: {
      version: flow.version,
      actions: [input.action === "approve" ? { action: "approve" } : { action: "reject", reason: input.reason }],
    },
  }).execute();
  return detail(body, unit, customer.id);
}

export function approvalErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) return { status: 400, error: error.issues[0]?.message || "Check the request." };
  if (error instanceof B2BError) return { status: error.status, error: error.message };
  const problem = error as { statusCode?: number; body?: { errors?: { code?: string }[] } };
  const code = problem.body?.errors?.[0]?.code;
  if (code === "AssociateMissingPermission" || problem.statusCode === 403)
    return { status: 403, error: "Your role does not allow access to these approval flows." };
  if (problem.statusCode === 404) return { status: 404, error: "Approval flow not found." };
  if (code === "ConcurrentModification" || problem.statusCode === 409)
    return { status: 409, error: "The approval flow changed. Refresh and try again." };
  if (problem.statusCode === 400)
    return { status: 400, error: "Your role cannot make a decision on this approval flow right now." };
  return { status: 502, error: "Approval flows could not be loaded. Please try again." };
}
