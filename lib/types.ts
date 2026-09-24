export type StoreMode = "b2c" | "b2b";
export type ReviewMediaType = "image" | "video";
/** A photo or video a shopper attached to their review. */
export type ReviewMedia = {
  id: string;
  type: ReviewMediaType;
  /** Storefront URL serving the stored file. */
  url: string;
  contentType: string;
  name?: string;
};
export type ProductReview = {
  id: string;
  authorName: string;
  title: string;
  text: string;
  rating?: number;
  createdAt: string;
  media: ReviewMedia[];
};
export type ProductReviewInput = {
  authorName: string;
  title: string;
  text: string;
  rating: number;
  media?: ReviewMedia[];
};
export type ReviewSortOrder = "newest" | "oldest" | "highest" | "lowest";
/** Everything the shopper can narrow the review list down by. */
export type ProductReviewQuery = {
  offset?: number;
  search?: string;
  /** Whole-star ratings to keep; empty means every rating. */
  ratings?: number[];
  /** Keep only reviews that carry a photo or a video. */
  withMedia?: boolean;
  sort?: ReviewSortOrder;
};
/** Counts over every review of the product, so the filter controls can show totals. */
export type ProductReviewFacets = {
  total: number;
  withMedia: number;
  distribution: Record<number, number>;
};
export type ProductReviewPage = {
  reviews: ProductReview[];
  /** Reviews matching the current query, which paginates this page. */
  total: number;
  offset: number;
  limit: number;
  facets: ProductReviewFacets;
};
export type ProductRatingSummary = {
  /** Mean of every published rating, 0 when the product has none yet. */
  average: number;
  count: number;
  /** Review count per whole-star rating; always holds the keys 1 through 5. */
  distribution: Record<number, number>;
  /** Reviews that carry at least one photo or video. */
  withMedia: number;
};
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
  /** Original list price, present only when `price` is a reduced special price. */
  originalPrice?: Money;
  attributes: ProductSpecification[];
  specifications: ProductSpecification[];
};
export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  brand?: string;
  category: string;
  color: string;
  image: string;
  price: Money;
  /** Original list price, present only when `price` is a reduced special price. */
  originalPrice?: Money;
  badges: string[];
  images?: string[];
  specifications?: ProductSpecification[];
  variants?: ProductVariant[];
};
export type ProductBrandSummary = {
  name: string;
  count: number;
  image: string;
  categories: string[];
};
export type HeaderCategory = {
  id: string;
  parentId?: string;
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
export type CustomerOrderLine = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
};
export type CustomerOrderDetail = CustomerOrderSummary & {
  paymentState?: string;
  shipmentState?: string;
  shippingMethod?: string;
  shippingAddress?: CustomerAddress;
  billingAddress?: CustomerAddress;
  lines: CustomerOrderLine[];
  itemsTotal: Money;
  shipping?: Money;
  tax?: Money;
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
  isDefault: boolean;
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
  facets: { brands: string[]; categories: string[]; colors: string[] };
  pagination: {
    page: number;
    perPage: number;
    totalPages: number;
  };
};
