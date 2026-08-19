import { clearCart, emptyCart, updateCart } from "./cart-engine";
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
  sku?: string,
) {
  const current = readTrainingCart();
  globalThis.__trainingCart = updateCart(
    { ...current, mode: mode ?? current.mode },
    productId,
    quantity,
    sku,
  );
  return globalThis.__trainingCart;
}
export function clearTrainingCart(mode?: StoreMode) {
  const current = readTrainingCart();
  globalThis.__trainingCart = clearCart(current, mode ?? current.mode);
  return globalThis.__trainingCart;
}
