import type { Cart, Money } from "../types";
export type B2BNavigationCategory = {
  id: string;
  name: string;
  slug: string;
  children: B2BNavigationCategory[];
};
export type B2BStore = { key: string; name: string };
export type B2BUnit = {
  key: string;
  name: string;
  stores: B2BStore[];
  canManageAssociates: boolean;
};
export type B2BContext = {
  businessUnitKey: string;
  storeKey: string;
  currency: string;
  country: string;
  distributionChannelId: string;
};
export type B2BProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  categoryIds?: string[];
  image: string;
  images: string[];
  variants: {
    id: number;
    sku: string;
    image: string;
    price: Money | null;
    attributes: { name: string; value: string }[];
  }[];
  price: Money | null;
};
export type B2BState = {
  configured: boolean;
  customer: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  businessUnits: B2BUnit[];
  context: B2BContext | null;
  products: B2BProduct[];
  cart: Cart | null;
  notice?: string;
};
export type B2BAction =
  | {
      action: "login" | "register";
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }
  | { action: "logout" | "clear-context" }
  | { action: "select-context"; businessUnitKey: string; storeKey: string }
  | { action: "create-business-unit"; name: string }
  | { action: "add-associate"; email: string; businessUnitKey: string }
  | {
      action: "add-to-cart";
      productId: string;
      variantId: number;
      quantity: number;
    }
  | { action: "set-quantity"; lineItemId: string; quantity: number };
