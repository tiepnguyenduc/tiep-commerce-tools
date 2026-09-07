import { Account, Address } from '@/lib/launchpad/shared/account/index';
import { ResponseError, useAccount } from '@/lib/launchpad/frontastic/index';

export interface GetAccountResult {
  loggedIn: boolean;
  accountLoading: boolean;
  account?: Account;
  error?: ResponseError;
}

export interface UpdateAccount {
  firstName?: string;
  lastName?: string;
  email?: string;
  salutation?: string;
  birthdayYear?: number;
  birthdayMonth?: number;
  birthdayDay?: number;
}

export interface RegisterAccount extends UpdateAccount {
  email: string;
  password: string;
  billingAddress?: Address;
  shippingAddress?: Address;
}

export type UseAccountReturn = ReturnType<typeof useAccount>;
