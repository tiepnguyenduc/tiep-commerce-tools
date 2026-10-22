import "server-only";
import type {
  ApprovalRule,
  ApprovalRuleUpdateAction,
  ApproverHierarchyDraft,
  RuleRequesterDraft,
} from "@commercetools/platform-sdk";
import { z } from "zod";
import type { B2BSession } from "../b2b/session";
import type { ApprovalRuleView, ApprovalRuleWorkspace } from "../b2b/approval-types";
import { getB2BApiRoot } from "./client";
import { B2BError, requireCustomer } from "./b2b";
import { memberUnits, permissions, unitFor } from "./b2b-company";

const unitKey = z.string().trim().min(1).max(256);
const roleKey = z.string().trim().min(1).max(256);
const ruleId = z.string().regex(/^[a-zA-Z0-9-]{1,64}$/);

export const approvalRuleInput = z.object({
  businessUnitKey: unitKey,
  id: ruleId.optional(),
  version: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Rule name is required.").max(200),
  description: z.string().trim().max(500).default(""),
  status: z.enum(["Active", "Inactive"]),
  predicate: z.string().trim().min(1, "Add at least one condition.").max(2000),
  requesters: z.array(roleKey).min(1, "Select at least one requester role."),
  tiers: z.array(z.object({
    and: z.array(z.object({ or: z.array(roleKey).min(1, "Each approval group needs a role.") })).min(1, "Each tier needs an approver."),
  })).min(1, "Add at least one approver tier.").max(10),
});

function api() {
  const root = getB2BApiRoot();
  if (!root) throw new B2BError("Business accounts are unavailable.", 503);
  return root;
}

function rulesIn(customerId: string, businessUnitKey: string) {
  return api().asAssociate().withAssociateIdValue({ associateId: customerId })
    .inBusinessUnitKeyWithBusinessUnitKeyValue({ businessUnitKey })
    .approvalRules();
}

const currency = (session: B2BSession) => session.context?.currency || process.env.CTP_B2B_CURRENCY || "USD";

function view(rule: ApprovalRule): ApprovalRuleView {
  return {
    id: rule.id,
    version: rule.version,
    name: rule.name,
    description: rule.description ?? "",
    status: rule.status === "Active" ? "Active" : "Inactive",
    predicate: rule.predicate,
    requesters: rule.requesters.map((requester) => requester.associateRole.key),
    tiers: rule.approvers.tiers.map((tier) => ({
      and: tier.and.map((group) => ({ or: group.or.map((approver) => approver.associateRole.key) })),
    })),
    lastModifiedAt: rule.lastModifiedAt,
  };
}

async function roles() {
  const { body } = await api().associateRoles().get({ queryArgs: { limit: 100, sort: "name asc" } }).execute();
  return body.results.map((role) => ({ key: role.key, name: role.name || role.key }));
}

export async function readApprovalRules(session: B2BSession, requestedKey?: string | null): Promise<ApprovalRuleWorkspace> {
  const customer = requireCustomer(session);
  const units = await memberUnits(customer.id);
  if (requestedKey && !units.some((unit) => unit.key === requestedKey))
    throw new B2BError("This business unit is not available to your account.", 403);
  const key = [requestedKey, session.context?.businessUnitKey, units[0]?.key]
    .find((candidate) => candidate && units.some((unit) => unit.key === candidate));
  const unit = units.find((item) => item.key === key);
  const base = { units: units.map((item) => ({ key: item.key, name: item.name })), currency: currency(session) };
  if (!unit) return { ...base, businessUnitKey: "", roles: [], canCreate: false, canUpdate: false, rules: [] };
  const [allowed, roleList] = await Promise.all([permissions(unit, customer.id), roles()]);
  const rules: ApprovalRule[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const { body } = await rulesIn(customer.id, unit.key).get({ queryArgs: { sort: ["createdAt desc"], limit: 100, offset } }).execute();
    rules.push(...body.results);
    if (body.results.length < 100) break;
  }
  return {
    ...base,
    businessUnitKey: unit.key,
    roles: roleList,
    canCreate: allowed.has("CreateApprovalRules"),
    canUpdate: allowed.has("UpdateApprovalRules"),
    rules: rules.map(view),
  };
}

