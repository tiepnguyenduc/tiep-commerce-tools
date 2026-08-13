"use client";
import { useState } from "react";
import { useMiniCart } from "@/components/MiniCart";
import { useToast } from "@/components/Toast";
import type { StoreMode } from "@/lib/types";
export function AddToCart({
  productId,
  mode = "b2c",
}: {
  productId: string;
  mode?: StoreMode;
}) {
  const [busy, setBusy] = useState(false);
  const { cart, loadCart, openCart, syncCart } = useMiniCart();
  const showToast = useToast();
  async function addToCart() {
    if (busy) return;
    setBusy(true);
    try {
      const currentCart = cart ?? (await loadCart());
      const existingLine =
        currentCart?.mode === mode
          ? currentCart.lines.find((line) => line.productId === productId)
          : undefined;
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: (existingLine?.quantity ?? 0) + 1,
          mode,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(data.error || "Could not add the product to your cart.", "error");
        return;
      }
      syncCart(data);
      openCart();
      showToast("Product added to your cart.", "success");
    } catch {
      showToast("Network error — could not add the product to your cart.", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="button accent" disabled={busy} onClick={addToCart}>
      {busy ? "Adding…" : "Add to cart →"}
    </button>
  );
}
