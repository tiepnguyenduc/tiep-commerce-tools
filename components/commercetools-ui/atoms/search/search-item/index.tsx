"use client";
import React, { useCallback, useMemo } from 'react';
// import { Variant } from 'ct-types/product';
import Image from '@/components/commercetools-ui/atoms/image/index';
import { trackEvent } from '@/lib/launchpad/helpers/analytics/index';
import { AUTOCOMPLETE_PRODUCT_CLICKED } from '@/lib/launchpad/helpers/constants/events';
import { useRouter } from '@/lib/launchpad/i18n/routing';
// import useVariantWithDiscount from 'helpers/hooks/useVariantWithDiscount';
import { Category } from '@/lib/launchpad/types/entity/category';
import { Product } from '@/lib/launchpad/types/entity/product';
import Link from '@/components/commercetools-ui/atoms/link/index';

// import Prices from '../prices';

interface Props {
  hit: Product;
  categories: Category[];
  onClick?: () => void;
}

const SearchItem: React.FC<Props> = ({ hit, categories, onClick }) => {
  const router = useRouter();

  const primaryCategory = useMemo(
    () => categories.find((category) => category.categoryId === hit.categories?.[0]?.categoryId),
    [categories, hit],
  );

  const variant = useMemo(() => hit.variants?.[0], [hit]);
  // const discountedVariant = useVariantWithDiscount(hit.variants as Partial<Variant>[]);

  const handleClick = useCallback(() => {
    onClick?.();

    trackEvent(AUTOCOMPLETE_PRODUCT_CLICKED, hit);

    router.push(hit._url ?? '#');
  }, [hit, onClick, router]);

  return (
    <Link link={hit._url} onMouseUp={handleClick}>
      <div className="flex items-center gap-12">
        <div className="shrink-0 p-8">
          <div className="relative h-90 w-80">
            <Image src={variant?.images?.[0]} suffix="small" style={{ objectFit: 'contain' }} fill />
          </div>
        </div>
        <div>
          <p className="text-16 uppercase text-primary">{hit.name}</p>
          <div className="mt-5">
            <span className="text-14 text-gray-600">{primaryCategory?.name}</span>
            {/* <Prices price={discountedVariant?.price ?? variant?.price} discountedPrice={discountedVariant?.price} /> */}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default SearchItem;
