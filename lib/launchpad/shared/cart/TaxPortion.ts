import { Money } from '@/lib/launchpad/shared/product/Money';

export interface TaxPortion {
  amount?: Money;
  name?: string;

  /**
   * Rate number in the range [0..1]
   */
  rate?: number;
}
