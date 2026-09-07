import { ProductDiscountedPrice } from '@/lib/launchpad/shared/cart/Discount';
import { Attributes } from '@/lib/launchpad/shared/product/Attributes';
import { Money } from '@/lib/launchpad/shared/product/Money';

export interface Variant {
  id?: string;
  sku: string;
  groupId?: string;
  price?: Money;
  discountedPrice?: ProductDiscountedPrice;
  attributes?: Attributes;
  images?: string[];
  isOnStock?: boolean;
  restockableInDays?: number;
  availableQuantity?: number;
  isMatchingVariant?: boolean;
}
