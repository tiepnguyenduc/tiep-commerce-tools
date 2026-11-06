import { useIntl } from 'react-intl';
import { NO_VALUE_FALLBACK } from '@commercetools-frontend/constants';
import { RATINGS } from '../../constants';

type TRatingStarsProps = {
  rating?: number | null;
};

const RatingStars = (props: TRatingStarsProps) => {
  const intl = useIntl();
  if (typeof props.rating !== 'number') return <>{NO_VALUE_FALLBACK}</>;

  const stars = Math.max(0, Math.min(RATINGS.length, Math.round(props.rating)));
  return (
    <span
      title={intl.formatNumber(props.rating)}
      aria-label={`${props.rating} / ${RATINGS.length}`}
      style={{ whiteSpace: 'nowrap', color: '#f5a623' }}
    >
      {'★'.repeat(stars)}
      <span style={{ color: '#ccc' }}>
        {'★'.repeat(RATINGS.length - stars)}
      </span>
    </span>
  );
};
RatingStars.displayName = 'RatingStars';

export default RatingStars;
