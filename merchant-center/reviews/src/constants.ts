// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

export const entryPointUriPath = 'product-reviews';

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);

/**
 * Review states used for moderation. A Review is counted in the product rating
 * statistics, and therefore shown by the storefront, unless its State lacks the
 * `ReviewIncludedInStatistics` role. Neither state is `initial`, so reviews
 * written on the storefront stay published until a merchant rejects them.
 */
export const MODERATION_STATE_KEYS = {
  approved: 'review-approved',
  rejected: 'review-rejected',
} as const;

export type TModerationDecision = keyof typeof MODERATION_STATE_KEYS;

export const RATINGS = [1, 2, 3, 4, 5] as const;
