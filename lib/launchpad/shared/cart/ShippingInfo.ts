import { Money } from '@/lib/launchpad/shared/product/index';
import { Tax } from '@/lib/launchpad/shared/cart/Tax';
import { DiscountedPrice } from '@/lib/launchpad/shared/cart/Discount';
import { ShippingRate } from '@/lib/launchpad/shared/cart/ShippingRate';
import { TaxRate } from '@/lib/launchpad/shared/cart/TaxRate';

export interface ShippingInfo {
  shippingMethodId?: string;
  name?: string;
  price?: Money;
  rate?: ShippingRate;
  taxRate?: TaxRate;
  taxed?: Tax;
  discountedPrice?: DiscountedPrice;
}
