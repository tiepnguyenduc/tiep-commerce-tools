"use client";
import React, { useCallback, useContext, useState } from 'react';
import { PaymentProvider } from '@/components/commercetools-ui/organisms/checkout/provider/payment/types/index';

const CheckoutContext = React.createContext({} as PaymentProvider);

const CheckoutProvider = ({ children }: React.PropsWithChildren) => {
  const [processing, setProcessing] = useState(false);

  //Call here your implemented provider

  return (
    <CheckoutContext.Provider
      value={
        {
          paymentData: { type: 'scheme' },
          paymentDataIsValid: true,
          processing,
          setProcessing,
          getPaymentMethods: useCallback(async () => [{ name: 'Credit Card', type: 'scheme', image: {} }], []),
          makePayment: async () => {},
          makeKlarnaPayment: async () => {},
          setPaymentData: () => {},
          handleThreeDS2Action: async () => {},
        } as unknown as PaymentProvider
      }
    >
      {children}
    </CheckoutContext.Provider>
  );
};

export default CheckoutProvider;

export const useCheckout = () => {
  return useContext(CheckoutContext);
};
