"use client";
import { useLocale } from 'next-intl';
import { FC } from 'react';
import { LineItem } from '@/lib/launchpad/shared/cart/index';
import { useTranslations } from 'use-intl';
import { CurrencyHelpers } from '@/lib/launchpad/helpers/currencyHelpers/index';

const CartItemPrice: FC<{ item: LineItem }> = ({ item }) => {
  const locale = useLocale();
  const translate = useTranslations();

  if (item.isGift) {
    return <p className="text-14 font-normal">{translate('cart.gift')}</p>;
  }

  return item.discountedPrice ? (
    <div className="flex items-center gap-5">
      <p className="text-14 font-medium leading-loose text-red-500">
        {CurrencyHelpers.formatForCurrency(item.discountedPrice?.value ?? 0, locale)}
      </p>
      <p className="text-12 font-normal leading-loose text-gray-500 line-through">
        {CurrencyHelpers.formatForCurrency(item.price ?? 0, locale)}
      </p>
    </div>
  ) : (
    <p className="text-14 font-medium leading-loose">{CurrencyHelpers.formatForCurrency(item.price ?? 0, locale)}</p>
  );
};

export default CartItemPrice;
