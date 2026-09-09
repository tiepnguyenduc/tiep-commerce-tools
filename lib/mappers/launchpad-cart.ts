import type { CartLine } from "@/lib/types";
import type { LineItem } from "@/lib/launchpad/shared/cart/LineItem";

export function toLaunchpadCartItem(line: CartLine): LineItem {
  return {
    lineItemId: line.id, productId: line.productId, name: line.name,
    productSlug: line.slug, _url: `/products/${line.slug || line.productId}`,
    count: line.quantity, price: line.unitPrice, totalPrice: line.total,
    variant: { sku: line.sku, images: [line.image] },
  };
}
