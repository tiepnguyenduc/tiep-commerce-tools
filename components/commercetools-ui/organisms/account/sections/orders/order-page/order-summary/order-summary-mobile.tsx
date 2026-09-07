"use client";
import { useLocale } from 'next-intl';
import React, { FC, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Order } from '@/lib/launchpad/shared/cart/Order';
import { useTranslations } from 'use-intl';
import Accordion from '@/components/commercetools-ui/atoms/accordion/index';
import Image from '@/components/commercetools-ui/atoms/image/index';
import Costs from '@/components/commercetools-ui/organisms/order-payment-section/components/costs';
import { CurrencyHelpers } from '@/lib/launchpad/helpers/currencyHelpers/index';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import useI18n from '@/lib/launchpad/helpers/hooks/useI18n/index';
import mapCosts from '@/lib/launchpad/helpers/utils/mapCosts/index';

export interface Props {
  order?: Order;
}

const OrderSummaryMobile: FC<Props> = ({ order }) => {
  const locale = useLocale();
  const { currency } = useI18n();

  const translate = useTranslations();

  const [open, setOpen] = useState(false);

  const accordionClassNames = useClassNames(['block 2xl:hidden my-24 lg:mt-40']);

  const accordionContentClassNames = useClassNames([
    'flex w-full justify-between border-y py-16',
    open ? 'border-t' : '',
  ]);

  const lineItemClassNames = (order: Order, index: number) => {
    return `
      flex justify-start py-16
      ${order?.lineItems && index === order.lineItems.length - 1 ? '' : 'border-b'}`;
  };

  const arrowClassNames = useClassNames([open ? 'rotate-180 transform' : '', 'transition mr-8']);
  const orderSummaryAccordion = useMemo(() => {
    return (
      <div className="px-16 md:px-24 lg:px-44">
        <div className={accordionContentClassNames} onClick={() => setOpen(!open)}>
          <p className="text-gray-600">{translate('orders.your-order')}</p>

          <div className="flex">
            <p className="hidden pr-8 font-medium text-primary md:block">
              {CurrencyHelpers.formatForCurrency(mapCosts({ cart: order, currency }).total)}
            </p>
            <ChevronDownIcon width={20} strokeWidth={1.5} className={arrowClassNames} />
          </div>
        </div>
      </div>
    );
  }, [accordionContentClassNames, translate, order, currency, arrowClassNames, open]);

  return (
    <Accordion customClosedButton={orderSummaryAccordion} className={accordionClassNames} buttonClassName="w-full">
      <div className="grid max-h-400 w-full grid-cols-1 overflow-auto px-16 md:px-24 lg:px-44">
        {order?.lineItems?.map((lineItem, index) => (
          <div key={lineItem.lineItemId} className={lineItemClassNames(order, index)}>
            {lineItem.variant?.images?.[0] && (
              <div className="relative h-104 w-88 shrink-0">
                <Image fill src={lineItem.variant.images[0]} style={{ objectFit: 'contain' }} />
              </div>
            )}
            <div className="flex flex-col justify-center pl-16">
              <p className="text-14 uppercase text-primary">{lineItem?.name}</p>
              <p className="mt-8 text-14 font-medium text-primary">
                {CurrencyHelpers.formatForCurrency(lineItem?.price as number, locale)}
              </p>
              <p className="mt-8 text-14 text-primary">{`x ${lineItem?.count}`}</p>
            </div>
          </div>
        ))}
      </div>

      <Costs className="bg-neutral-200 p-16 md:px-24 lg:px-44" order={order} />
    </Accordion>
  );
};

export default OrderSummaryMobile;
