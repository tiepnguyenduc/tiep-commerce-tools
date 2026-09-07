"use client";
import { useContext } from 'react';
import { AccountContext } from '@/lib/launchpad/context/account/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';
import LoginSuggestion from '@/components/commercetools-ui/organisms/order-summary/components/login-suggestion';
import SummaryAccordion from '@/components/commercetools-ui/organisms/order-summary/components/summary-accordion';
import { OrderSummaryProps } from '@/components/commercetools-ui/organisms/order-summary/types';
import OrderPaymentSection from '@/components/commercetools-ui/organisms/order-payment-section/index';

const OrderSummary = ({
  title,
  cart,
  className,
  includeLoginSuggestion,
  includeSummaryAccordion,
  paymentMethods,
  discounts,
  onApplyDiscountCode,
  onRemoveDiscountCode,
  login,
  requestConfirmationEmail,
  requestPasswordReset,
  ...props
}: OrderSummaryProps) => {
  const { loggedIn } = useContext(AccountContext);

  return (
    <div className={classnames('rounded-lg bg-white px-20 py-24 md:px-24', className)}>
      {(title || includeLoginSuggestion) && (
        <div>
          {title && <p className="md:text-18">{title}</p>}

          {includeLoginSuggestion && !loggedIn && (
            <LoginSuggestion
              login={login}
              requestConfirmationEmail={requestConfirmationEmail}
              requestPasswordReset={requestPasswordReset}
            />
          )}
        </div>
      )}

      {includeSummaryAccordion && <SummaryAccordion order={props.order} cart={cart} />}

      <OrderPaymentSection
        discounts={discounts}
        onApplyDiscountCode={onApplyDiscountCode}
        onRemoveDiscountCode={onRemoveDiscountCode}
        classNames={{
          applyDiscountButton: classnames('py-14 text-16', { 'mt-16': !includeSummaryAccordion }),
          totalAmount: 'text-18',
          subCostsContainer: 'pt-12 md:pt-16 mb-20 lg:py-24 lg:mb-16 lg:border-b border-neutral-400',
        }}
        paymentMethods={paymentMethods}
        {...props}
      />
    </div>
  );
};

export default OrderSummary;
