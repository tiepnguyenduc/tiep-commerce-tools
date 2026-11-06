import type {
  TFetchReviewsQuery,
  TReviewDetailsFragment,
} from './types/generated/ctp';

export type TReviewRow = TFetchReviewsQuery['reviews']['results'][number];

export type TReviewTarget = NonNullable<TReviewRow['target']>;

export type TReview = TReviewDetailsFragment;

export type TVisibilityFilter = 'all' | 'visible' | 'hidden';

export type TReviewFilters = {
  visibility: TVisibilityFilter;
  /** Whole star rating as a string, or `''` for any rating. */
  rating: string;
};

export type TFormValues = {
  authorName: string;
  title: string;
  text: string;
  /** Whole star rating as a string, as required by `SelectField`. */
  rating: string;
};
