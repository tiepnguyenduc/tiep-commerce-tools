"use client";
import { FC, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/commercetools-ui/atoms/button/index';
import Image from '@/components/commercetools-ui/atoms/image/index';
import Modal from '@/components/commercetools-ui/organisms/modal/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';
import Thumbnails from '@/components/commercetools-ui/organisms/gallery/components/thumbnails';
import useSnapSlider from '@/components/commercetools-ui/organisms/gallery/hooks/useSnapSlider';

export interface GalleryLightboxProps {
  images: string[];
  initialIndex?: number;
  title?: string;
  alt?: string;
  imageSuffix?: string;
  thumbnailSuffix?: string;
  onClose: (lastIndex: number) => void;
}

const GalleryLightbox: FC<GalleryLightboxProps> = ({
  images,
  initialIndex = 0,
  title,
  alt = '',
  imageSuffix,
  thumbnailSuffix,
  onClose,
}) => {
  const { sliderRef, activeIndex, slideTo, slideBy, onScroll, isFirst, isLast } = useSnapSlider({
    length: images.length,
    initialIndex,
  });

  const [zoomed, setZoomed] = useState(false);
  const activeIndexRef = useRef(activeIndex);

  activeIndexRef.current = activeIndex;

  const close = useCallback(() => onClose(activeIndexRef.current), [onClose]);

  // Panning the magnified image follows the pointer without re-rendering.
  const handlePointerMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!zoomed) return;

      const layer = event.currentTarget.querySelector<HTMLElement>('[data-zoom-layer]');
      if (!layer) return;

      const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
      layer.style.transformOrigin = `${((event.clientX - left) / width) * 100}% ${((event.clientY - top) / height) * 100}%`;
    },
    [zoomed],
  );

  useEffect(() => setZoomed(false), [activeIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') slideBy(1);
      else if (event.key === 'ArrowLeft') slideBy(-1);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slideBy]);

  const hasMultipleImages = images.length > 1;

  return (
    <Modal
      isOpen
      preventScroll
      shouldCloseOnOverlayClick
      onRequestClose={close}
      contentLabel={title ? `${title} image preview` : 'Product image preview'}
      className="flex flex-col"
      style={{
        content: {
          width: 'min(1180px, 96vw)',
          maxWidth: '96vw',
          height: 'min(92vh, 940px)',
          padding: 0,
          border: 0,
          background: '#fff',
        },
        overlay: { backgroundColor: 'rgba(17, 23, 20, 0.82)' },
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-16 border-0 border-b border-solid border-neutral-400 px-16 py-12 md:px-24">
        <div className="min-w-0">
          {title && <p className="truncate text-14 font-medium text-gray-700 md:text-16">{title}</p>}
          {hasMultipleImages && (
            <p className="text-12 text-gray-500" aria-live="polite">
              Image {activeIndex + 1} of {images.length}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-8">
          <Button
            variant="secondary"
            size="icon"
            type="button"
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            aria-pressed={zoomed}
            className="!rounded-full"
            onClick={() => setZoomed((current) => !current)}
          >
            {zoomed ? (
              <MagnifyingGlassMinusIcon className="size-20" />
            ) : (
              <MagnifyingGlassPlusIcon className="size-20" />
            )}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            type="button"
            aria-label="Close image preview"
            className="!rounded-full"
            onClick={close}
          >
            <XMarkIcon className="size-20" />
          </Button>
        </div>
      </header>

      <div className="relative min-h-0 grow bg-white">
        <div
          ref={sliderRef}
          onScroll={onScroll}
          className={classnames(
            'flex size-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            zoomed ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden',
          )}
        >
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="relative size-full shrink-0 snap-center snap-always overflow-hidden p-12 md:p-24"
              onMouseMove={handlePointerMove}
              onDoubleClick={() => setZoomed((current) => !current)}
            >
              <div
                data-zoom-layer
                className={classnames(
                  'relative size-full transition-transform duration-300 ease-out',
                  zoomed ? 'scale-[2] cursor-zoom-out' : 'scale-100 cursor-zoom-in',
                )}
              >
                <Image
                  src={image}
                  suffix={imageSuffix}
                  alt={alt}
                  fill
                  sizes="(max-width: 1180px) 96vw, 1180px"
                  priority={index === initialIndex}
                  loading={index === initialIndex ? 'eager' : 'lazy'}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          ))}
        </div>

        {hasMultipleImages && !zoomed && (
          <>
            <Button
              variant="secondary"
              size="icon"
              type="button"
              aria-label="Previous image"
              disabled={isFirst}
              className="!absolute left-12 top-1/2 -translate-y-1/2 !rounded-full shadow-300 disabled:opacity-40 md:left-20"
              onClick={() => slideBy(-1)}
            >
              <ChevronLeftIcon className="size-20" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              type="button"
              aria-label="Next image"
              disabled={isLast}
              className="!absolute right-12 top-1/2 -translate-y-1/2 !rounded-full shadow-300 disabled:opacity-40 md:right-20"
              onClick={() => slideBy(1)}
            >
              <ChevronRightIcon className="size-20" />
            </Button>
          </>
        )}
      </div>

      {hasMultipleImages && (
        <div className="flex shrink-0 justify-center border-0 border-t border-solid border-neutral-400 px-16 py-12 md:px-24">
          <Thumbnails
            images={images}
            activeIndex={activeIndex}
            onSelect={(index) => slideTo(index)}
            alt={alt}
            suffix={thumbnailSuffix}
            size="compact"
            className="max-w-full"
          />
        </div>
      )}
    </Modal>
  );
};

export default GalleryLightbox;
