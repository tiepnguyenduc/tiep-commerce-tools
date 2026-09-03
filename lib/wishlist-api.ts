"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Wishlist } from "./types";

type WishlistStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unauthenticated"
  | "error";

type WishlistState = {
  wishlists: Wishlist[];
  status: WishlistStatus;
  error: string;
};

const listeners = new Set<() => void>();
const serverSnapshot: WishlistState = {
  wishlists: [],
  status: "loading",
  error: "",
};
let state: WishlistState = { wishlists: [], status: "idle", error: "" };
let pendingLoad: Promise<Wishlist[]> | null = null;

function emit(next: WishlistState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return serverSnapshot;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      (data as { error?: string }).error || "Wishlist request failed.",
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

function setFailure(error: unknown) {
  const isUnauthenticated =
    error instanceof Error &&
    (error as Error & { status?: number }).status === 401;
  emit({
    wishlists: [],
    status: isUnauthenticated ? "unauthenticated" : "error",
    error: error instanceof Error ? error.message : "Wishlist request failed.",
  });
}

export function loadWishlists(force = false): Promise<Wishlist[]> {
  if (!force && state.status === "ready") {
    return Promise.resolve(state.wishlists);
  }
  if (pendingLoad) return pendingLoad;

  emit({ ...state, status: "loading", error: "" });
  pendingLoad = fetch("/api/wishlists")
    .then((response) => readJson<{ wishlists: Wishlist[] }>(response))
    .then(({ wishlists }) => {
      emit({ wishlists, status: "ready", error: "" });
      return wishlists;
    })
    .catch((error) => {
      setFailure(error);
      throw error;
    })
    .finally(() => {
      pendingLoad = null;
    });
  return pendingLoad;
}

function upsertWishlist(wishlist: Wishlist) {
  const exists = state.wishlists.some((entry) => entry.id === wishlist.id);
  const wishlists = exists
    ? state.wishlists.map((entry) =>
        entry.id === wishlist.id ? wishlist : entry,
      )
    : [...state.wishlists, wishlist];
  emit({ wishlists, status: "ready", error: "" });
  return wishlist;
}

export async function createWishlist(name: string) {
  const data = await readJson<{ wishlist: Wishlist }>(
    await fetch("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
  return upsertWishlist(data.wishlist);
}

export async function deleteWishlist(id: string) {
  const data = await readJson<{ deletedId: string }>(
    await fetch(`/api/wishlists/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  );
  emit({
    wishlists: state.wishlists.filter(
      (wishlist) => wishlist.id !== data.deletedId,
    ),
    status: "ready",
    error: "",
  });
}

export async function addItemToWishlist(
  wishlistId: string,
  input: { productId: string; variantId?: number },
) {
  const data = await readJson<{ wishlist: Wishlist }>(
    await fetch(
      `/api/wishlists/${encodeURIComponent(wishlistId)}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    ),
  );
  return upsertWishlist(data.wishlist);
}

export async function removeItemFromWishlist(
  wishlistId: string,
  lineItemId: string,
) {
  const data = await readJson<{ wishlist: Wishlist }>(
    await fetch(
      `/api/wishlists/${encodeURIComponent(wishlistId)}/items?lineItemId=${encodeURIComponent(lineItemId)}`,
      { method: "DELETE" },
    ),
  );
  return upsertWishlist(data.wishlist);
}

export function resetWishlists() {
  pendingLoad = null;
  emit({ wishlists: [], status: "idle", error: "" });
}

export function useWishlists() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (snapshot.status === "idle") {
      void loadWishlists().catch(() => undefined);
    }
  }, [snapshot.status]);

  return {
    ...snapshot,
    isLoading: snapshot.status === "idle" || snapshot.status === "loading",
    reload: () => loadWishlists(true),
  };
}
