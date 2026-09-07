"use client";
import { FC } from 'react';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import { LineItem } from '@/lib/launchpad/types/entity/cart';
import OrderItem from '@/components/commercetools-ui/organisms/order-items-listing/order-item';

type OrderItemsListProps = {
  className?: string;
  lineItems: LineItem[];
};

const OrderItemsList: FC<OrderItemsListProps> = ({ lineItems, className }) => {
  const containerClassName = useClassNames([
    'grid max-h-316 w-full grid-cols-1 divide-y divide-neutral-400 overflow-scroll',
    className,
  ]);

  return (
    <div className={containerClassName}>
      {lineItems.map((lineItem) => (
        <OrderItem key={lineItem.lineItemId} lineItem={lineItem} />
      ))}
    </div>
  );
};

export default OrderItemsList;
