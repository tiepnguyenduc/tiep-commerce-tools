import { ImageProps } from '@/components/commercetools-ui/atoms/image/index';
import { Cart, DiscountCode, LineItem as CartLineItem } from '@/lib/launchpad/types/entity/cart';
import { Link } from '@/components/commercetools-ui/organisms/header/types/index';

export interface CartSlideoutProps {
  cart?: Cart;
  isEmpty?: boolean;
  onApplyDiscountCode?: (code: string) => Promise<void>;
  onRemoveDiscountCode?: (discount: DiscountCode) => Promise<void>;
  emptyStateImage: ImageProps;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  emptyStateCategories: Link[];
  handleCategoryClick?: () => void;
  onRemoveItem(itemId: string): Promise<void>;
  onUpdateItem(itemId: string, quantity: number): Promise<void>;
  OnMoveToWishlist(lineItem: CartLineItem): Promise<void>;
}
