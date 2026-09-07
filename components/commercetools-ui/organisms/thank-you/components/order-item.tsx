"use client";
import { useLocale } from 'next-intl';
import { FC } from 'react';
import Skeleton from 'react-loading-skeleton';
import { LineItem } from '@/lib/launchpad/shared/cart/LineItem';
import Image from '@/components/commercetools-ui/atoms/image/index';
import { CurrencyHelpers } from '@/lib/launchpad/helpers/currencyHelpers/index';

const OrderLineItem: FC<LineItem> = ({ name, price, count, variant }) => {
  const locale = useLocale();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-16 py-16 md:gap-32">
        <div className="relative h-104 w-89 shrink-0">
          {variant?.images?.[0] ? (
            <Image fill src={variant?.images?.[0]} style={{ objectFit: 'contain' }} alt={variant?.sku ?? ''} />
          ) : (
            <Skeleton className="size-full" />
          )}
        </div>
        <div className="mt-10 grow overflow-hidden">
          <p className="block max-w-full truncate text-12 capitalize md:text-14">{name ?? 'product name'}</p>
          <p className="mt-8 block text-12 font-medium md:hidden lg:block lg:text-14">
            {CurrencyHelpers.formatForCurrency(price ?? 111, locale)}
          </p>
          <p className="mt-12 text-14 text-gray-600">{'x ' + (count ?? '2')}</p>
        </div>
      </div>
      <p className="mt-8 hidden font-medium md:block lg:hidden">
        {CurrencyHelpers.formatForCurrency(price ?? 111, locale)}
      </p>
    </div>
  );
};

export default OrderLineItem;