export async function readApprovalRule(session: B2BSession, id: string, businessUnitKey: string) {
  const customer = requireCustomer(session);
  if (!ruleId.safeParse(id).success) throw new B2BError("Approval rule not found.", 404);
  const unit = await unitFor(session, unitKey.parse(businessUnitKey || session.context?.businessUnitKey || ""));
  const [{ body: rule }, allowed, roleList] = await Promise.all([
    rulesIn(customer.id, unit.key).withId({ ID: id }).get().execute(),
    permissions(unit, customer.id),
    roles(),
  ]);
  if (rule.businessUnit.key !== unit.key) throw new B2BError("Approval rule not found.", 404);
  return {
    rule: view(rule),
    businessUnitKey: unit.key,
    businessUnitName: unit.name,
    roles: roleList,
    currency: currency(session),
    canUpdate: allowed.has("UpdateApprovalRules"),
  };
}

const requesterDrafts = (keys: string[]): RuleRequesterDraft[] =>
  [...new Set(keys)].map((key) => ({ associateRole: { typeId: "associate-role", key } }));
const approverDraft = (tiers: z.infer<typeof approvalRuleInput>["tiers"]): ApproverHierarchyDraft => ({
  tiers: tiers.map((tier) => ({
    and: tier.and.map((group) => ({ or: [...new Set(group.or)].map((key) => ({ associateRole: { typeId: "associate-role", key } })) })),
  })),
});

export async function saveApprovalRule(session: B2BSession, raw: unknown) {
  const input = approvalRuleInput.parse(raw);
  const customer = requireCustomer(session);
  const unit = await unitFor(session, input.businessUnitKey);
  const known = new Set((await roles()).map((role) => role.key));
  const used = [...input.requesters, ...input.tiers.flatMap((tier) => tier.and.flatMap((group) => group.or))];
  if (used.some((key) => !known.has(key))) throw new B2BError("Select roles from the list of associate roles.");
  const rules = rulesIn(customer.id, unit.key);
  if (!input.id) {
    const { body } = await rules.post({ body: {
      name: input.name,
      description: input.description || undefined,
      status: input.status,
      predicate: input.predicate,
      requesters: requesterDrafts(input.requesters),
      approvers: approverDraft(input.tiers),
    }}).execute();
    return view(body);
  }
  const { body: current } = await rules.withId({ ID: input.id }).get().execute();
  if (current.businessUnit.key !== unit.key) throw new B2BError("Approval rule not found.", 404);
  const before = view(current);
  const actions: ApprovalRuleUpdateAction[] = [];
  if (input.name !== before.name) actions.push({ action: "setName", name: input.name });
  if (input.description !== before.description) actions.push({ action: "setDescription", description: input.description || undefined });
  if (input.status !== before.status) actions.push({ action: "setStatus", status: input.status });
  if (input.predicate !== before.predicate) actions.push({ action: "setPredicate", predicate: input.predicate });
  if (JSON.stringify([...new Set(input.requesters)].sort()) !== JSON.stringify([...before.requesters].sort()))
    actions.push({ action: "setRequesters", requesters: requesterDrafts(input.requesters) });
  if (JSON.stringify(approverDraft(input.tiers).tiers.map((tier) => tier.and.map((group) => group.or.map((role) => role.associateRole.key))))
    !== JSON.stringify(before.tiers.map((tier) => tier.and.map((group) => group.or))))
    actions.push({ action: "setApprovers", approvers: approverDraft(input.tiers) });
  if (!actions.length) return before;
  const { body } = await rules.withId({ ID: current.id })
    .post({ body: { version: input.version ?? current.version, actions } }).execute();
  return view(body);
}

export function approvalRuleErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) return { status: 400, error: error.issues[0]?.message || "Check the rule fields." };
  if (error instanceof B2BError) return { status: error.status, error: error.message };
  const problem = error as { statusCode?: number; body?: { errors?: { code?: string; message?: string }[] } };
  const first = problem.body?.errors?.[0];
  if (first?.code === "AssociateMissingPermission" || problem.statusCode === 403)
    return { status: 403, error: "Your role does not allow managing approval rules." };
  if (problem.statusCode === 404) return { status: 404, error: "Approval rule not found." };
  if (first?.code === "ConcurrentModification" || problem.statusCode === 409)
    return { status: 409, error: "Someone else changed this rule. Reload it and try again." };
  if (problem.statusCode === 400)
    return { status: 400, error: first?.message ? `The rule was not accepted: ${first.message}` : "The rule conditions are not valid." };
  return { status: 502, error: "Approval rules could not be loaded. Please try again." };
}
