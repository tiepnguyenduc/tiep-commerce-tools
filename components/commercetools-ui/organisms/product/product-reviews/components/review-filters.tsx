"use client";
import { FC } from 'react';
import { MagnifyingGlassIcon, PhotoIcon, StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Input from '@/components/commercetools-ui/atoms/input/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';
import type { ProductReviewFacets, ProductReviewQuery, ReviewSortOrder } from '@/lib/types';

const SORT_OPTIONS: { value: ReviewSortOrder; label: string }[] = [
  { value: 'newest', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
];

const chipClassName = (active: boolean, disabled: boolean) =>
  classnames(
    'flex items-center gap-4 rounded-full border px-12 py-6 text-13 transition',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700',
    active ? 'border-gray-700 bg-gray-700 text-white' : 'border-neutral-500 bg-white text-gray-600',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-600',
  );

export interface ReviewFiltersProps {
  query: ProductReviewQuery;
  facets: ProductReviewFacets;
  /** Live value of the search box; the request itself is debounced. */
  searchValue: string;
  resultCount: number;
  busy?: boolean;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<ProductReviewQuery>) => void;
  onReset: () => void;
}

/** Search, rating and media filters plus the sort order for the review list. */
const ReviewFilters: FC<ReviewFiltersProps> = ({
  query,
  facets,
  searchValue,
  resultCount,
  busy = false,
  onSearchChange,
  onChange,
  onReset,
}) => {
  const ratings = query.ratings ?? [];
  const filtered = !!searchValue.trim() || ratings.length > 0 || !!query.withMedia;

  const toggleRating = (rating: number) =>
    onChange({
      ratings: ratings.includes(rating) ? ratings.filter((value) => value !== rating) : [...ratings, rating],
    });

  return (
    <div className="mt-24 rounded-lg border border-neutral-400 bg-white p-16 md:p-20">
      <div className="flex flex-col gap-12 md:flex-row md:items-center">
        <div className="grow md:max-w-[360px]">
          <Input
            type="search"
            name="review-search"
            aria-label="Search reviews"
            placeholder="Search reviews"
            value={searchValue}
            hideCheckIcon
            containerClassName="w-full"
            className="pr-36"
            renderEndIcon={() => (
              <MagnifyingGlassIcon
                className="pointer-events-none absolute right-12 top-1/2 size-18 -translate-y-1/2 text-gray-500"
                aria-hidden
              />
            )}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-8 md:ml-auto">
          <label className="shrink-0 text-13 text-gray-500" htmlFor="review-sort">
            Sort by
          </label>
          <select
            id="review-sort"
            className="ct-ui h-40 rounded-md border border-neutral-500 bg-white px-12 text-14 text-gray-700 focus:border-gray-500 focus:ring-0"
            value={query.sort ?? 'newest'}
            onChange={(event) => onChange({ sort: event.target.value as ReviewSortOrder })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-8">
        <button
          type="button"
          className={chipClassName(!ratings.length, false)}
          aria-pressed={!ratings.length}
          onClick={() => onChange({ ratings: [] })}
        >
          All ratings
          <span className="tabular-nums opacity-70">{facets.total}</span>
        </button>

        {[5, 4, 3, 2, 1].map((rating) => {
          const count = facets.distribution[rating] ?? 0;

          return (
            <button
              key={rating}
              type="button"
              disabled={!count}
              className={chipClassName(ratings.includes(rating), !count)}
              aria-pressed={ratings.includes(rating)}
              aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}, ${count} ${count === 1 ? 'review' : 'reviews'}`}
              onClick={() => toggleRating(rating)}
            >
              {rating}
              <StarIcon className={classnames('size-14', ratings.includes(rating) ? 'text-white' : 'text-yellow-500')} aria-hidden />
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={!facets.withMedia}
          className={chipClassName(!!query.withMedia, !facets.withMedia)}
          aria-pressed={!!query.withMedia}
          onClick={() => onChange({ withMedia: !query.withMedia })}
        >
          <PhotoIcon className="size-14" aria-hidden />
          With photos or video
          <span className="tabular-nums opacity-70">{facets.withMedia}</span>
        </button>

        {filtered && (
          <button
            type="button"
            className="flex items-center gap-4 rounded-full px-10 py-6 text-13 text-gray-600 underline underline-offset-4 transition hover:text-gray-700"
            onClick={onReset}
          >
            <XMarkIcon className="size-14" aria-hidden />
            Clear filters
          </button>
        )}
      </div>

      {filtered && (
        <p className="mt-10 text-13 text-gray-500" aria-live="polite">
          {busy
            ? 'Updating reviews…'
            : `${resultCount} of ${facets.total} ${facets.total === 1 ? 'review' : 'reviews'} match your filters`}
        </p>
      )}
    </div>
  );
};

export default ReviewFilters;
