"use client";
import { FC } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import type { ProductRatingSummary } from '@/lib/types';

export interface RatingBreakdownProps {
  summary: ProductRatingSummary;
}

/** Magento-style histogram: one bar per whole-star rating, highest first. */
const RatingBreakdown: FC<RatingBreakdownProps> = ({ summary }) => (
  <ul className="flex w-full flex-col gap-6">
    {[5, 4, 3, 2, 1].map((rating) => {
      const count = summary.distribution[rating] ?? 0;
      const share = summary.count ? Math.round((count / summary.count) * 100) : 0;

      return (
        <li key={rating} className="flex items-center gap-10">
          <span className="flex w-34 shrink-0 items-center gap-2 text-13 text-gray-600">
            {rating}
            <StarIcon className="size-12 text-yellow-500" />
          </span>

          <span
            className="h-8 grow overflow-hidden rounded-full bg-neutral-300"
            role="img"
            aria-label={`${rating} stars: ${count} ${count === 1 ? 'review' : 'reviews'} (${share}%)`}
          >
            <span
              className="block h-full rounded-full bg-yellow-500 transition-[width] duration-500"
              style={{ width: `${share}%` }}
            />
          </span>

          <span className="w-28 shrink-0 text-right text-13 tabular-nums text-gray-600">{count}</span>
        </li>
      );
    })}
  </ul>
);

export default RatingBreakdown;
