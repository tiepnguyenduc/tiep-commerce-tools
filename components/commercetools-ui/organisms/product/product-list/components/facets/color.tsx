"use client";
import React, { useMemo } from 'react';
import { PopoverButton } from '@headlessui/react';
import { useTranslations } from 'use-intl';
import { textToColor } from '@/lib/launchpad/helpers/textToColor/textToColor';
import { FacetProps } from '@/components/commercetools-ui/organisms/product/product-list/components/facets/types';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list/context/index';
import { ColorFacet as ColorFacetType } from '@/components/commercetools-ui/organisms/product/product-list/types/index';

const ColorFacet: React.FC<FacetProps> = ({ attribute }) => {
  const { facetsConfiguration, refine } = useProductList();
  const translate = useTranslations();

  const facet = useMemo(() => facetsConfiguration[attribute] as ColorFacetType, [facetsConfiguration, attribute]);

  return (
    <div className="grid grid-cols-3 items-center justify-start gap-x-54 gap-y-32 lg:min-w-340">
      {facet.terms.map(({ identifier, key, selected, count }) => {
        const color = textToColor(key);
        return (
          <PopoverButton
            key={identifier}
            className="flex flex-col items-center py-2 text-center"
            onClick={() => refine(attribute, key)}
            aria-label={translate('product.switch-to-color', { color: color.label })}
          >
            <div
              className={`size-40 rounded-full outline outline-1 outline-offset-1 ${
                selected ? 'outline-gray-500' : 'outline-transparent'
              } ${['#ffffff', 'transparent'].includes(color.code.toLowerCase()) ? 'border border-gray-500' : ''}`}
              style={{ backgroundColor: color.code }}
            />
            <span className="mt-4 block max-w-full truncate text-14" title={color.label}>
              {color.label}
            </span>
            <span className="mt-2 block text-14 text-gray-600">{count}</span>
          </PopoverButton>
        );
      })}
    </div>
  );
};

export default ColorFacet;
