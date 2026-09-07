"use client";
import { FC } from 'react';
import { ArrowLongRightIcon } from '@heroicons/react/24/outline';
import Image from '@/components/commercetools-ui/atoms/image/index';
import useImageSizes from '@/lib/launchpad/helpers/hooks/useImageSizes/index';
import { ContentSliderSlideProps } from '@/components/commercetools-ui/organisms/content-slider/types';
import Link from '@/components/commercetools-ui/atoms/link/index';

const ContentSliderSlide: FC<ContentSliderSlideProps> = ({ image, title, ctaLabel, summary, ctaReference }) => {
  const tileImageSizes = useImageSizes({ defaultSize: 0.25 });

  return (
    <Link link={ctaReference} className="w-full overflow-hidden">
      {image && (
        <div className="relative h-220 md:h-356">
          <div className="absolute z-10 size-full rounded-md bg-black opacity-20"></div>
          <Image {...image} sizes={tileImageSizes} className="mb-5 rounded-md" fill style={{ objectFit: 'cover' }} />
        </div>
      )}
      {title && (
        <h4 className="mt-12 max-w-[90%] overflow-hidden text-ellipsis whitespace-pre text-20 text-primary">{title}</h4>
      )}
      {summary && <p className="mt-12 leading-[24px]">{summary}</p>}
      {ctaLabel && (
        <div className="mt-20 flex gap-1.5">
          <p className="hidden text-black md:block">{ctaLabel}</p>
          <ArrowLongRightIcon className="mt-2 h-20 w-24 text-gray-600" />
        </div>
      )}
    </Link>
  );
};

export default ContentSliderSlide;
