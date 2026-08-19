import { products } from "./sample-data";
import type { Cart, ProductVariant, StoreMode } from "./types";
const format = (n: number) => ({
  centAmount: n,
  currencyCode: "USD",
  formatted: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n / 100),
});
export function emptyCart(mode: StoreMode = "b2c"): Cart {
  const subtotal = format(0);
  return {
    id: "training-cart",
    version: 1,
    mode,
    lines: [],
    itemCount: 0,
    subtotal,
    taxTotal: format(0),
    discountTotal: format(0),
    total: subtotal,
    discountCodes: [],
  };
}
export function clearCart(cart: Cart, mode: StoreMode = cart.mode): Cart {
  return {
    ...emptyCart(mode),
    id: cart.id,
    version: cart.version + 1,
  };
}
export function updateCart(
  cart: Cart,
  productId: string,
  quantity: number,
  sku?: string,
): Cart {
  const p = products.find((x) => x.id === productId);
  if (!p) throw new Error("Product not found");
  const variant = sku
    ? p.variants?.find((item) => item.sku === sku)
    : p.variants?.[0];
  const selectedSku = variant?.sku ?? sku ?? p.sku;
  const rest = cart.lines.filter((x) =>
    sku ? x.sku !== selectedSku : x.productId !== productId,
  );
  if (quantity > 0)
    rest.push({
      id: `line-${p.id}-${selectedSku}`,
      productId: p.id,
      slug: p.slug,
      variantId: variant?.id,
      variantKey: variant?.key,
      variantLabel: variantLabel(variant),
      variantAttributes: variant?.attributes,
      sku: selectedSku,
      name: p.name,
      image: variant?.image ?? p.image,
      quantity,
      unitPrice: variant?.price ?? p.price,
      total: format((variant?.price ?? p.price).centAmount * quantity),
    });
  const cents = rest.reduce((n, x) => n + x.total.centAmount, 0);
  const subtotal = format(cents);
  return {
    ...cart,
    version: cart.version + 1,
    lines: rest,
    itemCount: rest.reduce((n, x) => n + x.quantity, 0),
    subtotal,
    taxTotal: format(0),
    discountTotal: format(0),
    total: subtotal,
    discountCodes: [],
  };
}

function variantLabel(variant?: ProductVariant) {
  if (!variant) return undefined;
  return variant.key || variant.sku || `Variant ${variant.id}`;
}
