export type StoreMode = "b2c" | "b2b";
export type Money = {
  centAmount: number;
  currencyCode: string;
  formatted: string;
};
export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  color: string;
  image: string;
  price: Money;
  badges: string[];
};
export type CartLine = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
};
export type Cart = {
  id: string;
  version: number;
  mode: StoreMode;
  lines: CartLine[];
  itemCount: number;
  subtotal: Money;
};
export type CheckoutResult = {
  id: string;
  status: "confirmed" | "approval-pending";
  reference: string;
  message: string;
};
export type SearchResult = {
  products: Product[];
  total: number;
  facets: { categories: string[]; colors: string[] };
};
