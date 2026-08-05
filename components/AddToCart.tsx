"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  return (
    <button
      className="button accent"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity: 1, mode }),
        });
        router.push("/cart");
        router.refresh();
      }}
    >
      {busy ? "Adding…" : "Add to cart →"}
    </button>
  );
}
