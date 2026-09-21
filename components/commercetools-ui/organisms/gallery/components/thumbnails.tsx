"use client";
import { FC, useCallback, useEffect, useRef } from 'react';
import Image from '@/components/commercetools-ui/atoms/image/index';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';

export interface ThumbnailsProps {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  alt?: string;
  suffix?: string;
  size?: 'default' | 'compact';
  className?: string;
}

const Thumbnails: FC<ThumbnailsProps> = ({
  images,
  activeIndex,
  onSelect,
  alt = '',
  suffix,
  size = 'default',
  className = '',
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const setItemRef = useCallback(
    (index: number) => (element: HTMLButtonElement | null) => {
      itemsRef.current[index] = element;
    },
    [],
  );

  // Keep the selected thumbnail centred without ever scrolling the page itself.
  useEffect(() => {
    const rail = railRef.current;
    const item = itemsRef.current[activeIndex];
    if (!rail || !item) return;

    const target = item.offsetLeft - rail.clientWidth / 2 + item.clientWidth / 2;
    const maxScroll = rail.scrollWidth - rail.clientWidth;

    rail.scrollTo({ left: Math.min(Math.max(target, 0), Math.max(maxScroll, 0)), behavior: 'smooth' });
  }, [activeIndex]);

  const railClassName = useClassNames([
    'flex snap-x snap-mandatory gap-10 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    className,
  ]);

  const itemSizeClassName = size === 'compact' ? 'size-64 md:size-72' : 'size-72 md:size-88';

  if (images.length < 2) return null;

  return (
    <div ref={railRef} className={railClassName} role="group" aria-label="Product image thumbnails">
      {images.map((image, index) => {
        const isActive = index === activeIndex;

        return (
          <button
            key={`${image}-${index}`}
            ref={setItemRef(index)}
            type="button"
            aria-label={`Show image ${index + 1} of ${images.length}`}
            aria-current={isActive}
            data-testid={`thumbnail-${index}`}
            onClick={() => onSelect(index)}
            className={classnames(
              'relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-md border-solid bg-white p-4 transition',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700',
              itemSizeClassName,
              isActive
                ? 'border-2 border-gray-700 opacity-100'
                : 'border border-neutral-400 opacity-70 hover:border-gray-500 hover:opacity-100',
            )}
          >
            <span className="relative block size-full">
              <Image
                src={image}
                suffix={suffix}
                alt={alt}
                fill
                sizes="96px"
                loading="lazy"
                style={{ objectFit: 'contain' }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Thumbnails;
