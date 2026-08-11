"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const showToast = useToast();
  async function addToCart() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1, mode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(data.error || "Could not add the product to your cart.", "error");
        return;
      }
      showToast("Product added to your cart.", "success");
      router.push("/cart");
      router.refresh();
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
