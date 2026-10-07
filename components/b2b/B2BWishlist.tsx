"use client";

import Link from "next/link";
import { HeartIcon } from "@heroicons/react/24/outline";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/components/Toast";
import type { Wishlist, WishlistLine } from "@/lib/types";
import { useB2B } from "./B2BProvider";
import { useB2BTranslations } from "./useB2BTranslations";
import s from "./B2BTools.module.css";

type WishlistContext = {
  wishlist: Wishlist | null;
  ready: boolean;
  pending: string | null;
  error: string;
  reload: () => Promise<void>;
  toggle: (productId: string, variantId?: number) => Promise<void>;
};

const Context = createContext<WishlistContext | null>(null);

function matchingLine(
  wishlist: Wishlist | null,
  productId: string,
  variantId?: number,
) {
  return wishlist?.lines.find(
    (line) =>
      line.productId === productId &&
      (variantId === undefined || line.variantId === variantId),
  );
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

export function B2BWishlistProvider({ children }: { children: ReactNode }) {
  const { state } = useB2B();
  const customerId = state?.customer?.id || "";
  const customerIdRef = useRef(customerId);
  customerIdRef.current = customerId;
  const [ownerId, setOwnerId] = useState("");
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const showToast = useToast();

  async function load(owner = customerId) {
    setPending(null);
    if (!owner) {
      setOwnerId("");
      setWishlist(null);
      setStatus("ready");
      setError("");
      return;
    }

    setOwnerId(owner);
    setStatus("loading");
    setError("");
    try {
      const data = await readJson<{ wishlist: Wishlist }>(
        await fetch("/api/b2b/wishlist", { cache: "no-store" }),
      );
      if (customerIdRef.current !== owner) return;
      setWishlist(data.wishlist);
      setStatus("ready");
    } catch (requestError) {
      if (customerIdRef.current !== owner) return;
      setWishlist(null);
      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Wishlist request failed.",
      );
    }
  }

  useEffect(() => {
    if (state === null) return;
    void load(customerId);
  }, [customerId, state === null]);

  const ready =
    state !== null && ownerId === customerId && status === "ready";

  async function toggle(productId: string, variantId?: number) {
    if (!state?.customer) {
      window.location.assign("/b2b/account");
      return;
    }
    if (!ready || !wishlist || pending) return;

    const owner = state.customer.id;
    const operationKey = `${productId}:${variantId ?? "default"}`;
    const previous = wishlist;
    const line = matchingLine(wishlist, productId, variantId);
    const product = state.products.find((entry) => entry.id === productId);
    const variant = variantId
      ? product?.variants.find((entry) => entry.id === variantId)
      : product?.variants[0];
    const optimisticLine: WishlistLine = {
      id: `pending-${operationKey}`,
      productId,
      variantId,
      sku: variant?.sku || productId,
      name: product?.name || "Wishlist item",
      image: variant?.image || product?.image || "",
      quantity: 1,
    };

    setPending(operationKey);
    setWishlist({
      ...wishlist,
      lines: line
        ? wishlist.lines.filter((entry) => entry.id !== line.id)
        : [...wishlist.lines, optimisticLine],
    });

    try {
      const response = line
        ? await fetch(
            `/api/b2b/wishlist/items?lineItemId=${encodeURIComponent(line.id)}`,
            { method: "DELETE" },
          )
        : await fetch("/api/b2b/wishlist/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, variantId }),
          });
      const data = await readJson<{ wishlist: Wishlist }>(response);
      if (customerIdRef.current !== owner) return;
      setWishlist(data.wishlist);
      showToast(
        line ? "Removed from My Wishlist." : "Added to My Wishlist.",
        "success",
      );
    } catch (requestError) {
      if (customerIdRef.current !== owner) return;
      setWishlist(previous);
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not update My Wishlist.",
        "error",
      );
    } finally {
      if (customerIdRef.current === owner) setPending(null);
    }
  }

  return (
    <Context.Provider
      value={{
        wishlist,
        ready,
        pending,
        error,
        reload: () => load(customerId),
        toggle,
      }}
    >
      {children}
    </Context.Provider>
  );
}

function useB2BWishlist() {
  const context = useContext(Context);
  if (!context) throw new Error("B2BWishlistProvider required");
  return context;
}

export function B2BSaveButton({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: number;
}) {
  const { t } = useB2BTranslations();
  const { wishlist, ready, pending, toggle } = useB2BWishlist();
  const saved = Boolean(matchingLine(wishlist, productId, variantId));
  const operationKey = `${productId}:${variantId ?? "default"}`;
  return (
    <button
      type="button"
      className={s.toggle}
      disabled={!ready || pending !== null}
      aria-pressed={saved}
      onClick={() => void toggle(productId, variantId)}
    >
      <HeartIcon aria-hidden="true" />
      {pending === operationKey
        ? t("Updating wishlist…")
        : saved
          ? t("In My Wishlist")
          : t("Add to My Wishlist")}
    </button>
  );
}

