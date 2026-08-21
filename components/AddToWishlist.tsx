"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { Wishlist } from "@/lib/types";

type WishlistResponse = { wishlist?: Wishlist; error?: string };

const listeners = new Set<() => void>();
let wishlistProductIds: Set<string> | null = null;
let wishlistRequest: Promise<void> | null = null;

function publishWishlist(wishlist: Wishlist) {
  wishlistProductIds = new Set(wishlist.lines.map((line) => line.productId));
  listeners.forEach((listener) => listener());
}

function ensureWishlistLoaded() {
  if (wishlistProductIds || wishlistRequest) return wishlistRequest;

  wishlistRequest = fetch("/api/wishlist")
    .then(async (response) => {
      if (response.status === 401) {
        wishlistProductIds = new Set();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as WishlistResponse;
      if (response.ok && data.wishlist) {
        publishWishlist(data.wishlist);
      } else {
        wishlistProductIds = new Set();
      }
    })
    .catch(() => {
      wishlistProductIds = new Set();
    })
    .finally(() => {
      wishlistRequest = null;
      listeners.forEach((listener) => listener());
    });

  return wishlistRequest;
}

function useWishlistProductIds() {
  const [productIds, setProductIds] = useState<Set<string> | null>(
    wishlistProductIds,
  );

  useEffect(() => {
    const refresh = () => setProductIds(wishlistProductIds);
    listeners.add(refresh);
    ensureWishlistLoaded();
    return () => {
      listeners.delete(refresh);
    };
  }, []);

  return productIds;
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
  const wishlistIds = useWishlistProductIds();
  const isSaved = saved || Boolean(wishlistIds?.has(productId));
  const router = useRouter();
  const showToast = useToast();

  async function addToWishlist() {
    if (busy) return;
    if (isSaved) {
      showToast("Product is already in your wishlist.", "info");
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
        showToast(data.error || "Could not save the product to your wishlist.", "error");
        return;
      }

      if (data.wishlist) publishWishlist(data.wishlist);
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
      aria-label={
        isSaved
          ? "Product added to wishlist"
          : busy
            ? "Adding product to wishlist"
            : "Add product to wishlist"
      }
      className={`wishlist-button${compact ? " compact" : ""}${
        isSaved ? " saved" : ""
      }`}
      disabled={busy}
      onClick={addToWishlist}
      title={isSaved ? "Added to wishlist" : "Add to wishlist"}
      type="button"
    >
      <FontAwesomeIcon aria-hidden="true" icon={faHeart} />
    </button>
  );
}
