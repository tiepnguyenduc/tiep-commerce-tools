"use client";
import React, { useMemo } from 'react';
import Checkbox from '@/components/commercetools-ui/atoms/checkbox/index';
import { FacetProps } from '@/components/commercetools-ui/organisms/product/product-list/components/facets/types';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list/context/index';
import { BooleanFacet as BooleanFacetType } from '@/components/commercetools-ui/organisms/product/product-list/types/index';

const BooleanFacet: React.FC<React.PropsWithChildren<FacetProps>> = ({ attribute }) => {
  const { facetsConfiguration, refine } = useProductList();

  const facet = useMemo(() => facetsConfiguration[attribute] as BooleanFacetType, [facetsConfiguration, attribute]);

  return (
    <div>
      <div className="flex flex-col gap-47 py-22 lg:min-w-340">
        {facet.terms
          .filter((term) => term.key === 'true')
          .map((term) => (
            <div key={term.key} className="flex items-center justify-between gap-8">
              <div>{term.label}</div>
              <div className="flex items-center gap-12">
                <Checkbox
                  checked={term.selected}
                  onChange={() => refine(attribute, term.key)}
                  label={term.count ? term.count.toString() : ''}
                  labelPosition="on-left"
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default BooleanFacet;
