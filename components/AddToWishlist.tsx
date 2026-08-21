"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { Wishlist } from "@/lib/types";

type WishlistResponse = { wishlist?: Wishlist; error?: string };

const listeners = new Set<() => void>();
let wishlistLineIds: Map<string, string> | null = null;
let wishlistRequest: Promise<void> | null = null;

function publishWishlist(wishlist: Wishlist) {
  wishlistLineIds = new Map();
  for (const line of wishlist.lines) {
    if (!wishlistLineIds.has(line.productId)) {
      wishlistLineIds.set(line.productId, line.id);
    }
  }
  listeners.forEach((listener) => listener());
}

function ensureWishlistLoaded() {
  if (wishlistLineIds || wishlistRequest) return wishlistRequest;

  wishlistRequest = fetch("/api/wishlist")
    .then(async (response) => {
      if (response.status === 401) {
        wishlistLineIds = new Map();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as WishlistResponse;
      if (response.ok && data.wishlist) {
        publishWishlist(data.wishlist);
      } else {
        wishlistLineIds = new Map();
      }
    })
    .catch(() => {
      wishlistLineIds = new Map();
    })
    .finally(() => {
      wishlistRequest = null;
      listeners.forEach((listener) => listener());
    });

  return wishlistRequest;
}

function useWishlistLineIds() {
  const [lineIds, setLineIds] = useState<Map<string, string> | null>(
    wishlistLineIds,
  );

  useEffect(() => {
    const refresh = () => setLineIds(wishlistLineIds);
    listeners.add(refresh);
    ensureWishlistLoaded();
    return () => {
      listeners.delete(refresh);
    };
  }, []);

  return lineIds;
}

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
  const wishlistLineIds = useWishlistLineIds();
  const lineItemId = wishlistLineIds?.get(productId);
  const isSaved = saved || Boolean(lineItemId);
  const router = useRouter();
  const showToast = useToast();

  async function toggleWishlist() {
    if (busy) return;
    if (isSaved) {
      if (!lineItemId) {
        setSaved(false);
        showToast("Product removed from your wishlist.", "success");
        return;
      }

      setBusy(true);
      try {
        const response = await fetch(
          `/api/wishlist/items?lineItemId=${encodeURIComponent(lineItemId)}`,
          { method: "DELETE" },
        );

        if (response.status === 401) {
          showToast("Please log in to update your wishlist.", "info");
          router.push("/account");
          return;
        }

        const data = (await response
          .json()
          .catch(() => ({}))) as WishlistResponse;
        if (!response.ok) {
          showToast(
            data.error || "Could not remove the product from your wishlist.",
            "error",
          );
          return;
        }

        if (data.wishlist) publishWishlist(data.wishlist);
        setSaved(false);
        showToast("Product removed from your wishlist.", "success");
        router.refresh();
      } catch {
        showToast(
          "Network error - could not remove the product from your wishlist.",
          "error",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

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

      const data = (await response
        .json()
        .catch(() => ({}))) as WishlistResponse;
      if (!response.ok) {
        showToast(
          data.error || "Could not save the product to your wishlist.",
          "error",
        );
        return;
      }

      if (data.wishlist) publishWishlist(data.wishlist);
      setSaved(true);
      showToast("Product saved to your wishlist.", "success");
      router.refresh();
    } catch {
      showToast(
        "Network error - could not save the product to your wishlist.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      aria-label={
        isSaved
          ? "Remove product from wishlist"
          : busy
            ? "Updating wishlist"
            : "Add product to wishlist"
      }
      className={`wishlist-button${compact ? " compact" : ""}${
        isSaved ? " saved" : ""
      }`}
      disabled={busy}
      onClick={toggleWishlist}
      title={isSaved ? "Remove from wishlist" : "Add to wishlist"}
      type="button"
    >
      <FontAwesomeIcon aria-hidden="true" icon={faHeart} />
    </button>
  );
}
