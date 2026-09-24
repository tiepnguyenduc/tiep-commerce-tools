"use client";
import { FC } from 'react';
import RatingStars from '@/components/commercetools-ui/organisms/product/product-reviews/components/rating-stars';
import ReviewMediaGallery from '@/components/commercetools-ui/organisms/product/product-reviews/components/review-media-gallery';
import type { ProductReview } from '@/lib/types';

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export interface ReviewCardProps {
  review: ProductReview;
  /** Highlights the review the shopper just published. */
  highlighted?: boolean;
}

const ReviewCard: FC<ReviewCardProps> = ({ review, highlighted }) => (
  <article
    className={
      highlighted
        ? 'rounded-lg border border-green-500 bg-green-100 p-16 transition'
        : 'border-0 border-b border-neutral-400 py-20 last:border-b-0'
    }
  >
    <div className="flex flex-wrap items-center gap-10">
      <span
        aria-hidden
        className="flex size-36 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-14 font-semibold uppercase text-gray-700"
      >
        {review.authorName.trim().charAt(0) || '?'}
      </span>

      <div className="min-w-0">
        <p className="truncate text-14 font-medium text-gray-700">{review.authorName}</p>
        <time className="text-12 text-gray-500" dateTime={review.createdAt}>
          {dateFormatter.format(new Date(review.createdAt))}
        </time>
      </div>

      {review.rating !== undefined && (
        <RatingStars className="ml-auto" rating={review.rating} size="s" label={`Rated ${review.rating} out of 5`} />
      )}
    </div>

    {review.title && <h3 className="mt-12 text-16 font-semibold text-gray-700">{review.title}</h3>}

    <p className="mt-6 whitespace-pre-wrap text-14 leading-loose text-gray-600 [overflow-wrap:anywhere]">
      {review.text}
    </p>

    <ReviewMediaGallery media={review.media ?? []} authorName={review.authorName} />
  </article>
);

export default ReviewCard;
