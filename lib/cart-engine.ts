import { products } from "./sample-data";
import type { Cart, StoreMode } from "./types";
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
): Cart {
  const p = products.find((x) => x.id === productId);
  if (!p) throw new Error("Product not found");
  const rest = cart.lines.filter((x) => x.productId !== productId);
  if (quantity > 0)
    rest.push({
      id: `line-${p.id}`,
      productId: p.id,
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      image: p.image,
      quantity,
      unitPrice: p.price,
      total: format(p.price.centAmount * quantity),
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
