"use client";
import React, { FC } from 'react';
import ProductTile from '@/components/commercetools-ui/molecules/product-tile/index';
import useSelectedColorFilterVariantIndex from '@/lib/launchpad/helpers/hooks/useSelectedColorFilterVariant/index';
import { Cart } from '@/lib/launchpad/types/entity/cart';
import { Product } from '@/lib/launchpad/types/entity/product';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list/context/index';

interface ProductTileWrapperProps {
  product: Product;
  cart?: Cart;
  isSearchResult?: boolean;
  disableQuickView?: boolean;
  disableWishlistButton?: boolean;
  disableVariants?: boolean;
  onClick?: () => void;
}

const PlpProductTileWrapper: FC<ProductTileWrapperProps> = ({ product, cart, isSearchResult, onClick }) => {
  const { wishlist, shippingMethods, addToWishlist, removeFromWishlist, onAddToCart } = useProductList();

  const selectedColorVariantIndex = useSelectedColorFilterVariantIndex(product.variants);

  return (
    <ProductTile
      product={product}
      cart={cart}
      wishlist={wishlist}
      shippingMethods={shippingMethods}
      selectedVariantIndex={selectedColorVariantIndex}
      isSearchResult={isSearchResult}
      onClick={onClick}
      addToWishlist={addToWishlist}
      removeLineItem={removeFromWishlist}
      onAddToCart={onAddToCart}
    />
  );
};

export default PlpProductTileWrapper;
