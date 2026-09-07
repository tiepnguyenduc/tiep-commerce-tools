import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { toUIProduct } from '@/lib/launchpad/helpers/mappers/toUIProduct';
import { products, shippingMethods } from '@/lib/launchpad/helpers/mocks/mockCommonData';
import { wishlist } from '@/lib/launchpad/helpers/mocks/mockData';
import ProductDetails, { ProductDetailsProps } from '@/components/commercetools-ui/organisms/product/product-details/index';

export default {
  title: 'Organisms/Product Details',
  component: ProductDetails,
  argTypes: {},
} as Meta;

const Template: StoryFn<ProductDetailsProps> = () => {
  const variant = products[0].variants[0];
  const product = toUIProduct(products[0], variant, [], []);

  return (
    <div className="ml-44">
      <p className="mt-40 w-2/5 text-28 font-bold text-black">Product Details Component</p>
      <p className="mt-20 w-3/5 text-20 leading-loose text-neutral-700">
        The Product Details component displays the product information, images, and actions like adding to cart.
      </p>
      <div className="mt-44">
        <ProductDetails
          product={product}
          wishlist={wishlist}
          shippingMethods={shippingMethods}
          variant={variant}
          onChangeVariant={() => {}}
        />
      </div>
    </div>
  );
};

export const Default = Template.bind({});
