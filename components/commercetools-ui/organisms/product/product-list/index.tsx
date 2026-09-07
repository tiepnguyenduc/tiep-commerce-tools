"use client";
import React, { useMemo } from 'react';
import Wrapper from '@/lib/launchpad/components/HOC/wrapper/index';
import { Cart } from '@/lib/launchpad/types/entity/cart';
import { Product } from '@/lib/launchpad/types/entity/product';
import AccumalativeTrace from '@/components/commercetools-ui/organisms/product/product-list/components/accumalative-trace/index';
import Breadcrumbs from '@/components/commercetools-ui/organisms/product/product-list/components/breadcrumb/index';
import CurrentRefinements from '@/components/commercetools-ui/organisms/product/product-list/components/current-refinements/index';
import DesktopFacets from '@/components/commercetools-ui/organisms/product/product-list/components/desktop-facets/index';
import List from '@/components/commercetools-ui/organisms/product/product-list/components/list/index';
import MobileFacets from '@/components/commercetools-ui/organisms/product/product-list/components/mobile-facets/index';
import SearchHeader from '@/components/commercetools-ui/organisms/product/product-list/components/search-header/index';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list/context/index';

export interface ProductListProps {
  products: Product[];
  cart?: Cart;
}

const ProductList: React.FC<ProductListProps> = ({ products, cart }) => {
  const { slug, searchQuery, categories } = useProductList();

  const category = useMemo(() => categories.find((category) => category.slug === slug), [categories, slug]);

  return (
    <div className="min-h-screen bg-neutral-200 py-48">
      {searchQuery ? (
        <Wrapper background="neutral-200">
          <SearchHeader query={searchQuery ?? ''} />
        </Wrapper>
      ) : (
        <Breadcrumbs categories={categories} categoryId={category?.categoryId} />
      )}

      <Wrapper className="relative" background="neutral-200">
        <MobileFacets />
        <DesktopFacets />

        <CurrentRefinements />

        <List products={products} cart={cart} />

        <AccumalativeTrace currentItems={products.length} />
      </Wrapper>
    </div>
  );
};

export default ProductList;
