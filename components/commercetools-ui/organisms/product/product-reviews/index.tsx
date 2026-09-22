"use client";
import { FC } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import Button from '@/components/commercetools-ui/atoms/button/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';
import RatingBreakdown from '@/components/commercetools-ui/organisms/product/product-reviews/components/rating-breakdown';
import RatingStars from '@/components/commercetools-ui/organisms/product/product-reviews/components/rating-stars';
import ReviewCard from '@/components/commercetools-ui/organisms/product/product-reviews/components/review-card';
import type { ProductRatingSummary, ProductReviewPage } from '@/lib/types';

export interface ProductReviewsProps {
  productName: string;
  page: ProductReviewPage | null;
  summary: ProductRatingSummary | null;
  loading?: boolean;
  listError?: string;
  /** Review published in this session, highlighted so it is easy to spot. */
  highlightedReviewId?: string;
  /** Drops the heading and outer spacing when a product tab already frames it. */
  embedded?: boolean;
  onRetry: () => void;
  onPageChange: (offset: number) => void;
  onWriteReview: () => void;
}

const ProductReviews: FC<ProductReviewsProps> = ({
  productName,
  page,
  summary,
  loading = false,
  listError = '',
  highlightedReviewId,
  embedded = false,
  onRetry,
  onPageChange,
  onWriteReview,
}) => {
  const total = summary?.count || page?.total || 0;
  const hasSummary = (summary?.count ?? 0) > 0;
  const showPagination = !!page && page.total > page.limit;

  const writeButton = (
    <Button
      variant="primary"
      type="button"
      icon={<PencilSquareIcon className="size-18" />}
      iconPosition="left"
      onClick={onWriteReview}
    >
      Write a review
    </Button>
  );

  return (
    <section
      className={classnames(
        'ct-ui min-w-0',
        embedded ? '' : 'col-span-full scroll-mt-100 border-0 border-t border-neutral-400 pt-32',
      )}
      id="product-reviews"
      aria-labelledby={embedded ? undefined : 'reviews-heading'}
      aria-label={embedded ? 'Customer reviews' : undefined}
    >
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-16">
          <div>
            <span className="text-12 font-bold uppercase tracking-[1.5px] text-gray-500">From our community</span>
            <h2 className="mt-8 text-24 font-semibold tracking-[-0.8px] text-gray-700 md:text-30" id="reviews-heading">
              Customer reviews
            </h2>
          </div>

          <div className="hidden md:block">{writeButton}</div>
        </div>
      )}

      {hasSummary && summary && (
        <div
          className={classnames(
            'flex flex-col gap-24 rounded-lg border border-neutral-400 bg-white p-20 md:flex-row md:items-center md:gap-40 md:p-24',
            embedded ? '' : 'mt-24',
          )}
        >
          <div className="flex shrink-0 flex-col items-center gap-6 md:w-180">
            <p className="text-44 font-semibold leading-tight text-gray-700">{summary.average.toFixed(1)}</p>
            <RatingStars rating={summary.average} size="m" label={`Average rating ${summary.average.toFixed(1)} out of 5`} />
            <p className="text-13 text-gray-500">
              Based on {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
            </p>

            {embedded && <div className="mt-8">{writeButton}</div>}
          </div>

          <div className="min-w-0 grow border-0 border-neutral-400 md:border-l md:pl-40">
            <RatingBreakdown summary={summary} />
          </div>
        </div>
      )}

      <div className="mt-24" aria-busy={loading}>
        {listError && (
          <div className="flex flex-wrap items-center justify-between gap-12 rounded-md bg-red-100 px-16 py-12" role="alert">
            <p className="text-14 font-medium text-red-700">{listError}</p>
            <Button variant="secondary" size="xs" type="button" disabled={loading} onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!listError && total === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-500 bg-white px-20 py-32 text-center">
            <h3 className="text-18 font-semibold text-gray-700">Be the first to review {productName}</h3>
            <p className="mx-auto mt-8 max-w-[420px] text-14 leading-loose text-gray-500">
              How does it fit into your everyday life? Your review helps other shoppers choose with confidence.
            </p>
            <div className="mt-20 flex justify-center">{writeButton}</div>
          </div>
        )}

        {page?.reviews.map((review) => (
          <ReviewCard key={review.id} review={review} highlighted={review.id === highlightedReviewId} />
        ))}

        {showPagination && page && (
          <nav className="mt-24 flex flex-wrap items-center justify-between gap-12" aria-label="Review pages">
            <Button
              variant="secondary"
              size="xs"
              type="button"
              disabled={loading || page.offset === 0}
              onClick={() => onPageChange(Math.max(0, page.offset - page.limit))}
            >
              Previous
            </Button>

            <span className="text-14 text-gray-500" aria-live="polite">
              {loading ? 'Loading…' : `${page.offset + 1}–${page.offset + page.reviews.length} of ${page.total}`}
            </span>

            <Button
              variant="secondary"
              size="xs"
              type="button"
              disabled={loading || page.offset + page.limit >= page.total || page.offset + page.limit > 10000}
              onClick={() => onPageChange(page.offset + page.limit)}
            >
              Next
            </Button>
          </nav>
        )}
      </div>

      {!embedded && total > 0 && <div className="mt-24 md:hidden">{writeButton}</div>}
    </section>
  );
};

export default ProductReviews;
