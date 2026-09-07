import { ShippingMethod } from '@/lib/launchpad/types/entity/cart';
import { Category } from '@/lib/launchpad/types/entity/category';
import { Variant } from '@/lib/launchpad/types/entity/product';
import { LineItem as WishlistLineItem, Wishlist } from '@/lib/launchpad/types/entity/wishlist';
import { FacetConfiguration, PriceConfiguration } from '@/components/commercetools-ui/organisms/product/product-list/types/index';

export interface RefinementRemovedEvent {
  attribute: string;
}

export interface UiState {
  slug?: string;
  searchQuery?: string;
  previousCursor?: string;
  nextCursor?: string;
  totalItems: number;
}

export interface Sort {
  attribute: string;
  value: 'asc' | 'desc';
}

export interface ActiveRefinement {
  attribute: string;
  label: string;
  refine: () => void;
}

export interface ProductListContextShape extends UiState {
  categories: Category[];
  shippingMethods?: ShippingMethod[];
  pricesConfiguration: Record<string, PriceConfiguration>;
  facetsConfiguration: Record<string, FacetConfiguration>;
  activeSort?: Sort;
  activeLimit?: number;
  activeRefinements: Array<ActiveRefinement>;
  refine: (attribute: string, key: string) => void;
  refineRange: (attribute: string, value: [number, number]) => void;
  replaceSort: (newSort: Sort) => void;
  removeAllRefinements: () => void;
  loadMore: () => void;
  wishlist?: Wishlist;
  addToWishlist?: (lineItem: WishlistLineItem, count: number) => Promise<void>;
  removeFromWishlist?: (item: WishlistLineItem) => Promise<void>;
  onAddToCart?: (variant: Variant, quantity: number) => Promise<void>;
}
