"use client";
import Button from '@/components/commercetools-ui/atoms/button/index';
import { CartDetails } from '@/lib/launchpad/frontastic/hooks/useCart/types';
import usePath from '@/lib/launchpad/helpers/hooks/usePath/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';
import { useRouter } from '@/lib/launchpad/i18n/routing';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cart, ShippingMethod } from '@/lib/launchpad/types/entity/cart';
import { useTranslations } from 'use-intl';
import { useCheckout } from '@/components/commercetools-ui/organisms/checkout/provider/index';
import Step from '@/components/commercetools-ui/organisms/checkout/components/step/index';
import AddressesPreview from '@/components/commercetools-ui/organisms/checkout/components/steps/previews/addresses/index';
import PaymentPreview from '@/components/commercetools-ui/organisms/checkout/components/steps/previews/payment/index';
import ShippingPreview from '@/components/commercetools-ui/organisms/checkout/components/steps/previews/shipping/index';
import Addresses from '@/components/commercetools-ui/organisms/checkout/components/steps/sections/addresses/index';
import CommercetoolsPayment from '@/components/commercetools-ui/organisms/checkout/components/steps/sections/ct-payment/index';
import Payment from '@/components/commercetools-ui/organisms/checkout/components/steps/sections/payment/index';
import Shipping from '@/components/commercetools-ui/organisms/checkout/components/steps/sections/shipping/index';

interface Props {
  cart?: Cart;
  isCtPaymentOnly?: boolean;
  shippingMethods: ShippingMethod[];
  onUpdateCart?: (payload: CartDetails) => Promise<Cart>;
  hasOutOfStockItems?: boolean;
  onPurchase: () => void;
  onFinalStepChange: (isFinalStep: boolean) => void;
  callbackUrl?: string;
}

const Steps: React.FC<Props> = ({
  cart,
  isCtPaymentOnly,
  shippingMethods,
  hasOutOfStockItems,
  onUpdateCart,
  onPurchase,
  onFinalStepChange,
  callbackUrl,
}) => {
  const translate = useTranslations();

  const router = useRouter();

  const searchParams = useSearchParams();

  const step = +(searchParams.get('step') ?? 0);

  const { pathWithoutQuery } = usePath();

  const { processing, setProcessing } = useCheckout();

  const [active, setActive] = useState(0);
  const [peakActive, setPeakActive] = useState(step);

  const goToNextStep = useCallback(() => {
    setActive(active + 1);
    setPeakActive(Math.max(peakActive, active + 1));
    router.push(`${pathWithoutQuery}?step=${active + 1}`, { scroll: false });
  }, [active, peakActive, router, pathWithoutQuery]);

  const goToReview = useCallback(() => {
    setActive(peakActive);
  }, [peakActive]);

  useEffect(() => {
    setActive(step);
  }, [step]);

  const onEdit = useCallback((index: number) => setActive(index), []);

  const steps = useMemo(() => {
    return [
      {
        label: translate('cart.addresses'),
        Component: (
          <Addresses
            cart={cart}
            isCompleted={peakActive > 0}
            onUpdateCart={onUpdateCart}
            goToNextStep={goToNextStep}
            goToReview={goToReview}
          />
        ),
        Preview: <AddressesPreview cart={cart} />,
      },
      {
        label: translate('cart.shipping'),
        Component: <Shipping goToNextStep={goToNextStep} />,
        Preview: <ShippingPreview cart={cart} shippingMethods={shippingMethods} />,
      },
      ...[
        !isCtPaymentOnly
          ? {
              label: translate('cart.payment'),
              Component: <Payment goToNextStep={goToNextStep} />,
              Preview: <PaymentPreview />,
            }
          : {
              label: translate('cart.payment'),
              Component: (
                <CommercetoolsPayment
                  isActive={active === 2}
                  isCompleted={peakActive > 2}
                  setCheckoutIsProcessing={setProcessing}
                  goToNextStep={goToNextStep}
                  onCompletePayment={async () => {}}
                  hasOutOfStockItems={hasOutOfStockItems}
                  callbackUrl={callbackUrl}
                />
              ),
            },
      ],
    ];
  }, [
    translate,
    peakActive,
    onUpdateCart,
    goToNextStep,
    goToReview,
    cart,
    shippingMethods,
    isCtPaymentOnly,
    active,
    setProcessing,
  ]);

  const isFinalStep = useMemo(() => active === steps.length, [active, steps.length]);

  useEffect(() => {
    onFinalStepChange(isFinalStep);
  }, [isFinalStep, onFinalStepChange]);

  useEffect(() => {
    // this effect basically pushes the user back if it sees that the step is > 2
    // it only runs on load
    // So users would always have to add payment data again in case they reload/revisit page after it's been added
    if (step > 2) {
      setActive(2);
      setPeakActive(2);
      router.push(`${pathWithoutQuery}?step=2`, { scroll: false });
    }
  }, []);

  return (
    <div className="lg:grow">
      <div className="flex flex-col gap-24 lg:bg-neutral-200">
        {steps.map(({ Component, Preview, label }, index) => (
          <Step
            key={index}
            label={label}
            number={index + 1}
            isExpanded={index === active}
            isCompleted={index < peakActive}
            onEdit={() => onEdit(index)}
            Component={Component}
            Preview={Preview}
          />
        ))}
      </div>
      <div className={classnames('mt-24 lg:hidden', { hidden: !isFinalStep })}>
        <Button
          variant="primary"
          className="w-full"
          type="submit"
          loading={processing}
          disabled={hasOutOfStockItems}
          {...(isCtPaymentOnly
            ? {
                'data-ctc-selector': 'paymentButton',
              }
            : {
                onClick: onPurchase,
              })}
        >
          {translate('cart.complete-purchase')}
        </Button>
      </div>
    </div>
  );
};

export default Steps;
