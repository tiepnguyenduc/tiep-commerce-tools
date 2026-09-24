"use client";
import { FC, useRef, useState, type DragEvent } from 'react';
import { PhotoIcon, PlayCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/commercetools-ui/atoms/button/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';
import {
  REVIEW_MEDIA_ACCEPT,
  REVIEW_MEDIA_HINT,
  REVIEW_MEDIA_LIMITS,
  reviewMediaError,
  reviewMediaKind,
} from '@/lib/review-media';
import type { ReviewMediaType } from '@/lib/types';

export interface ReviewMediaDraft {
  /** Local key; the stored media gets its id from the server. */
  id: string;
  file: File;
  type: ReviewMediaType;
  /** Object URL backing the preview, revoked when the draft is dropped. */
  previewUrl: string;
}

export function createMediaDrafts(files: File[]): ReviewMediaDraft[] {
  return files.flatMap((file) => {
    const type = reviewMediaKind(file.type);
    if (!type) return [];

    return [{
      id: `${file.name}:${file.size}:${file.lastModified}:${Math.random().toString(36).slice(2, 8)}`,
      file,
      type,
      previewUrl: URL.createObjectURL(file),
    }];
  });
}

export function releaseMediaDrafts(drafts: ReviewMediaDraft[]) {
  for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export interface ReviewMediaFieldProps {
  media: ReviewMediaDraft[];
  onChange: (media: ReviewMediaDraft[]) => void;
  disabled?: boolean;
}

/** Lets a shopper back their review with photos or a short video. */
const ReviewMediaField: FC<ReviewMediaFieldProps> = ({ media, onChange, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const full =
    media.some((item) => item.type === 'video') || media.length >= REVIEW_MEDIA_LIMITS.maxImages;

  const add = (files: File[]) => {
    if (!files.length) return;

    // The rejected files never enter the draft, so the shopper keeps what worked.
    const candidates = [...media.map((item) => item.file), ...files];
    const message = reviewMediaError(candidates);
    setError(message ?? '');
    if (message) return;

    onChange([...media, ...createMediaDrafts(files)]);
  };

  const remove = (draft: ReviewMediaDraft) => {
    releaseMediaDrafts([draft]);
    setError('');
    onChange(media.filter((item) => item.id !== draft.id));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) add([...event.dataTransfer.files]);
  };

  return (
    <div>
      <p className="mb-8 text-14 font-medium leading-loose text-gray-600" id="review-media-label">
        Add photos or a video
      </p>

      <div
        className={classnames(
          'rounded-md border border-dashed px-16 py-20 text-center transition',
          dragging ? 'border-gray-600 bg-neutral-200' : 'border-neutral-500 bg-white',
          disabled ? 'opacity-60' : '',
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <PhotoIcon className="mx-auto size-24 text-gray-500" aria-hidden />
        <p className="mt-8 text-14 text-gray-600">Drag files here, or</p>

        <input
          ref={inputRef}
          type="file"
          name="media"
          className="sr-only"
          accept={REVIEW_MEDIA_ACCEPT}
          multiple
          disabled={disabled || full}
          aria-labelledby="review-media-label"
          aria-describedby="review-media-hint"
          onChange={(event) => {
            add([...(event.target.files ?? [])]);
            // Allow re-picking the same file after a removal.
            event.target.value = '';
          }}
        />

        <Button
          variant="secondary"
          size="xs"
          type="button"
          className="mt-10"
          disabled={disabled || full}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>

        <p className="mt-10 text-12 text-gray-500" id="review-media-hint">
          {REVIEW_MEDIA_HINT}
        </p>
      </div>

      {error && (
        <p className="mt-6 text-12 font-medium text-red-500" role="alert">
          {error}
        </p>
      )}

      {media.length > 0 && (
        <ul className="m-0 mt-12 flex list-none flex-wrap gap-12 p-0" aria-label="Attached media">
          {media.map((item) => (
            <li key={item.id} className="relative">
              <span className="block size-80 overflow-hidden rounded-md border border-neutral-400 bg-neutral-200">
                {item.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="relative block size-full">
                    <video src={item.previewUrl} className="size-full object-cover" muted playsInline preload="metadata" />
                    <PlayCircleIcon className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" aria-hidden />
                  </span>
                )}
              </span>

              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${item.file.name || (item.type === 'video' ? 'video' : 'photo')}`}
                className="absolute -right-6 -top-6 flex size-22 items-center justify-center rounded-full border border-neutral-400 bg-white text-gray-600 shadow-100 transition hover:bg-neutral-200 disabled:cursor-not-allowed"
                onClick={() => remove(item)}
              >
                <XMarkIcon className="size-14" />
              </button>

              <span className="mt-4 block w-80 truncate text-11 text-gray-500" title={item.file.name}>
                {formatSize(item.file.size)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReviewMediaField;
