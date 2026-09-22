"use client";
import { FC, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';

/** Wording shoppers recognise from Magento's review widget. */
export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export interface RatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  name?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
}

const RatingInput: FC<RatingInputProps> = ({
  value,
  onChange,
  name = 'rating',
  disabled,
  error,
  id = 'review-rating',
}) => {
  const [hovered, setHovered] = useState(0);
  const preview = hovered || value;

  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-8 text-14 font-medium leading-loose text-gray-600">Your rating *</legend>

      <div className="flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-2" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <label
              key={rating}
              className={classnames('relative block', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
              onMouseEnter={() => setHovered(rating)}
            >
              <input
                type="radio"
                name={name}
                value={rating}
                checked={value === rating}
                onChange={() => onChange(rating)}
                disabled={disabled}
                aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'} — ${RATING_LABELS[rating]}`}
                className="peer absolute inset-0 m-0 size-full cursor-[inherit] opacity-0"
              />
              <StarIcon
                className={classnames(
                  // The scaled star would otherwise paint over the input and swallow clicks.
                  'pointer-events-none size-32 rounded-sm transition',
                  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gray-700',
                  rating <= preview ? 'text-yellow-500' : 'text-neutral-400',
                  !disabled && rating <= hovered ? 'scale-110' : 'scale-100',
                )}
              />
            </label>
          ))}
        </div>

        <span className={classnames('text-14', preview ? 'font-medium text-gray-700' : 'text-gray-500')}>
          {preview ? `${preview} / 5 — ${RATING_LABELS[preview]}` : 'Select a rating'}
        </span>
      </div>

      {error && (
        <p className="mt-6 text-12 font-medium text-red-500" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default RatingInput;
