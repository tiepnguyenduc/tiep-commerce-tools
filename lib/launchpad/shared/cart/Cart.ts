import { LineItem } from '@/lib/launchpad/shared/cart/LineItem';
import { Address, AccountGroup } from '@/lib/launchpad/shared/account/index';
import { Payment } from '@/lib/launchpad/shared/cart/Payment';
import { DirectDiscount, DiscountCode, DiscountOnTotalPrice } from '@/lib/launchpad/shared/cart/Discount';
import { Tax } from '@/lib/launchpad/shared/cart/Tax';
import { ShippingInfo } from '@/lib/launchpad/shared/cart/ShippingInfo';
import { Money } from '@/lib/launchpad/shared/product/index';
import { ShippingMethod } from '@/lib/launchpad/shared/cart/ShippingMethod';

export type CartOrigin = 'Customer' | 'Merchant';

export type CartState = 'Active' | 'Frozen' | 'Merged' | 'Ordered';

export interface Cart {
  cartId: string;
  cartVersion?: string;
  lineItems?: LineItem[];
  totalLineItemQuantity?: number;
  email?: string;
  shippingInfo?: ShippingInfo; // Info of the shipping method selected by the customer
  availableShippingMethods?: ShippingMethod[]; // Available shipping methods for this cart
  shippingAddress?: Address;
  billingAddress?: Address;
  itemShippingAddresses?: Address[];
  sum?: Money;
  payments?: Payment[];
  discountCodes?: DiscountCode[];
  directDiscounts?: DirectDiscount[];
  taxed?: Tax;
  origin?: CartOrigin;
  cartState?: CartState;
  accountId?: string;
  storeKey?: string;
  discountOnTotalPrice?: DiscountOnTotalPrice;
  accountGroup?: AccountGroup;
}
