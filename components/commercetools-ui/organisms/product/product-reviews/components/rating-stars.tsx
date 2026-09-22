"use client";
import { FC } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';

const SIZES = {
  s: 'size-14',
  m: 'size-18',
  l: 'size-24',
};

export interface RatingStarsProps {
  /** Supports fractions — 4.3 fills the fourth star by 30%. */
  rating: number;
  size?: keyof typeof SIZES;
  /** Omit the label when a neighbouring element already announces the score. */
  label?: string | false;
  className?: string;
}

const RatingStars: FC<RatingStarsProps> = ({ rating, size = 'm', label, className = '' }) => {
  const clamped = Math.min(Math.max(rating, 0), 5);
  const starClassName = classnames(SIZES[size], 'shrink-0');

  return (
    <span
      className={classnames('inline-flex items-center gap-2 align-middle', className)}
      role="img"
      aria-label={label === false ? undefined : (label ?? `Rated ${clamped.toFixed(1)} out of 5`)}
      aria-hidden={label === false || undefined}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.min(Math.max(clamped - index, 0), 1);

        return (
          <span key={index} className="relative inline-block">
            <StarIcon className={classnames(starClassName, 'text-neutral-400')} />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <StarIcon className={classnames(starClassName, 'text-yellow-500')} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
};

export default RatingStars;
