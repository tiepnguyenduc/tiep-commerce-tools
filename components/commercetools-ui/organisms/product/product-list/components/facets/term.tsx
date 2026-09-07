"use client";
import React, { useMemo } from 'react';
import Checkbox from '@/components/commercetools-ui/atoms/checkbox/index';
import { FacetProps } from '@/components/commercetools-ui/organisms/product/product-list/components/facets/types';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list/context/index';
import { TermFacet as TermFacetType } from '@/components/commercetools-ui/organisms/product/product-list/types/index';

const TermFacet: React.FC<FacetProps> = ({ attribute }) => {
  const { facetsConfiguration, refine } = useProductList();

  const facet = useMemo(() => facetsConfiguration[attribute] as TermFacetType, [facetsConfiguration, attribute]);

  return (
    <div className="flex flex-col gap-47 py-22 lg:min-w-340">
      {facet.terms.map((term) => (
        <div key={term.identifier} className="flex items-center justify-between gap-8">
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
  );
};

export default TermFacet;
