import { emptyCart, updateCart } from "./cart-engine";
import type { Cart, StoreMode } from "./types";
declare global {
  var __trainingCart: Cart | undefined;
}
export function readTrainingCart() {
  return (globalThis.__trainingCart ??= emptyCart());
}
export function writeTrainingCart(
  productId: string,
  quantity: number,
  mode?: StoreMode,
) {
  const current = readTrainingCart();
  globalThis.__trainingCart = updateCart(
    { ...current, mode: mode ?? current.mode },
    productId,
    quantity,
  );
  return globalThis.__trainingCart;
}
