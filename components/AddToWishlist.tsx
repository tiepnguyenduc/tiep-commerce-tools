"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function addToWishlist() {
    setBusy(true);
    setSaved(false);
    const response = await fetch("/api/wishlist/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, variantId }),
    });
    setBusy(false);

    if (response.status === 401) {
      router.push("/account");
      return;
    }

    if (response.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <button
      className={compact ? "wishlist-button compact" : "wishlist-button"}
      disabled={busy}
      onClick={addToWishlist}
      type="button"
    >
      {busy ? "Saving..." : saved ? "Saved to wishlist" : "Add to wishlist"}
    </button>
  );
}
