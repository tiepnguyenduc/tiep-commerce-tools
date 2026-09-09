"use client";
import CartItem from "@/components/commercetools-ui/organisms/cart/components/cart-item";
import { CartLineVariant } from "./CartLineVariant";
import { toLaunchpadCartItem } from "@/lib/mappers/launchpad-cart";
import type { CartLine } from "@/lib/types";

export function StorefrontCartItem({ line, disabled, onQuantityChange, onNavigate }: {
  line: CartLine; disabled: boolean; onNavigate?: () => void;
  onQuantityChange: (quantity: number) => Promise<void>;
}) {
  return <article className="launchpad-ui storefront-cart-item" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) onNavigate?.(); }}>
    <CartItem item={toLaunchpadCartItem(line)} imageSuffix={false} disabled={disabled}
      onRemoveItem={() => onQuantityChange(0)} onUpdateItem={onQuantityChange}
      details={<div className="storefront-line-details"><p>SKU: {line.sku}</p><CartLineVariant line={line} /><strong>Line total: {line.total.formatted}</strong></div>} />
  </article>;
}
