"use client";

import { useMiniCart } from "./MiniCart";

export function ProductCartStatus({ productId }: { productId: string }) {
  const { cart } = useMiniCart();
  const quantity = cart?.lines
    .filter((line) => line.productId === productId)
    .reduce((count, line) => count + line.quantity, 0) ?? 0;
  if (!quantity) return null;
  return <span className="product-cart-status" role="status">In cart · {quantity}</span>;
}
