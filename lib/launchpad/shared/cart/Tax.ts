import { TaxPortion } from '@/lib/launchpad/shared/cart/TaxPortion';
import { Money } from '@/lib/launchpad/shared/product/Money';

export interface Tax {
  netAmount?: Money;
  grossAmount?: Money;
  taxAmount?: Money;
  name?: string;
  taxPortions?: TaxPortion[];
}
