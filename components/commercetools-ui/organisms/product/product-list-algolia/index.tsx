"use client";
import React, { useMemo } from 'react';
import { Configure, InfiniteHits } from 'react-instantsearch';
import { useTranslations } from 'use-intl';
import Wrapper from '@/lib/launchpad/components/HOC/wrapper/index';
import AccumalativeTrace from '@/components/commercetools-ui/organisms/product/product-list-algolia/components/accumalative-trace/index';
import Breadcrumbs from '@/components/commercetools-ui/organisms/product/product-list-algolia/components/breadcrumb/index';
import CurrentRefinements from '@/components/commercetools-ui/organisms/product/product-list-algolia/components/current-refinements/index';
import DesktopFacets from '@/components/commercetools-ui/organisms/product/product-list-algolia/components/desktop-facets/index';
import HitComponent from '@/components/commercetools-ui/organisms/product/product-list-algolia/components/hit-component/index';
import MobileFacets from '@/components/commercetools-ui/organisms/product/product-list-algolia/components/mobile-facets/index';
import SearchHeader from '@/components/commercetools-ui/organisms/product/product-list-algolia/components/search-header/index';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list-algolia/context/index';

interface Props {
  slug?: string;
  searchQuery?: string;
}

const ProductListAlgolia: React.FC<Props> = ({ slug, searchQuery }) => {
  const translate = useTranslations();

  const { categories, facetsConfiguration } = useProductList();

  const category = useMemo(() => categories.find((category) => category.slug === slug), [categories, slug]);

  return (
    <div className="min-h-screen bg-neutral-200 py-48">
      <Configure
        query={searchQuery ?? ''}
        filters={!!category ? `categories.id:${category.categoryId}` : ''}
        maxValuesPerFacet={1000}
      />

      {searchQuery ? (
        <Wrapper background="neutral-200">
          <SearchHeader query={searchQuery ?? ''} />
        </Wrapper>
      ) : (
        <Breadcrumbs categories={categories} categoryId={category?.categoryId} />
      )}

      <Wrapper className="relative" background="neutral-200">
        <MobileFacets facetsConfiguration={facetsConfiguration} />
        <DesktopFacets facetsConfiguration={facetsConfiguration} />

        <CurrentRefinements />

        <InfiniteHits
          showPrevious={false}
          hitComponent={HitComponent}
          classNames={{
            root: 'pt-32',
            list: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-16 lg:gap-24',
            loadMore:
              'mx-auto bg-primary rounded-md font-medium text-white text-16 px-48 py-12 block mt-[90px] hover:bg-gray-500 transition disabled:bg-neutral-400 disabled:opacity-0',
          }}
          translations={{
            showMoreButtonText: translate('product.load-more'),
          }}
        />

        <AccumalativeTrace />
      </Wrapper>
    </div>
  );
};

export default ProductListAlgolia;
