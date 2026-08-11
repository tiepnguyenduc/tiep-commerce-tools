"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function AddToWishlist({
  productId,
  variantId,
  compact = false,
}: {
  productId: string;
  variantId?: number;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const showToast = useToast();

  async function addToWishlist() {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    try {
      const response = await fetch("/api/wishlist/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId }),
      });

      if (response.status === 401) {
        showToast("Please log in to save products to your wishlist.", "info");
        router.push("/account");
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(data.error || "Could not save the product to your wishlist.", "error");
        return;
      }

      setSaved(true);
      showToast("Product saved to your wishlist.", "success");
      router.refresh();
    } catch {
      showToast("Network error — could not save the product to your wishlist.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`wishlist-button${compact ? " compact" : ""}${
        saved ? " saved" : ""
      }`}
      disabled={busy || saved}
      onClick={addToWishlist}
      type="button"
    >
      {busy ? "Saving..." : saved ? "Saved to wishlist" : "Add to wishlist"}
    </button>
  );
}
