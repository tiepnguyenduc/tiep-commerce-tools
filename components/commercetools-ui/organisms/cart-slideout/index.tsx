"use client";
import React, { FC } from 'react';
import { useTranslations } from 'use-intl';
import useCloseFlyouts from '@/lib/launchpad/helpers/hooks/useCloseFlyouts/index';
import { CartSlideoutProps } from '@/components/commercetools-ui/organisms/cart-slideout/type';
import CartItem from '@/components/commercetools-ui/organisms/cart/components/cart-item';
import { EmptyState } from '@/components/commercetools-ui/organisms/empty-state/index';
import OrderPaymentSection from '@/components/commercetools-ui/organisms/order-payment-section/index';
import CheckoutButton from '@/components/commercetools-ui/organisms/order-summary/components/checkout-button';

const CartSlideout: FC<CartSlideoutProps> = ({
  cart,
  isEmpty,
  onApplyDiscountCode,
  onRemoveDiscountCode,
  emptyStateImage,
  emptyStateTitle,
  emptyStateSubtitle,
  emptyStateCategories,
  handleCategoryClick,
  onRemoveItem,
  onUpdateItem,
  OnMoveToWishlist,
}) => {
  const translate = useTranslations();

  const closeFlyouts = useCloseFlyouts();

  return (
    <>
      {isEmpty ? (
        <EmptyState
          className="grow"
          categories={emptyStateCategories}
          image={emptyStateImage}
          title={emptyStateTitle}
          subtitle={emptyStateSubtitle}
          handleCategoryClick={handleCategoryClick}
        />
      ) : (
        <div className="h-[65vh] grow divide-y divide-neutral-400 overflow-auto px-12 md:px-22">
          {cart?.lineItems?.map((lineItem) => (
            <CartItem
              key={lineItem.lineItemId}
              item={lineItem}
              onRemoveItem={() => onRemoveItem(lineItem.lineItemId as string)}
              onUpdateItem={(quantity) => onUpdateItem(lineItem.lineItemId as string, quantity)}
              OnMoveToWishlist={() => OnMoveToWishlist(lineItem)}
            />
          ))}
        </div>
      )}
      <OrderPaymentSection
        discounts={cart?.discountCodes ?? []}
        onApplyDiscountCode={onApplyDiscountCode}
        onRemoveDiscountCode={onRemoveDiscountCode}
        isEmpty={isEmpty}
        classNames={{
          applyDiscountButton: 'px-12 py-24 md:px-22',
          infoContainer: 'px-12 p-16 md:px-22',
          totalAmount: 'pb-20',
          subCost: 'text-14',
        }}
        button={
          <CheckoutButton disabled={isEmpty} text={translate('cart.cart-go')} link="/cart" onClick={closeFlyouts} />
        }
      />
    </>
  );
};

export default CartSlideout;
