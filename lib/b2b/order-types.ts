import type { Cart, Money } from "../types";
import type { ApprovalFlowStatus } from "./approval-types";

export type B2BOrderAddress = {
  id: string;
  company: string;
  name: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type B2BCheckout = {
  businessUnit: { key: string; name: string };
  store: { key: string; name: string };
  cart: Cart | null;
  addresses: B2BOrderAddress[];
  defaultAddressId: string;
};

export type B2BOrderConfirmation = {
  id: string;
  orderNumber: string;
  purchaseOrderNumber: string;
  createdAt: string;
  orderState: string;
  businessUnit: { key: string; name: string };
  storeKey: string;
  order: Cart;
  shippingAddress: Omit<B2BOrderAddress, "id"> | null;
  shippingMethod: string;
  shippingPrice: Money | null;
  approval: { id: string; status: ApprovalFlowStatus } | null;
};
