"use client";
import React, { useCallback, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { LineItem as CartLineItem } from '@/lib/launchpad/shared/cart/LineItem';
import { useTranslations } from 'use-intl';
import Image from '@/components/commercetools-ui/atoms/image/index';
import Link from '@/components/commercetools-ui/atoms/link/index';
import OutOfStock from '@/components/commercetools-ui/atoms/out-of-stock/index';
import QuantitySelector from '@/components/commercetools-ui/atoms/quantity-selector/index';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import CartItemPrice from '@/components/commercetools-ui/organisms/cart/components/cart-item-price';

interface ClassNames {
  moveToWishlist?: string;
}

interface Props {
  item: CartLineItem;
  classNames?: ClassNames;
  onRemoveItem(): Promise<void>;
  onUpdateItem(quantity: number): Promise<void>;
  OnMoveToWishlist?(): Promise<void>;
  disabled?: boolean;
  details?: React.ReactNode;
  imageSuffix?: string | false;
}

const CartItem: React.FC<Props> = ({ item, onRemoveItem, onUpdateItem, OnMoveToWishlist, classNames = {}, disabled = false, details, imageSuffix = "small" }) => {
  const translate = useTranslations();

  const [processing, setProcessing] = useState(false);

  const deleteButtonClassName = useClassNames(['inline-block', processing ? 'cursor-not-allowed' : 'cursor-pointer']);

  const wishlistButtonClassName = useClassNames([
    'text-gray-600 decoration-gray-600 decoration-solid hover:underline hover:underline-offset-2',
    classNames.moveToWishlist,
    processing ? 'cursor-not-allowed' : 'cursor-pointer',
  ]);

  const handleUpdateItem = useCallback(
    async (quantity: number) => {
      if (processing || disabled) return;

      setProcessing(true);

      try { await (quantity < 1 ? onRemoveItem() : onUpdateItem(quantity)); } finally { setProcessing(false); }
    },
    [onUpdateItem, onRemoveItem, processing, disabled],
  );

  const handleRemoveItem = useCallback(async () => {
    if (processing || disabled) return;

    setProcessing(true);
    try { await onRemoveItem(); } finally { setProcessing(false); }
  }, [onRemoveItem, processing]);

  const handleMoveToWishlist = useCallback(async () => {
    if (processing || disabled) return;

    setProcessing(true);
    try { await OnMoveToWishlist?.(); } finally { setProcessing(false); }
  }, [OnMoveToWishlist, processing]);

  return (
    <div className="flex max-w-full items-stretch justify-start gap-10 py-18 md:gap-15">
      <div className="w-125 shrink-0 bg-white p-12">
        <Link title={item.name} className="relative block size-full rounded-sm" link={item._url}>
          <Image alt={item.name} src={item.variant?.images?.[0]} suffix={imageSuffix === false ? undefined : imageSuffix} style={{ objectFit: 'contain' }} fill />
        </Link>
      </div>
      <div className="max-w-full grow overflow-hidden">
        <div className="flex items-center justify-between">
          <Link
            className="block max-w-[85%] overflow-hidden text-ellipsis whitespace-pre text-14 uppercase leading-loose"
            title={item.name}
            link={item._url}
          >
            {item.name}
          </Link>
          <button
            data-testid="remove-button"
            onClick={handleRemoveItem}
            className={deleteButtonClassName}
            disabled={processing || disabled}
            aria-label={translate('common.delete')}
          >
            <TrashIcon stroke="#494949" className="w-20" />
          </button>
        </div>
        {item.variant?.isOnStock === false && (
          <div className="mt-8">
            <OutOfStock />
          </div>
        )}
        <div className="mt-8">
          <CartItemPrice item={item} />
        </div>
        <div className="mt-16">
          <QuantitySelector
            editable
            label={`Quantity for ${item.name}`}
            value={item.count}
            defaultValue={1}
            minValue={0}
            maxValue={item.variant?.availableQuantity ?? 99}
            disabled={processing || disabled}
            onChange={handleUpdateItem}
          />
        </div>
        {details}
        {OnMoveToWishlist && <div className="mt-16 text-12">
          <button type="button" disabled={processing || disabled} className={wishlistButtonClassName} onClick={handleMoveToWishlist}>
            {translate('cart.move-to-wishlist')}
          </button>
        </div>}
      </div>
    </div>
  );
};

export default CartItem;
