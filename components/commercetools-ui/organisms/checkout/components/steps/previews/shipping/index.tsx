"use client";
import { useLocale } from 'next-intl';
import React, { useMemo } from 'react';
import { CurrencyHelpers } from '@/lib/launchpad/helpers/currencyHelpers/index';
import { Cart, ShippingMethod } from '@/lib/launchpad/types/entity/cart';

interface Props {
  cart?: Cart;
  shippingMethods: ShippingMethod[];
}

const ShippingPreview = ({ cart, shippingMethods }: Props) => {
  const locale = useLocale();

  const shippingMethod = useMemo(() => {
    if (!cart?.shippingInfo) return;

    const method = shippingMethods?.find((m) => m.shippingMethodId === cart.shippingInfo?.shippingMethodId);

    return {
      name: method?.name ?? '',
      price: cart?.shippingInfo.price,
      description: method?.description,
    };
  }, [cart, shippingMethods]);

  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-400 p-16">
      <div>
        <p className="text-14 font-medium">{shippingMethod?.name}</p>
        {/* eslint-disable-next-line react/jsx-no-literals */}
        <p className="mt-4 text-14 text-gray-600">{shippingMethod?.description}</p>
      </div>

      <span className="text-14 font-medium">
        {CurrencyHelpers.formatForCurrency(shippingMethod?.price ?? {}, locale)}
      </span>
    </div>
  );
};

export default ShippingPreview;
