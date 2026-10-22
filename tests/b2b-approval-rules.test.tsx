import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ApprovalRuleView } from "../lib/b2b/approval-types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getB2BApiRoot: vi.fn(),
  readB2BSession: vi.fn(),
  swr: { data: undefined as unknown, error: undefined as unknown, isLoading: false },
}));
vi.mock("../lib/ct/client", () => ({ getB2BApiRoot: mocks.getB2BApiRoot }));
vi.mock("../lib/b2b/session", () => ({ readB2BSession: mocks.readB2BSession }));
vi.mock("next/navigation", () => ({ usePathname: () => "/b2b/account/approval-rules", useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("swr", () => ({
  default: () => ({ ...mocks.swr, isValidating: false, mutate: vi.fn() }),
  useSWRConfig: () => ({ mutate: vi.fn() }),
}));
vi.mock("../components/b2b/B2BProvider", () => ({
  useB2B: () => ({ state: { customer: { id: "admin" }, context: { businessUnitKey: "acme" } } }),
}));

import { buildPredicate, parsePredicate } from "../lib/b2b/approval-rule-predicate";
import { readApprovalRules, saveApprovalRule } from "../lib/ct/b2b-approval-rules";
import { POST } from "../app/api/b2b/approval-rules/route";
import { ApprovalRuleList, B2BApprovalRuleEditorPage, draftErrors, draftFromRule } from "../components/b2b/B2BApprovalRules";

describe("approval rule predicates", () => {
  it("round-trips builder conditions, including quoted SKUs", () => {
    const conditions = {
      combinator: "or" as const,
      conditions: [
        { kind: "total" as const, operator: ">" as const, amount: "2000.5" },
        { kind: "quantity" as const, operator: ">=" as const, amount: "10" },
        { kind: "sku" as const, value: 'BK "32" and more' },
        { kind: "country" as const, value: "us" },
      ],
    };
    const predicate = buildPredicate(conditions);
    expect(predicate).toBe('totalPrice.centAmount > 200050 or lineItemCount(1 = 1) >= 10 or lineItemExists(sku = "BK \\"32\\" and more") or shippingAddress.country = "US"');
    expect(parsePredicate(predicate)).toEqual({ ...conditions, conditions: [...conditions.conditions.slice(0, 3), { kind: "country", value: "US" }] });
  });
  it("skips incomplete conditions and respects currency precision", () => {
    expect(buildPredicate({ combinator: "and", conditions: [{ kind: "total", operator: ">", amount: "" }, { kind: "total", operator: "<", amount: "500" }] }, 0)).toBe("totalPrice.centAmount < 500");
  });
  it("leaves predicates the builder cannot represent to the text editor", () => {
    expect(parsePredicate('customer.email = "x"')).toBeNull();
    expect(parsePredicate("totalPrice.centAmount > 1 and totalPrice.centAmount < 9 or totalPrice.centAmount = 5")).toBeNull();
  });
});

const ruleResource = {
  id: "rule-1",
  version: 7,
  name: "Large orders",
  description: "",
  status: "Active",
  predicate: "totalPrice.centAmount > 200000",
  requesters: [{ associateRole: { key: "buyer" } }],
  approvers: { tiers: [{ and: [{ or: [{ associateRole: { key: "admin" } }] }] }] },
  businessUnit: { key: "acme" },
  lastModifiedAt: "2026-10-21T00:00:00.000Z",
};
let rulePost: ReturnType<typeof vi.fn>, createPost: ReturnType<typeof vi.fn>;
const session = () => ({ customer: { id: "admin", email: "admin@example.test" }, context: { businessUnitKey: "acme", currency: "USD" } }) as never;
const unit = {
  key: "acme",
  name: "Acme",
  status: "Active",
  associates: [{ customer: { id: "admin" }, associateRoleAssignments: [{ associateRole: { key: "admin" } }] }],
  inheritedAssociates: [],
};
const input = {
  businessUnitKey: "acme",
  name: "Large orders",
  description: "",
  status: "Active",
  predicate: "totalPrice.centAmount > 200000",
  requesters: ["buyer"],
  tiers: [{ and: [{ or: ["admin"] }] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  rulePost = vi.fn().mockImplementation(async ({ body }) => ({ body: { ...ruleResource, version: body.version + 1 } }));
  createPost = vi.fn().mockImplementation(async ({ body }) => ({ body: { ...ruleResource, ...body, id: "new", version: 1, requesters: body.requesters, approvers: body.approvers } }));
  const approvalRules = () => ({
    get: () => ({ execute: async () => ({ body: { results: [ruleResource] } }) }),
    post: (args: unknown) => ({ execute: () => createPost(args) }),
    withId: () => ({ get: () => ({ execute: async () => ({ body: ruleResource }) }), post: (args: unknown) => ({ execute: () => rulePost(args) }) }),
  });
  mocks.getB2BApiRoot.mockReturnValue({
    businessUnits: () => ({ get: () => ({ execute: async () => ({ body: { results: [unit] } }) }) }),
    asAssociate: () => ({
      withAssociateIdValue: () => ({
        businessUnits: () => ({ withKey: () => ({ get: () => ({ execute: async () => ({ body: unit }) }) }) }),
        inBusinessUnitKeyWithBusinessUnitKeyValue: () => ({ approvalRules }),
      }),
    }),
    associateRoles: () => ({
      get: () => ({ execute: async () => ({ body: { results: [{ key: "admin", name: "Admin" }, { key: "buyer", name: "Buyer" }] } }) }),
      withKey: () => ({ get: () => ({ execute: async () => ({ body: { permissions: ["CreateApprovalRules", "UpdateApprovalRules"] } }) }) }),
    }),
  });
});

describe("approval rule persistence", () => {
  it("lists rules with role-based capabilities", async () => {
    const workspace = await readApprovalRules(session());
    expect(workspace).toMatchObject({ businessUnitKey: "acme", canCreate: true, canUpdate: true, currency: "USD" });
    expect(workspace.rules[0]).toMatchObject({ id: "rule-1", requesters: ["buyer"], tiers: [{ and: [{ or: ["admin"] }] }] });
  });
  it("creates a rule with role key references", async () => {
    await saveApprovalRule(session(), { ...input, tiers: [{ and: [{ or: ["admin", "admin"] }] }, { and: [{ or: ["buyer"] }] }] });
    const body = createPost.mock.calls[0][0].body;
    expect(body.requesters).toEqual([{ associateRole: { typeId: "associate-role", key: "buyer" } }]);
    expect(body.approvers.tiers).toHaveLength(2);
    expect(body.approvers.tiers[0].and[0].or).toEqual([{ associateRole: { typeId: "associate-role", key: "admin" } }]);
  });
  it("updates only changed fields with the editor's version", async () => {
    await saveApprovalRule(session(), { ...input, id: "rule-1", version: 7, status: "Inactive", name: "Large orders" });
    expect(rulePost.mock.calls[0][0].body).toEqual({ version: 7, actions: [{ action: "setStatus", status: "Inactive" }] });
  });
  it("skips the request when nothing changed", async () => {
    await saveApprovalRule(session(), { ...input, id: "rule-1", version: 7 });
    expect(rulePost).not.toHaveBeenCalled();
  });
  it("rejects unknown roles and empty approver groups", async () => {
    await expect(saveApprovalRule(session(), { ...input, requesters: ["ghost"] })).rejects.toMatchObject({ status: 400 });
    await expect(saveApprovalRule(session(), { ...input, tiers: [{ and: [{ or: [] }] }] })).rejects.toThrow();
    expect(createPost).not.toHaveBeenCalled();
  });
  it("rejects cross-origin creation before reading the session", async () => {
    const response = await POST(new Request("http://localhost/api/b2b/approval-rules", { method: "POST", headers: { origin: "https://elsewhere.example" }, body: "{}" }));
    expect(response.status).toBe(403);
    expect(mocks.readB2BSession).not.toHaveBeenCalled();
  });
});

const view: ApprovalRuleView = {
  id: "rule-1",
  version: 7,
  name: "Large orders",
  description: "Needs an admin",
  status: "Active",
  predicate: "totalPrice.centAmount > 200000",
  requesters: ["buyer"],
  tiers: [{ and: [{ or: ["admin"] }] }],
  lastModifiedAt: "2026-10-21T00:00:00.000Z",
};
const roles = [{ key: "admin", name: "Admin" }, { key: "buyer", name: "Buyer" }];

describe("approval rule UI", () => {
  it("validates a new draft before saving", () => {
    const draft = draftFromRule(undefined, "USD");
    expect(Object.keys(draftErrors(draft, ""))).toEqual(["name", "requesters", "conditions", "approvers"]);
  });
  it("opens hand-written predicates in the text editor", () => {
    expect(draftFromRule({ ...view, predicate: 'customer.email = "x"' }, "USD").advanced).toBe(true);
    expect(draftFromRule(view, "USD").conditions).toEqual([{ kind: "total", operator: ">", amount: "2000" }]);
  });
  it("summarises rules in readable language", () => {
    mocks.swr.data = { units: [{ key: "acme", name: "Acme" }], businessUnitKey: "acme", roles, currency: "USD", canCreate: true, canUpdate: true, rules: [view] };
    const html = renderToStaticMarkup(<ApprovalRuleList initialUnit="" />);
    expect(html).toContain("Order total is more than $2,000.00");
    expect(html).toContain("Add approval rule");
    expect(html).toContain("/b2b/account/approval-rules/rule-1/edit?businessUnitKey=acme");
  });
  it("prefills the edit form", () => {
    mocks.swr.data = { rule: view, businessUnitKey: "acme", businessUnitName: "Acme", roles, currency: "USD", canUpdate: true };
    const html = renderToStaticMarkup(<B2BApprovalRuleEditorPage id="rule-1" businessUnitKey="acme" />);
    expect(html).toContain('value="Large orders"');
    expect(html).toContain("Save changes");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Buyer/);
  });
});
