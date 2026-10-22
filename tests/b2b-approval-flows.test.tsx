import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ApprovalFlowDetail, ApprovalFlowSummary } from "../lib/b2b/approval-types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getB2BApiRoot: vi.fn(),
  readB2BSession: vi.fn(),
  swr: { data: undefined as unknown, error: undefined as unknown, isLoading: false },
}));
vi.mock("../lib/ct/client", () => ({ getB2BApiRoot: mocks.getB2BApiRoot }));
vi.mock("../lib/b2b/session", () => ({ readB2BSession: mocks.readB2BSession }));
vi.mock("next/navigation", () => ({ usePathname: () => "/b2b/account/approval-flows", useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("swr", () => ({
  default: () => ({ ...mocks.swr, isValidating: false, mutate: vi.fn() }),
  useSWRConfig: () => ({ mutate: vi.fn() }),
}));
vi.mock("../components/b2b/B2BProvider", () => ({
  useB2B: () => ({ state: { customer: { id: "buyer" }, context: { businessUnitKey: "acme" } } }),
}));

import { decideApprovalFlow, listApprovalFlows, readApprovalFlow } from "../lib/ct/b2b-approval";
import { PATCH } from "../app/api/b2b/approval-flows/[id]/route";
import {
  ApprovalFlowDetailView,
  ApprovalFlowList,
  approvalFlowHref,
  filterApprovalFlows,
} from "../components/b2b/B2BApprovalFlows";

const money = (centAmount: number) => ({ type: "centPrecision", centAmount, currencyCode: "USD", fractionDigits: 2 });
const unit = (key: string, roles: string[]) => ({
  key,
  name: key === "acme" ? "Acme Equipment" : "Other Co",
  status: "Active",
  associates: [{ customer: { id: "buyer" }, associateRoleAssignments: roles.map((role) => ({ associateRole: { key: role } })) }],
  inheritedAssociates: [],
});
const flow = (overrides: Record<string, unknown> = {}) => ({
  id: "flow-1",
  version: 3,
  createdAt: "2026-10-21T10:00:00.000Z",
  lastModifiedAt: "2026-10-21T11:00:00.000Z",
  status: "Pending",
  businessUnit: { key: "acme" },
  order: {
    id: "order-1",
    obj: {
      orderNumber: "PO-1001",
      customerId: "requester",
      totalPrice: money(4200000),
      lineItems: [{ id: "l1", name: { "en-US": "Loader" }, quantity: 2, variant: { sku: "LD-1" }, price: { value: money(2100000) }, totalPrice: money(4200000) }],
    },
  },
  rules: [{ name: "Over $10k", description: "Needs a manager" }],
  approvals: [],
  eligibleApprovers: [{ associateRole: { key: "manager" } }],
  pendingApprovers: [{ associateRole: { key: "manager" } }],
  currentTierPendingApprovers: [{ associateRole: { key: "manager" } }],
  ...overrides,
});

let flowGet: ReturnType<typeof vi.fn>, flowPost: ReturnType<typeof vi.fn>, listGet: ReturnType<typeof vi.fn>;
const session = () => ({ customer: { id: "buyer", email: "buyer@example.test" }, context: { businessUnitKey: "acme" } }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  flowGet = vi.fn().mockResolvedValue({ body: flow() });
  flowPost = vi.fn().mockResolvedValue({ body: flow({ version: 4, approvals: [{ approver: { customer: { id: "buyer" } }, approvedAt: "2026-10-22T09:00:00.000Z" }], status: "Approved" }) });
  listGet = vi.fn().mockResolvedValue({ body: { results: [flow(), flow({ id: "flow-2", status: "Rejected", eligibleApprovers: [] })] } });
  const approvalFlows = () => ({
    get: (args: unknown) => ({ execute: () => listGet(args) }),
    withId: () => ({
      get: () => ({ execute: () => flowGet() }),
      post: (args: unknown) => ({ execute: () => flowPost(args) }),
    }),
  });
  mocks.getB2BApiRoot.mockReturnValue({
    businessUnits: () => ({ get: () => ({ execute: async () => ({ body: { results: [unit("acme", ["manager"]), unit("other", ["buyer"])] } }) }) }),
    asAssociate: () => ({
      withAssociateIdValue: () => ({
        businessUnits: () => ({ withKey: ({ key }: { key: string }) => ({ get: () => ({ execute: async () => ({ body: unit(key, key === "acme" ? ["manager"] : ["buyer"]) }) }) }) }),
        inBusinessUnitKeyWithBusinessUnitKeyValue: () => ({ approvalFlows }),
      }),
    }),
    customers: () => ({ get: () => ({ execute: async () => ({ body: { results: [{ id: "requester", firstName: "Rae", lastName: "Quinn", email: "rae@example.test" }, { id: "buyer", firstName: "Bo", email: "bo@example.test" }] } }) }) }),
    associateRoles: () => ({ get: () => ({ execute: async () => ({ body: { results: [{ key: "manager", name: "Purchasing manager" }] } }) }) }),
  });
});

describe("approval flow boundaries", () => {
  it("requires a signed-in associate", async () => {
    await expect(listApprovalFlows({})).rejects.toMatchObject({ status: 401 });
  });
  it("refuses business units the associate does not belong to", async () => {
    await expect(listApprovalFlows(session(), "someone-else")).rejects.toMatchObject({ status: 403 });
    expect(listGet).not.toHaveBeenCalled();
  });
  it("lists the active unit's flows with order totals and decision eligibility", async () => {
    const list = await listApprovalFlows(session());
    expect(list.businessUnitKey).toBe("acme");
    expect(list.units).toHaveLength(2);
    expect(listGet.mock.calls[0][0].queryArgs).toMatchObject({ expand: ["order"], sort: ["createdAt desc"] });
    expect(list.flows[0]).toMatchObject({ id: "flow-1", orderNumber: "PO-1001", itemCount: 2, canDecide: true, total: { formatted: "$42,000.00" } });
    expect(list.flows[1].canDecide).toBe(false);
  });
  it("only offers decisions to roles the approval rule names", async () => {
    const list = await listApprovalFlows(session(), "other");
    expect(list.flows.every((item) => !item.canDecide)).toBe(true);
  });
  it("resolves requester, awaiting roles and line items for the detail view", async () => {
    const detail = await readApprovalFlow(session(), "flow-1", "acme");
    expect(detail.requester).toEqual({ name: "Rae Quinn", email: "rae@example.test" });
    expect(detail.awaitingRoles).toEqual(["Purchasing manager"]);
    expect(detail.canApprove).toBe(true);
    expect(detail.lineItems[0]).toMatchObject({ name: "Loader", sku: "LD-1", quantity: 2 });
  });
  it("rejects malformed flow IDs before calling commercetools", async () => {
    await expect(readApprovalFlow(session(), "../orders", "acme")).rejects.toMatchObject({ status: 404 });
    expect(flowGet).not.toHaveBeenCalled();
  });
  it("posts a versioned approve action", async () => {
    const detail = await decideApprovalFlow(session(), "flow-1", { action: "approve", businessUnitKey: "acme" });
    expect(flowPost.mock.calls[0][0].body).toEqual({ version: 3, actions: [{ action: "approve" }] });
    expect(detail.status).toBe("Approved");
    expect(detail.approvals[0].name).toBe("Bo");
  });
  it("requires a rejection reason and never decides a closed flow", async () => {
    await expect(decideApprovalFlow(session(), "flow-1", { action: "reject", businessUnitKey: "acme", reason: " " })).rejects.toThrow();
    flowGet.mockResolvedValueOnce({ body: flow({ status: "Rejected" }) });
    await expect(decideApprovalFlow(session(), "flow-1", { action: "reject", businessUnitKey: "acme", reason: "Too much" })).rejects.toMatchObject({ status: 409 });
    expect(flowPost).not.toHaveBeenCalled();
  });
  it("rejects cross-origin decisions before reading the session", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/b2b/approval-flows/flow-1", { method: "PATCH", headers: { origin: "https://elsewhere.example" }, body: "{}" }),
      { params: Promise.resolve({ id: "flow-1" }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.readB2BSession).not.toHaveBeenCalled();
  });
});

const summary = (overrides: Partial<ApprovalFlowSummary>): ApprovalFlowSummary => ({
  id: "flow-a",
  status: "Pending",
  createdAt: "2026-10-20T00:00:00.000Z",
  businessUnitKey: "acme",
  businessUnitName: "Acme Equipment",
  orderId: "order",
  orderNumber: "PO-1",
  itemCount: 1,
  total: { centAmount: 100, currencyCode: "USD", formatted: "$1.00" },
  canDecide: false,
  ...overrides,
});

describe("approval flow list", () => {
  const flows = [
    summary({ id: "flow-a", createdAt: "2026-10-19T00:00:00.000Z", total: { centAmount: 900, currencyCode: "USD", formatted: "$9.00" } }),
    summary({ id: "flow-b", orderNumber: "PO-77", createdAt: "2026-10-21T00:00:00.000Z" }),
    summary({ id: "flow-c", status: "Approved" }),
  ];
  it("filters by status and searches flow IDs and order numbers", () => {
    expect(filterApprovalFlows(flows, "Pending", "", "newest").map((item) => item.id)).toEqual(["flow-b", "flow-a"]);
    expect(filterApprovalFlows(flows, "Pending", "po-77", "newest").map((item) => item.id)).toEqual(["flow-b"]);
    expect(filterApprovalFlows(flows, "Pending", "", "highest").map((item) => item.id)).toEqual(["flow-a", "flow-b"]);
    expect(filterApprovalFlows(flows, "Approved", "", "oldest").map((item) => item.id)).toEqual(["flow-c"]);
  });
  it("links to the detail page within its business unit", () => {
    expect(approvalFlowHref({ id: "flow-a", businessUnitKey: "acme & co" })).toBe("/b2b/account/approval-flows/flow-a?businessUnitKey=acme%20%26%20co");
  });
  it("highlights flows waiting for the associate's decision", () => {
    mocks.swr.data = { units: [{ key: "acme", name: "Acme Equipment" }], businessUnitKey: "acme", flows: [...flows, summary({ id: "flow-d", canDecide: true })] };
    const html = renderToStaticMarkup(<ApprovalFlowList initialUnit="" initialStatus="Pending" />);
    expect(html).toContain("1 order is waiting for your decision");
    expect(html).toContain("Acme Equipment");
    expect(html).toContain(">Review<");
    expect(html).not.toContain("flow-c");
  });
});

describe("approval flow detail", () => {
  const detail: ApprovalFlowDetail = {
    ...summary({ id: "flow-r", status: "Rejected", orderNumber: "PO-9" }),
    lastModifiedAt: "2026-10-21T00:00:00.000Z",
    requester: { name: "Rae Quinn", email: "rae@example.test" },
    rules: [],
    approvals: [],
    rejection: { name: "Bo", email: "", at: "2026-10-21T00:00:00.000Z", reason: "tmp test reason" },
    awaitingRoles: [],
    canApprove: false,
    lineItems: [],
    subtotal: null,
    shipping: null,
    tax: null,
    shippingAddress: null,
  };
  it("shows the rejection reason without decision controls", () => {
    mocks.swr.data = { flow: detail };
    const html = renderToStaticMarkup(<ApprovalFlowDetailView id="flow-r" businessUnitKey="acme" />);
    expect(html).toContain("Rejection reason");
    expect(html).toContain("tmp test reason");
    expect(html).toContain("Order PO-9");
    expect(html).not.toContain("Approve order");
  });
  it("offers approve and reject to an eligible approver", () => {
    mocks.swr.data = { flow: { ...detail, status: "Pending", rejection: null, canDecide: true, canApprove: true, awaitingRoles: ["Purchasing manager"] } };
    const html = renderToStaticMarkup(<ApprovalFlowDetailView id="flow-r" businessUnitKey="acme" />);
    expect(html).toContain("Approve order");
    expect(html).toContain("Reject");
    expect(html).toContain("Purchasing manager");
  });
});
