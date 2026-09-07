"use client";
import { useLocale } from 'next-intl';
import React from 'react';
import { Hit, BaseHit } from 'instantsearch.js';
import ProductTile from '@/components/commercetools-ui/molecules/product-tile/index';
import { mapProduct } from '@/lib/launchpad/helpers/algolia/map-product';
import { trackEvent } from '@/lib/launchpad/helpers/analytics/index';
import { PLP_PRODUCT_CLICKED } from '@/lib/launchpad/helpers/constants/events';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list-algolia/context/index';

const HitComponent = ({ hit }: { hit: Hit<BaseHit> }) => {
  const locale = useLocale();

  const { searchQuery, wishlist, cart, shippingMethods, addToWishlist, removeFromWishlist, onAddToCart } =
    useProductList();

  return (
    <ProductTile
      product={mapProduct(hit, locale)}
      wishlist={wishlist}
      cart={cart}
      shippingMethods={shippingMethods}
      isSearchResult={!!searchQuery}
      onClick={() => {
        trackEvent(PLP_PRODUCT_CLICKED, hit);
      }}
      addToWishlist={addToWishlist}
      removeLineItem={removeFromWishlist}
      onAddToCart={onAddToCart}
    />
  );
};

export default HitComponent;