export function B2BHeaderWishlistLink() {
  const { t } = useB2BTranslations();
  const { wishlist } = useB2BWishlist();
  const count = wishlist?.lines.length ?? 0;
  return (
    <Link
      href="/b2b/wishlist"
      aria-label={`${t("My Wishlist")}, ${count} items`}
    >
      <HeartIcon aria-hidden="true" />
      <span>
        {t("My Wishlist")}
        {count ? ` (${count})` : ""}
      </span>
    </Link>
  );
}

export function B2BWishlistPage() {
  const { state, busy, act } = useB2B();
  const { wishlist, ready, error, reload, pending, toggle } = useB2BWishlist();
  const [feedback, setFeedback] = useState("");
  const [uncertain, setUncertain] = useState<string[]>([]);

  useEffect(() => {
    setFeedback("");
    setUncertain([]);
  }, [
    state?.customer?.id,
    state?.context?.businessUnitKey,
    state?.context?.storeKey,
  ]);

  const lines = wishlist?.lines ?? [];
  return (
    <main className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>MY WISHLIST</p>
          <h1>My Wishlist</h1>
          <p>
            Your personal wishlist follows your account, so you can return to
            these products from either the home or business storefront.
          </p>
        </div>
        <Link href="/b2b/products">Continue browsing →</Link>
      </div>
      {feedback && (
        <p className={s.feedback} role="status">
          {feedback} <Link href="/b2b/cart">View business bag →</Link>
        </p>
      )}
      {!state || (state.customer && !ready) ? (
        <div className={s.empty} role="status">
          {error ? (
            <>
              <p>My Wishlist is temporarily unavailable.</p>
              <button
                className={s.button}
                type="button"
                onClick={() => void reload()}
              >
                Try again
              </button>
            </>
          ) : (
            "Loading My Wishlist…"
          )}
        </div>
      ) : !state.customer ? (
        <section className={s.empty}>
          <h2>Sign in to use My Wishlist.</h2>
          <p>Your saved products will be available anywhere you use this account.</p>
          <Link href="/b2b/account">Sign in to your business →</Link>
        </section>
      ) : !lines.length ? (
        <section className={s.empty}>
          <h2>Your wishlist is ready.</h2>
          <p>Choose Add to My Wishlist while browsing to save products here.</p>
          <Link href="/b2b/products">Explore equipment →</Link>
        </section>
      ) : (
        <>
          <p className={s.note}>
            {lines.length} wishlist {lines.length === 1 ? "item" : "items"}
          </p>
          <div className={s.grid}>
            {lines.map((line) => {
              const product = state.products.find(
                (item) => item.id === line.productId,
              );
              const variant =
                product?.variants.find((item) => item.id === line.variantId) ??
                product?.variants[0];
              return (
                <article className={s.product} key={line.id}>
                  {product ? (
                    <>
                      <Link
                        href={`/b2b/products/${encodeURIComponent(product.id)}`}
                      >
                        {(line.image || product.image) && (
                          <img src={line.image || product.image} alt="" />
                        )}
                        <h2>{line.name || product.name}</h2>
                      </Link>
                      <p>{product.category}</p>
                      <p>
                        {state.context
                          ? variant?.price?.formatted || "Price unavailable"
                          : "Sign in and select a store for pricing"}
                      </p>
                    </>
                  ) : (
                    <>
                      {line.image && <img src={line.image} alt="" />}
                      <h2>{line.name || "Product unavailable"}</h2>
                      <p>
                        This wishlist item is not in your current business
                        assortment.
                      </p>
                    </>
                  )}
                  <div className={s.actions}>
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={() => void toggle(line.productId, line.variantId)}
                    >
                      Remove
                    </button>
                    {product && variant && (
                      <button
                        className={s.primary}
                        type="button"
                        disabled={
                          busy ||
                          !state.context ||
                          !variant.price ||
                          uncertain.includes(line.id)
                        }
                        onClick={async () => {
                          const success = await act({
                            action: "add-to-cart",
                            productId: product.id,
                            variantId: variant.id,
                            quantity: 1,
                          });
                          setFeedback(
                            success
                              ? `${product.name} added to your bag.`
                              : "The result could not be confirmed. Check your bag before adding this product again.",
                          );
                          if (!success) {
                            setUncertain((current) => [...current, line.id]);
                          }
                        }}
                      >
                        Add 1 to bag
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
