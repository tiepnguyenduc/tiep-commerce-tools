"use client";
import Button from "@/components/commercetools-ui/atoms/button";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartPlus } from "@fortawesome/free-solid-svg-icons";
import { useMiniCart } from "@/components/MiniCart";
import { useToast } from "@/components/Toast";
import type { StoreMode } from "@/lib/types";
export function AddToCart({
  compact = false,
  productId,
  sku,
  quantity = 1,
  mode = "b2c",
}: {
  compact?: boolean;
  productId: string;
  sku?: string;
  quantity?: number;
  mode?: StoreMode;
}) {
  const [busy, setBusy] = useState(false);
  const { cart, loadCart, openCart, syncCart } = useMiniCart();
  const showToast = useToast();
  const inCart = cart?.mode === mode ? cart.lines.filter(line => sku ? line.sku === sku : line.productId === productId).reduce((count, line) => count + line.quantity, 0) : 0;
  async function addToCart() {
    if (busy) return;
    setBusy(true);
    try {
      const currentCart = cart ?? (await loadCart());
      const existingLine =
        currentCart?.mode === mode
          ? currentCart.lines.find((line) =>
              sku ? line.sku === sku : line.productId === productId,
            )
          : undefined;
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          sku,
          quantity: (existingLine?.quantity ?? 0) + quantity,
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
    <Button
      size={compact ? "xs" : "l"}
      iconPosition="left"
      loading={busy}
      className={`launchpad-add-to-cart gap-10${inCart ? " in-cart" : ""}`}
      aria-label={inCart ? `Add more to cart (${inCart} in cart)` : undefined}
      disabled={busy}
      onClick={addToCart}
      type="button"
    >
      {busy ? (
        "Adding…"
      ) : compact ? (
        <>
          <FontAwesomeIcon aria-hidden="true" icon={faCartPlus} />
          <span>{inCart ? `In cart (${inCart}) +` : "Add"}</span>
        </>
      ) : (
        <>
          <FontAwesomeIcon aria-hidden="true" icon={faCartPlus} />
          <span>{inCart ? `Add more · ${inCart} in cart` : "Add to cart"}</span>
        </>
      )}
    </Button>
  );
}
