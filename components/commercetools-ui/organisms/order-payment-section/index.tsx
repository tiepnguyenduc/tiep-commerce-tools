"use client";
import React, { FC } from 'react';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import Costs from '@/components/commercetools-ui/organisms/order-payment-section/components/costs';
import DiscountForm from '@/components/commercetools-ui/organisms/order-payment-section/components/discount-form';
import PaymentMethods from '@/components/commercetools-ui/organisms/order-payment-section/components/payment-methods';
import { OrderSummaryProps } from '@/components/commercetools-ui/organisms/order-summary/types';

const OrderPaymentSection: FC<OrderSummaryProps> = ({
  discounts,
  onApplyDiscountCode,
  onRemoveDiscountCode,
  isEmpty,
  className,
  paymentMethods = [],
  button,
  dataReference = 'cart',
  classNames,
  order,
  ...props
}) => {
  const infoContainerClassName = useClassNames(['border-t border-neutral-400 bg-white', classNames?.infoContainer]);
  const isCartWithItems = !isEmpty && !order;

  return (
    <div className={className} {...props}>
      {isCartWithItems && (
        <DiscountForm
          className={classNames?.applyDiscountButton}
          discounts={discounts}
          onApplyDiscountCode={onApplyDiscountCode}
          onRemoveDiscountCode={onRemoveDiscountCode}
        />
      )}

      <div className={infoContainerClassName}>
        <Costs
          order={order}
          dataReference={dataReference}
          totalAmountClassName={classNames?.totalAmount}
          subCostsContainerClassName={classNames?.subCostsContainer}
          subCostClassName={classNames?.subCost}
        />

        {button && <div className="mt-16 w-full">{button}</div>}

        {paymentMethods.length > 0 && <PaymentMethods paymentMethods={paymentMethods} />}
      </div>
    </div>
  );
};

export default OrderPaymentSection;
