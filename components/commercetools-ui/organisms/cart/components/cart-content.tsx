"use client";
import { useTranslations } from 'use-intl';
import { CartProps } from '@/components/commercetools-ui/organisms/cart/types';
import CartItemsList from '@/components/commercetools-ui/organisms/cart/components/cart-items-list';
import EmptyCart from '@/components/commercetools-ui/organisms/cart/components/empty-cart';

type Props = Omit<CartProps, 'paymentMethods'> & {
  className?: string;
};

const CartContent = ({
  className,
  isEmpty,
  totalItems,
  cart,
  onRemoveItem,
  onUpdateItem,
  OnMoveToWishlist,
  ...props
}: Props) => {
  const translate = useTranslations();
  const text = `(${translate('cart.items', { totalItems: totalItems ?? 0 })})`;
  return (
    <div className={className}>
      {!isEmpty ? (
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-16 md:text-18 lg:text-22">
              {translate('cart.cart')}
              {!isEmpty && ': '}
              {!isEmpty && <span className="text-gray-600">{text}</span>}
            </h1>
          </div>
          <CartItemsList
            cart={cart}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            OnMoveToWishlist={OnMoveToWishlist}
          />
        </div>
      ) : (
        <EmptyCart {...props} />
      )}
    </div>
  );
};

export default CartContent;
