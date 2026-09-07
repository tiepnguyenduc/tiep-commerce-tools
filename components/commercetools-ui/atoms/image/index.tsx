"use client";
import React, { useMemo } from 'react';
import NextImage from 'next/image';
import { CldImage } from 'next-cloudinary';
import { useResolvedLocalizedObject } from '@/lib/launchpad/helpers/hooks/useResolvedLocalizedObject/index';
import useDimensions from '@/components/commercetools-ui/atoms/image/hooks/useDimensions/index';
import defaultLoader from '@/components/commercetools-ui/atoms/image/loaders/default/index';
import { ImageProps } from '@/components/commercetools-ui/atoms/image/types/index';

// Fallback image to use when no valid source is provided
const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

const getCropConfig = (gravity?: ImageProps['gravity']) => {
  if (gravity?.mode === 'custom' && gravity.coordinates) {
    return {
      type: 'fill' as const,
      x: gravity.coordinates.x,
      y: gravity.coordinates.y,
    };
  }
  return 'fill';
};

const Image = ({ media, ratio, gravity, suffix, src = '', width, height, alt = '', title, ...props }: ImageProps) => {
  const dimensions = useDimensions({ media, width, height, ...props });

  const resolvedTitle = useResolvedLocalizedObject(title ?? '');
  const resolvedAlt = useResolvedLocalizedObject(alt ?? '');

  const cropConfig = useMemo(() => getCropConfig(gravity), [gravity]);

  // Handle Cloudinary images (with mediaId)
  if (media?.mediaId) {
    return (
      <CldImage
        src={media.mediaId}
        alt={resolvedTitle || resolvedAlt}
        title={resolvedTitle}
        crop={cropConfig}
        gravity={gravity?.mode || 'auto'}
        aspectRatio={ratio}
        {...dimensions}
        {...props}
      />
    );
  }

  // Handle regular images with Next.js Image
  try {
    // Attempt to process the src with the loader
    const processedSrc = defaultLoader({ src, suffix });

    // If we got a valid URL, use it
    if (processedSrc && typeof processedSrc === 'string' && processedSrc.length > 0) {
      return <NextImage src={processedSrc} alt={resolvedAlt} title={resolvedTitle} {...dimensions} {...props} />;
    }
  } catch (error) {
    console.warn('Error processing image source:', error);
  }

  // Fallback to placeholder if anything goes wrong
  return <NextImage src={PLACEHOLDER_IMAGE} alt={resolvedAlt} title={resolvedTitle} {...dimensions} {...props} />;
};

export default Image;

export * from '@/components/commercetools-ui/atoms/image/types/index';
