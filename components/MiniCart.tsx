"use client";
import ButtonLink from "@/components/commercetools-ui/atoms/button/link";
import dynamic from "next/dynamic";
const StorefrontCartItem = dynamic(() => import("./StorefrontCartItem").then((module) => module.StorefrontCartItem));
import Drawer from "@/components/commercetools-ui/atoms/drawer";
import UIButton from "@/components/commercetools-ui/atoms/button";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping, faXmark } from "@fortawesome/free-solid-svg-icons";
import { customerAuthChangeEvent } from "@/components/HeaderAccountLink";

import { useToast } from "@/components/Toast";
import type { Cart, CartLine } from "@/lib/types";

type MiniCartContextValue = {
  cart: Cart | null;
  itemCount: number;
  isOpen: boolean;
  closeCart: () => void;
  loadCart: () => Promise<Cart | null>;
  openCart: () => void;
  setLineQuantity: (line: CartLine, quantity: number) => Promise<void>;
  syncCart: (cart: Cart | null) => void;
};

const MiniCartContext = createContext<MiniCartContextValue>({
  cart: null,
  itemCount: 0,
  isOpen: false,
  closeCart: () => {},
  loadCart: async () => null,
  openCart: () => {},
  setLineQuantity: async () => {},
  syncCart: () => {},
});

export function useMiniCart() {
  return useContext(MiniCartContext);
}

export function MiniCartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const showToast = useToast();
  const requestVersion = useRef(0);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);

  const syncCart = useCallback((nextCart: Cart | null) => {
    requestVersion.current += 1;
    setLoading(false);
    setLoadError("");
    setCart(nextCart);
  }, []);

  const loadCart = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your cart.");
      const data = await response.json() as Cart;
      if (version === requestVersion.current) setCart(data);
      return data;
    } catch {
      if (version === requestVersion.current) setLoadError("Could not load your cart. Please try again.");
      return null;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
    const onAuthChange = () => { setCart(null); void loadCart(); };
    window.addEventListener(customerAuthChangeEvent, onAuthChange);
    return () => { requestVersion.current += 1; window.removeEventListener(customerAuthChangeEvent, onAuthChange); };
  }, [loadCart]);

  const setLineQuantity = useCallback(
    async (line: CartLine, quantity: number) => {
      if (!cart || pendingLineId || quantity < 0 || quantity > 99) return;
      setPendingLineId(line.id);
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: line.productId,
            sku: line.sku,
            quantity,
            mode: cart.mode,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showToast(data.error || "Could not update the cart.", "error");
          return;
        }
        syncCart(data);
        showToast(
          quantity === 0 ? "Item removed from your cart." : "Cart updated.",
          "success",
        );
      } catch {
        showToast("Network error — could not update the cart.", "error");
      } finally {
        setPendingLineId(null);
      }
    },
    [cart, pendingLineId, showToast, syncCart],
  );

  const value = useMemo(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      isOpen,
      closeCart: () => setIsOpen(false),
      loadCart,
      openCart: () => { setIsOpen(true); void loadCart(); },
      setLineQuantity,
      syncCart,
    }),
    [cart, isOpen, loadCart, setLineQuantity, syncCart],
  );

  return (
    <MiniCartContext.Provider value={value}>
      {children}
      <MiniCartDrawer
        cart={cart}
        loading={loading}
        loadError={loadError}
        onRetry={() => void loadCart()}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        pendingLineId={pendingLineId}
        setLineQuantity={setLineQuantity}
      />
    </MiniCartContext.Provider>
  );
}

export function HeaderCartButton() {
  const { itemCount, openCart } = useMiniCart();

  return (
    <UIButton variant="ghost" size="fit"
      aria-label={`Open cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
      className="cart-icon-button"
      onClick={openCart}
      type="button"
    >
      <FontAwesomeIcon aria-hidden="true" icon={faCartShopping} />
      <span>Cart</span>
      <strong>{itemCount}</strong>
    </UIButton>
  );
}

function MiniCartDrawer({
  loading, loadError, onRetry,
  cart,
  isOpen,
  onClose,
  pendingLineId,
  setLineQuantity,
}: {
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  cart: Cart | null;
  isOpen: boolean;
  onClose: () => void;
  pendingLineId: string | null;
  setLineQuantity: (line: CartLine, quantity: number) => Promise<void>;
}) {
  const lines = cart?.lines ?? [];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} aria-label="Mini cart" className="storefront-mini-cart">
        <header className="mini-cart-head">
          <div>
            <span className="eyebrow">Shopping cart</span>
            <h2>
              {cart?.itemCount ?? 0} item{cart?.itemCount === 1 ? "" : "s"}
            </h2>
          </div>
          <UIButton variant="ghost" size="fit" aria-label="Close mini cart" onClick={onClose} type="button">
            <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
          </UIButton>
        </header>

        {loadError ? <div className="mini-cart-empty"><p role="alert">{loadError}</p><UIButton type="button" onClick={onRetry}>Try again</UIButton></div> : loading && !cart ? <p role="status" className="mini-cart-empty">Loading your cart…</p> : lines.length === 0 ? (
          <div className="mini-cart-empty">
            <h3>Your cart is empty.</h3>
            <p className="muted">Browse the catalog and add products here.</p>
            <ButtonLink variant="primary" href="/products" onClick={onClose}>
              Browse catalog
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="mini-cart-lines">
              {lines.map((line) => <StorefrontCartItem key={line.id} onNavigate={onClose} line={line} disabled={pendingLineId !== null} onQuantityChange={(quantity) => setLineQuantity(line, quantity)} />)}
            </div>

            <footer className="mini-cart-summary">
              <div className="row">
                <span>Subtotal</span>
                <strong>{cart?.subtotal.formatted}</strong>
              </div>
              <div className="row">
                <span>Discount</span>
                <strong>
                  {cart && cart.discountTotal.centAmount > 0
                    ? `−${cart.discountTotal.formatted}`
                    : cart?.discountTotal.formatted}
                </strong>
              </div>
              <div className="row mini-cart-total">
                <span>Total</span>
                <strong>{cart?.total.formatted}</strong>
              </div>
              <div className="mini-cart-cta">
                <ButtonLink variant="secondary" href="/cart" onClick={onClose}>
                  View cart
                </ButtonLink>
                <ButtonLink
                  variant="primary"
                  href={`/checkout/${cart?.mode ?? "b2c"}`}
                  onClick={onClose}
                >
                  Checkout
                </ButtonLink>
              </div>
            </footer>
          </>
        )}
    </Drawer>
  );
}
