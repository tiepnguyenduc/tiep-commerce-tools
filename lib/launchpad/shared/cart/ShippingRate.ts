import { ShippingLocation } from '@/lib/launchpad/shared/cart/ShippingLocation';
import { Money } from '@/lib/launchpad/shared/product/Money';

export interface ShippingRate {
  shippingRateId?: string;
  name?: string;
  locations?: ShippingLocation[]; // Shipping locations this rate applies to.
  price?: Money;
  freeAbove?: Money;
}
