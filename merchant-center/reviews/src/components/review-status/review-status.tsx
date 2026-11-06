import { useIntl } from 'react-intl';
import Stamp, { type TTone } from '@commercetools-uikit/stamp';
import { MODERATION_STATE_KEYS } from '../../constants';
import type { TReviewRow } from '../../types';
import messages from './messages';

export type TReviewStatus = keyof typeof messages;

/**
 * The storefront only lists reviews counted in the rating statistics, so
 * `includedInStatistics` decides whether a review is visible to shoppers.
 */
export const getReviewStatus = (
  review: Pick<TReviewRow, 'includedInStatistics' | 'state'>
): TReviewStatus => {
  if (!review.includedInStatistics) return 'hidden';
  if (review.state?.key === MODERATION_STATE_KEYS.approved) return 'approved';
  return 'published';
};

const TONES: Record<TReviewStatus, TTone> = {
  approved: 'positive',
  published: 'information',
  hidden: 'critical',
};

type TReviewStatusProps = {
  review: Pick<TReviewRow, 'includedInStatistics' | 'state'>;
};

const ReviewStatus = (props: TReviewStatusProps) => {
  const intl = useIntl();
  const status = getReviewStatus(props.review);
  return (
    <Stamp
      isCondensed
      tone={TONES[status]}
      label={intl.formatMessage(messages[status])}
    />
  );
};
ReviewStatus.displayName = 'ReviewStatus';

export default ReviewStatus;
