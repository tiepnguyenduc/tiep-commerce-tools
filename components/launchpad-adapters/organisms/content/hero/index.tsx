"use client";
import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useButtonClassNames from '@/components/launchpad-adapters/atoms/button/useButtonClassNames';

export interface HeroProps {
  image: { src: string; gravity?: { coordinates?: { x: number; y: number }; mode?: string }; media?: { width: number; height: number } };
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaReference?: string;
  isPriority: boolean;
  imageQuality: number;
}

const Hero: React.FC<HeroProps> = ({ image, title, subtitle, ctaLabel, ctaReference, isPriority, imageQuality }) => {
  const ctaClassName = useButtonClassNames({ variant: 'primary', size: 'l', includesIcon: false, className: 'inline-block mt-22 md:mt-36 lg:mt-32' });
  const cropFocus = useMemo(() => {
    if (image.gravity?.coordinates) {
      const right = Math.ceil((image.gravity?.coordinates.x / (image.media?.width as number)) * 100);
      const top = Math.ceil((image.gravity?.coordinates.y / (image.media?.height as number)) * 100);

      return `right ${right.toString()}% top ${top.toString()}%`;
    }

    if (image.gravity?.mode === 'center') {
      return 'center';
    }

    return 'initial';
  }, [image]);

  return (
    <div className="relative w-full">
      {image && (
        <div className="relative h-296 md:h-[532px] lg:h-[668px]">
          <Image
            src={image.src}
            unoptimized
            alt={title}
            fill
            style={{ objectFit: 'cover', objectPosition: cropFocus }}
            className="brightness-75"
            priority={isPriority}
            fetchPriority={isPriority ? 'high' : 'auto'}
            quality={imageQuality}
          />
        </div>
      )}
      <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 px-48 text-center">
        <p className="text-center text-14 text-white md:text-18">{subtitle}</p>
        <h1 className="mt-22 text-center text-26 text-white md:mt-32 md:text-36 lg:text-58">{title}</h1>
        {ctaLabel && (
          <Link href={ctaReference ?? "/products"} className={ctaClassName}>
              <span className="text-12 text-neutral-150 md:text-14 lg:text-16">{ctaLabel}</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Hero;
