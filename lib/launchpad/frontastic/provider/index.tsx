"use client";
import * as React from 'react';
import { SWRConfig } from 'swr';
import AddToCartOverlayProvider from '@/lib/launchpad/context/add-to-cart-overlay/index';

export const FrontasticProvider = ({ children }: React.PropsWithChildren) => {
  return (
    <SWRConfig>
      <AddToCartOverlayProvider>{children}</AddToCartOverlayProvider>
    </SWRConfig>
  );
};
