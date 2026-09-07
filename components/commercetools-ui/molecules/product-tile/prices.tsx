"use client";
import { useLocale } from 'next-intl';
import React from 'react';
import { CurrencyHelpers } from '@/lib/launchpad/helpers/currencyHelpers/index';
import { ProductDiscountedPrice, Money } from '@/lib/launchpad/types/entity/product';

interface Props {
  discountedPrice?: ProductDiscountedPrice;
  price?: Money;
}

const Prices: React.FC<Props> = ({ price, discountedPrice }) => {
  const locale = useLocale();

  return (
    <>
      {discountedPrice ? (
        <div className="flex items-center gap-8">
          <p className="text-11 font-medium leading-loose text-red-500 md:text-14">
            {CurrencyHelpers.formatForCurrency(discountedPrice?.value ?? '', locale)}
          </p>
          <p className="text-10 font-medium leading-loose text-gray-500 line-through md:text-12">
            {CurrencyHelpers.formatForCurrency(price ?? '', locale)}
          </p>
        </div>
      ) : (
        <p className="text-11 font-medium leading-loose text-primary md:text-14">
          {CurrencyHelpers.formatForCurrency(price ?? '', locale)}
        </p>
      )}
    </>
  );
};

export default Prices;
