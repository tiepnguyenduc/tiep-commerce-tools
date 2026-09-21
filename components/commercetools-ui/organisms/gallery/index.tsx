"use client";
import { FC, MouseEvent, useCallback, useEffect, useState } from 'react';
import { ArrowsPointingOutIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Button from '@/components/commercetools-ui/atoms/button/index';
import Image from '@/components/commercetools-ui/atoms/image/index';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';
import GalleryLightbox from '@/components/commercetools-ui/organisms/gallery/components/lightbox';
import Thumbnails from '@/components/commercetools-ui/organisms/gallery/components/thumbnails';
import useSnapSlider from '@/components/commercetools-ui/organisms/gallery/hooks/useSnapSlider';

interface GalleryProps {
  images: Array<string>;
  /** Compact layout used inside the quick-view / cart modals. */
  inModalVersion?: boolean;
  /** Shown as the lightbox title and used to build the image alt text. */
  productName?: string;
  /**
   * Suffixes appended to the file name before the extension (`image-large.jpg`).
   * Pass an empty string for sources that are already fully qualified URLs.
   */
  imageSuffix?: string;
  thumbnailSuffix?: string;
  /** Opens a fullscreen preview with a thumbnail strip. Off inside modals. */
  enableLightbox?: boolean;
  className?: string;
}

const Gallery: FC<GalleryProps> = ({
  images,
  inModalVersion,
  productName,
  imageSuffix = 'large',
  thumbnailSuffix = 'small',
  enableLightbox = !inModalVersion,
  className = '',
}) => {
  const { sliderRef, activeIndex, slideTo, slideBy, onScroll, isFirst, isLast } = useSnapSlider({
    length: images.length,
  });

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imagesKey = images.join('|');

  // A variant switch swaps the whole image set — always restart from the first shot.
  useEffect(() => {
    slideTo(0, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey]);

  // Desktop magnifier: the zoom follows the pointer without re-rendering the slider.
  const handlePointerMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const layer = event.currentTarget.querySelector<HTMLElement>('[data-zoom-layer]');
    if (!layer) return;

    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    layer.style.transformOrigin = `${((event.clientX - left) / width) * 100}% ${((event.clientY - top) / height) * 100}%`;
  }, []);

  const closeLightbox = useCallback(
    (lastIndex: number) => {
      setLightboxIndex(null);
      slideTo(lastIndex, 'auto');
    },
    [slideTo],
  );

  // `flex-col` rather than `grid`: the storefront ships a global `.grid` class
  // that would force a three column track onto the gallery.
  const containerClassName = useClassNames(['flex min-w-0 flex-col gap-12', className]);

  const stageClassName = useClassNames([
    'group/stage relative overflow-hidden rounded-lg border border-solid border-neutral-400 bg-white',
    inModalVersion ? 'h-[240px] md:h-[300px]' : 'h-[340px] sm:h-[420px] lg:h-[520px]',
  ]);

  const hasMultipleImages = images.length > 1;

  if (!images.length) return null;

  return (
    <div className={containerClassName} data-testid="product-gallery">
      <div className={stageClassName}>
        <div
          ref={sliderRef}
          onScroll={onScroll}
          className="flex size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className={classnames(
                'group/slide relative size-full shrink-0 snap-center snap-always overflow-hidden',
                inModalVersion ? 'p-8' : 'p-12 md:p-20',
              )}
              onMouseMove={enableLightbox ? handlePointerMove : undefined}
            >
              <div
                data-zoom-layer
                className={classnames(
                  'relative size-full transition-transform duration-500 ease-out',
                  enableLightbox ? 'lg:group-hover/slide:scale-[1.6]' : '',
                )}
              >
                <Image
                  data-testid={index === activeIndex ? 'main-gallery-image' : undefined}
                  src={image}
                  suffix={imageSuffix}
                  alt={productName ?? ''}
                  fill
                  sizes={inModalVersion ? '(max-width: 744px) 100vw, 400px' : '(max-width: 1024px) 100vw, 640px'}
                  priority={index === 0}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  style={{ objectFit: 'contain' }}
                />
              </div>

              {enableLightbox && (
                <button
                  type="button"
                  aria-label={`Open image ${index + 1} of ${images.length} in full screen`}
                  onClick={() => setLightboxIndex(index)}
                  className="absolute inset-0 size-full cursor-zoom-in bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-700"
                />
              )}
            </div>
          ))}
        </div>

        {hasMultipleImages && (
          <>
            <Button
              variant="secondary"
              size="icon"
              type="button"
              aria-label="Previous image"
              disabled={isFirst}
              className="!absolute left-12 top-1/2 hidden -translate-y-1/2 !rounded-full shadow-300 transition disabled:opacity-40 md:inline-flex"
              onClick={() => slideBy(-1)}
            >
              <ChevronLeftIcon className="size-18" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              type="button"
              aria-label="Next image"
              disabled={isLast}
              className="!absolute right-12 top-1/2 hidden -translate-y-1/2 !rounded-full shadow-300 transition disabled:opacity-40 md:inline-flex"
              onClick={() => slideBy(1)}
            >
              <ChevronRightIcon className="size-18" />
            </Button>

            <span
              aria-hidden
              className="pointer-events-none absolute bottom-12 right-12 rounded-full bg-gray-700/75 px-10 py-3 text-12 font-medium leading-normal text-white"
            >
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}

        {enableLightbox && (
          <Button
            variant="secondary"
            size="icon"
            type="button"
            aria-label="Open full screen image preview"
            className="!absolute bottom-12 left-12 !rounded-full shadow-300"
            onClick={() => setLightboxIndex(activeIndex)}
          >
            <ArrowsPointingOutIcon className="size-18" />
          </Button>
        )}
      </div>

      {hasMultipleImages && (
        <>
          <div className="flex items-center justify-center gap-4 md:hidden">
            {images.map((image, index) => (
              <button
                key={`dot-${image}-${index}`}
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === activeIndex}
                onClick={() => slideTo(index)}
                className="flex size-24 cursor-pointer items-center justify-center bg-transparent"
              >
                <span
                  className={classnames(
                    'block rounded-full transition-all',
                    index === activeIndex ? 'size-10 bg-gray-700' : 'size-8 bg-neutral-500',
                  )}
                />
              </button>
            ))}
          </div>

          <Thumbnails
            images={images}
            activeIndex={activeIndex}
            onSelect={(index) => slideTo(index)}
            alt={productName ?? ''}
            suffix={thumbnailSuffix}
            size={inModalVersion ? 'compact' : 'default'}
            className="hidden md:flex"
          />
        </>
      )}

      {lightboxIndex !== null && (
        <GalleryLightbox
          images={images}
          initialIndex={lightboxIndex}
          title={productName}
          alt={productName ?? ''}
          imageSuffix={imageSuffix}
          thumbnailSuffix={thumbnailSuffix}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

export default Gallery;
