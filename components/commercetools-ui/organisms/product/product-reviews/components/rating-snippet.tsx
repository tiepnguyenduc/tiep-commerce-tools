"use client";
import { FC } from 'react';
import RatingStars from '@/components/commercetools-ui/organisms/product/product-reviews/components/rating-stars';
import type { ProductRatingSummary } from '@/lib/types';

const linkClassName =
  'cursor-pointer bg-transparent p-0 text-14 text-gray-600 underline underline-offset-4 transition hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700';

export interface RatingSnippetProps {
  summary: ProductRatingSummary | null;
  /** Reveals the reviews further down the page — they may sit in a closed tab. */
  onShowReviews: () => void;
  onWriteReview: () => void;
  className?: string;
}

/** The compact rating line Magento shows directly under the product title. */
const RatingSnippet: FC<RatingSnippetProps> = ({ summary, onShowReviews, onWriteReview, className = '' }) => {
  const count = summary?.count ?? 0;

  return (
    <div className={`ct-ui flex flex-wrap items-center gap-x-10 gap-y-4 text-14 ${className}`}>
      {count > 0 ? (
        <>
          <RatingStars rating={summary?.average ?? 0} size="s" />
          <span className="font-medium text-gray-700">{(summary?.average ?? 0).toFixed(1)}</span>
          <button type="button" onClick={onShowReviews} className={linkClassName}>
            {count} {count === 1 ? 'review' : 'reviews'}
          </button>
        </>
      ) : (
        <span className="text-gray-500">No reviews yet</span>
      )}

      <span aria-hidden className="text-neutral-500">
        |
      </span>

      <button type="button" onClick={onWriteReview} className={`${linkClassName} font-medium text-gray-700`}>
        {count > 0 ? 'Write a review' : 'Be the first to review'}
      </button>
    </div>
  );
};

export default RatingSnippet;
