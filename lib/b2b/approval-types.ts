import type { Money } from "../types";

export type ApprovalFlowStatus = "Pending" | "Approved" | "Rejected";

export type ApprovalFlowPerson = { name: string; email: string };

export type ApprovalFlowSummary = {
  id: string;
  status: ApprovalFlowStatus;
  createdAt: string;
  businessUnitKey: string;
  businessUnitName: string;
  orderId: string;
  orderNumber: string;
  itemCount: number;
  total: Money | null;
  /** The signed-in associate holds a role that may approve or reject now. */
  canDecide: boolean;
};

export type ApprovalFlowLineItem = {
  id: string;
  name: string;
  sku: string;
  image: string;
  quantity: number;
  unitPrice: Money | null;
  total: Money | null;
};

export type ApprovalFlowAddress = {
  company: string;
  name: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type ApprovalFlowDetail = ApprovalFlowSummary & {
  lastModifiedAt: string;
  requester: ApprovalFlowPerson | null;
  rules: { name: string; description: string }[];
  approvals: (ApprovalFlowPerson & { at: string })[];
  rejection: (ApprovalFlowPerson & { at: string; reason: string }) | null;
  /** Role names still required in the active approver tier. */
  awaitingRoles: string[];
  /** One of the associate's roles is still required in the active tier. */
  canApprove: boolean;
  lineItems: ApprovalFlowLineItem[];
  subtotal: Money | null;
  shipping: Money | null;
  tax: Money | null;
  shippingAddress: ApprovalFlowAddress | null;
};

export type ApprovalFlowList = {
  units: { key: string; name: string }[];
  businessUnitKey: string;
  flows: ApprovalFlowSummary[];
};

export type ApprovalRuleStatus = "Active" | "Inactive";

/** Approver tier: every group must approve; a group approves when any of its roles does. */
export type ApprovalRuleTier = { and: { or: string[] }[] };

export type ApprovalRuleView = {
  id: string;
  version: number;
  name: string;
  description: string;
  status: ApprovalRuleStatus;
  predicate: string;
  requesters: string[];
  tiers: ApprovalRuleTier[];
  lastModifiedAt: string;
};

export type ApprovalRuleWorkspace = {
  units: { key: string; name: string }[];
  businessUnitKey: string;
  roles: { key: string; name: string }[];
  currency: string;
  canCreate: boolean;
  canUpdate: boolean;
  rules: ApprovalRuleView[];
};
