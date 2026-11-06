import { buildReview } from '../../test-utils/fixtures';
import {
  buildReviewUpdateActions,
  buildReviewsWhere,
} from './use-reviews-connector';

describe('buildReviewsWhere', () => {
  it('should not filter by default', () => {
    expect(
      buildReviewsWhere({ visibility: 'all', rating: '' })
    ).toBeUndefined();
  });

  it('should combine the visibility and rating filters', () => {
    expect(buildReviewsWhere({ visibility: 'visible', rating: '5' })).toBe(
      'includedInStatistics = true and rating = 5'
    );
  });
});

describe('buildReviewUpdateActions', () => {
  const review = buildReview({ id: 'r1' });
  const values = {
    authorName: 'Jane',
    title: 'Great chair',
    text: 'Comfortable and sturdy.',
    rating: '4',
  };

  it('should send nothing when nothing changed', () => {
    expect(buildReviewUpdateActions(review, values)).toEqual([]);
  });

  it('should clear emptied fields and convert the rating', () => {
    expect(
      buildReviewUpdateActions(review, {
        ...values,
        authorName: '  ',
        rating: '2',
      })
    ).toEqual([
      { setAuthorName: { authorName: null } },
      { setRating: { rating: 2 } },
    ]);
  });
});
