import type { TFormValues, TReview } from '../../types';

export const docToFormValues = (review?: TReview | null): TFormValues => ({
  authorName: review?.authorName ?? '',
  title: review?.title ?? '',
  text: review?.text ?? '',
  rating: typeof review?.rating === 'number' ? String(review.rating) : '',
});
