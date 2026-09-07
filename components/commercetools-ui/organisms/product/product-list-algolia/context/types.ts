import { CurrentRefinementsConnectorParamsRefinement } from 'instantsearch.js/es/connectors/current-refinements/connectCurrentRefinements';
import { Cart, ShippingMethod } from '@/lib/launchpad/types/entity/cart';
import { Category } from '@/lib/launchpad/types/entity/category';
import { Variant } from '@/lib/launchpad/types/entity/product';
import { LineItem as WishlistLineItem, Wishlist } from '@/lib/launchpad/types/entity/wishlist';
import { FacetConfiguration, PriceConfiguration } from '@/components/commercetools-ui/organisms/product/product-list-algolia/types/index';

export interface RefinementRemovedEvent {
  attribute: string;
}

export interface ProductListContextShape {
  searchQuery?: string;
  categories: Category[];
  shippingMethods?: ShippingMethod[];
  facetsConfiguration: Record<string, FacetConfiguration>;
  pricesConfiguration: Record<string, PriceConfiguration>;
  numericRanges: Record<string, [number, number]>;
  updateNumericRange: (attribute: string, range: [number, number]) => void;
  removeRefinement: (refinement: CurrentRefinementsConnectorParamsRefinement) => void;
  removeAllRefinements: () => void;
  wishlist?: Wishlist;
  cart?: Cart;
  addToWishlist?: (lineItem: WishlistLineItem, count: number) => Promise<void>;
  removeFromWishlist?: (item: WishlistLineItem) => Promise<void>;
  onAddToCart?: (variant: Variant, quantity: number) => Promise<void>;
}
