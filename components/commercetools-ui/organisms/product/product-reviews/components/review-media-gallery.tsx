"use client";
import { FC, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlayCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/commercetools-ui/atoms/button/index';
import Modal from '@/components/commercetools-ui/organisms/modal/index';
import type { ReviewMedia } from '@/lib/types';

export interface ReviewMediaGalleryProps {
  media: ReviewMedia[];
  /** Named in the labels so a screen reader knows whose photo this is. */
  authorName: string;
}

const describe = (item: ReviewMedia, index: number, total: number, authorName: string) =>
  `${item.type === 'video' ? 'Video' : 'Photo'} ${index + 1} of ${total} from ${authorName}`;

/** Media attached to a published review, expanding into a lightbox. */
const ReviewMediaGallery: FC<ReviewMediaGalleryProps> = ({ media, authorName }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!media.length) return null;

  const active = openIndex === null ? null : media[openIndex];
  const step = (delta: number) => setOpenIndex((current) => (current === null ? current : (current + delta + media.length) % media.length));

  return (
    <>
      <ul className="m-0 mt-12 flex list-none flex-wrap gap-8 p-0">
        {media.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className="block size-72 overflow-hidden rounded-md border border-neutral-400 bg-neutral-200 transition hover:border-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700"
              aria-label={`Open ${describe(item, index, media.length, authorName)}`}
              onClick={() => setOpenIndex(index)}
            >
              {item.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
              ) : (
                <span className="relative block size-full">
                  <video src={item.url} className="size-full object-cover" muted playsInline preload="metadata" />
                  <PlayCircleIcon className="absolute left-1/2 top-1/2 size-26 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" aria-hidden />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <Modal
          isOpen
          preventScroll
          onRequestClose={() => setOpenIndex(null)}
          contentLabel={describe(active, openIndex as number, media.length, authorName)}
          className="ct-ui"
          style={{
            content: { width: 'min(880px, 94vw)', maxWidth: '94vw', padding: 0, border: 0, background: '#fff' },
            overlay: { backgroundColor: 'rgba(17, 23, 20, 0.7)' },
          }}
        >
          <div
            className="relative"
            onKeyDown={(event) => {
              if (media.length < 2) return;
              if (event.key === 'ArrowRight') step(1);
              if (event.key === 'ArrowLeft') step(-1);
            }}
          >
            <div className="flex min-h-[320px] max-h-[78vh] items-center justify-center bg-neutral-900">
              {active.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.url}
                  alt={describe(active, openIndex as number, media.length, authorName)}
                  // Never upscale a small photo; letterbox it instead.
                  className="max-h-[78vh] max-w-full object-contain"
                />
              ) : (
                <video src={active.url} className="max-h-[78vh] max-w-full" controls autoPlay playsInline />
              )}
            </div>

            <Button
              variant="secondary"
              size="icon"
              type="button"
              aria-label="Close media"
              className="!absolute right-12 top-12 !rounded-full"
              onClick={() => setOpenIndex(null)}
            >
              <XMarkIcon className="size-20" />
            </Button>

            {media.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  aria-label="Previous media"
                  className="!absolute left-12 top-1/2 -translate-y-1/2 !rounded-full"
                  onClick={() => step(-1)}
                >
                  <ChevronLeftIcon className="size-20" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  aria-label="Next media"
                  className="!absolute right-12 top-1/2 -translate-y-1/2 !rounded-full"
                  onClick={() => step(1)}
                >
                  <ChevronRightIcon className="size-20" />
                </Button>
              </>
            )}

            <p className="px-16 py-12 text-13 text-gray-500" aria-live="polite">
              {describe(active, openIndex as number, media.length, authorName)}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ReviewMediaGallery;
