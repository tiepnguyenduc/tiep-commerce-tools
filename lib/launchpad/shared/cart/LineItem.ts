import { DiscountedPricePerCount, ProductDiscountedPrice } from '@/lib/launchpad/shared/cart/Discount';
import { Money, Variant } from '@/lib/launchpad/shared/product/index';
import { Tax } from '@/lib/launchpad/shared/cart/Tax';
import { TaxRate } from '@/lib/launchpad/shared/cart/TaxRate';

export interface LineItem {
  lineItemId?: string;
  productId?: string;
  productSlug?: string;
  name?: string;
  type?: string;
  count?: number;
  price?: Money; // Price of a single item
  discountedPrice?: ProductDiscountedPrice; // Discounted price per item
  discountedPricePerCount?: DiscountedPricePerCount[];
  totalPrice?: Money;
  taxed?: Tax;
  taxRate?: TaxRate;
  variant?: Variant;
  isGift?: boolean;
  _url?: string;
}
