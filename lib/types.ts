export type StoreMode = "b2c" | "b2b";
export type Money = {
  centAmount: number;
  currencyCode: string;
  formatted: string;
};
export type ProductSpecification = {
  name: string;
  label: string;
  value: string;
};
export type ProductVariant = {
  id: number;
  sku: string;
  key?: string;
  image: string;
  images: string[];
  price: Money;
  attributes: ProductSpecification[];
  specifications: ProductSpecification[];
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
  images?: string[];
  specifications?: ProductSpecification[];
  variants?: ProductVariant[];
};
export type HeaderCategory = {
  id: string;
  name: string;
  slug: string;
};
export type CustomerAddress = {
  id?: string;
  firstName?: string;
  lastName?: string;
  streetName?: string;
  streetNumber?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
  phone?: string;
};
export type CustomerProfile = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  addresses: CustomerAddress[];
};
export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  createdAt: string;
  orderState: string;
  lineCount: number;
  total: Money;
};
export type WishlistLine = {
  id: string;
  productId: string;
  variantId?: number;
  sku: string;
  name: string;
  image: string;
  quantity: number;
};
export type Wishlist = {
  id: string;
  version: number;
  name: string;
  lines: WishlistLine[];
};
export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  variantId?: number;
  variantKey?: string;
  variantLabel?: string;
  variantAttributes?: ProductSpecification[];
  sku: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
};
export type AppliedDiscountCode = {
  id: string;
  code: string;
  state: string;
};
export type Cart = {
  id: string;
  version: number;
  mode: StoreMode;
  lines: CartLine[];
  itemCount: number;
  subtotal: Money;
  taxTotal: Money;
  discountTotal: Money;
  total: Money;
  discountCodes: AppliedDiscountCode[];
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
  pagination: {
    page: number;
    perPage: number;
    totalPages: number;
  };
};
