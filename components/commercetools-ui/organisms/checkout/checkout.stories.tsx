import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { shippingMethods } from '@/lib/launchpad/helpers/mocks/mockCommonData';
import { lineItemsOrderHistory, moneyMock } from '@/lib/launchpad/helpers/mocks/mockData';
import { logo } from '@/lib/launchpad/helpers/mocks/mockHeaderData';
import { CheckoutWrapped, CheckoutWrappedProps } from '@/components/commercetools-ui/organisms/checkout/index';

export default {
  title: 'Organisms/Checkout',
  component: CheckoutWrapped,
  argTypes: {},
} as Meta;

const Template: StoryFn<CheckoutWrappedProps> = () => {
  return (
    <CheckoutWrapped
      cart={{ cartId: '', lineItems: lineItemsOrderHistory }}
      logo={logo}
      shippingMethods={shippingMethods}
      transaction={{
        total: moneyMock,
        subtotal: moneyMock,
        shipping: moneyMock,
        tax: moneyMock,
        discount: moneyMock,
      }}
    />
  );
};

export const Default = Template.bind({});

Default.args = {};
