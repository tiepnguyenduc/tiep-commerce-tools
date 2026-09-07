"use client";
import { FC } from 'react';
import { Order } from '@/lib/launchpad/shared/cart/Order';
import OrderLineItem from '@/components/commercetools-ui/organisms/thank-you/components/order-item';

type OrderSummaryListProps = {
  className?: string;
  order?: Order;
};

const OrderSummaryList: FC<OrderSummaryListProps> = ({ className, order }) => {
  return (
    <div className={className}>
      {order?.lineItems?.map((lineItem) => (
        <OrderLineItem key={lineItem.productId} {...lineItem} />
      ))}

      {!order?.lineItems && <OrderLineItem />}
    </div>
  );
};

export default OrderSummaryList;
