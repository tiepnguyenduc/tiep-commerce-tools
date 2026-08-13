"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCartShopping,
  faMinus,
  faPlus,
  faTrashCan,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
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

  const syncCart = useCallback((nextCart: Cart | null) => {
    setCart(nextCart);
  }, []);

  const loadCart = useCallback(async () => {
    try {
      const response = await fetch("/api/cart");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return null;
      setCart(data);
      return data as Cart;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

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
            quantity,
            mode: cart.mode,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showToast(data.error || "Could not update the cart.", "error");
          return;
        }
        setCart(data);
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
    [cart, pendingLineId, showToast],
  );

  const value = useMemo(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      isOpen,
      closeCart: () => setIsOpen(false),
      loadCart,
      openCart: () => setIsOpen(true),
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
    <button
      aria-label={`Open cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
      className="cart-icon-button"
      onClick={openCart}
      type="button"
    >
      <FontAwesomeIcon aria-hidden="true" icon={faCartShopping} />
      <span>Cart</span>
      <strong>{itemCount}</strong>
    </button>
  );
}

function MiniCartDrawer({
  cart,
  isOpen,
  onClose,
  pendingLineId,
  setLineQuantity,
}: {
  cart: Cart | null;
  isOpen: boolean;
  onClose: () => void;
  pendingLineId: string | null;
  setLineQuantity: (line: CartLine, quantity: number) => Promise<void>;
}) {
  const lines = cart?.lines ?? [];

  if (!isOpen) return null;

  return (
    <div
      className="mini-cart-layer open"
    >
      <button
        aria-label="Close mini cart"
        className="mini-cart-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Mini cart"
        aria-modal="true"
        className="mini-cart-drawer"
        role="dialog"
      >
        <header className="mini-cart-head">
          <div>
            <span className="eyebrow">Shopping cart</span>
            <h2>
              {cart?.itemCount ?? 0} item{cart?.itemCount === 1 ? "" : "s"}
            </h2>
          </div>
          <button aria-label="Close mini cart" onClick={onClose} type="button">
            <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="mini-cart-empty">
            <h3>Your cart is empty.</h3>
            <p className="muted">Browse the catalog and add products here.</p>
            <Link className="button accent" href="/products" onClick={onClose}>
              Browse catalog
            </Link>
          </div>
        ) : (
          <>
            <div className="mini-cart-lines">
              {lines.map((line) => {
                const productHref = `/products/${line.slug || line.productId}`;
                return (
                  <article className="mini-cart-line" key={line.id}>
                    <Link href={productHref} onClick={onClose}>
                      <img src={line.image} alt={line.name} />
                    </Link>
                    <div>
                      <h3>
                        <Link href={productHref} onClick={onClose}>
                          {line.name}
                        </Link>
                      </h3>
                      <p className="muted">
                        {line.sku} · {line.unitPrice.formatted}
                      </p>
                      <div className="mini-cart-line-actions">
                        <div className="mini-cart-qty">
                          <button
                            disabled={pendingLineId !== null}
                            onClick={() =>
                              setLineQuantity(line, line.quantity - 1)
                            }
                            type="button"
                          >
                            <FontAwesomeIcon aria-hidden="true" icon={faMinus} />
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            disabled={
                              pendingLineId !== null || line.quantity >= 99
                            }
                            onClick={() =>
                              setLineQuantity(line, line.quantity + 1)
                            }
                            type="button"
                          >
                            <FontAwesomeIcon aria-hidden="true" icon={faPlus} />
                          </button>
                        </div>
                        <button
                          className="text-button danger"
                          disabled={pendingLineId !== null}
                          onClick={() => setLineQuantity(line, 0)}
                          type="button"
                        >
                          <FontAwesomeIcon aria-hidden="true" icon={faTrashCan} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                    <strong>{line.total.formatted}</strong>
                  </article>
                );
              })}
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
                <Link className="button" href="/cart" onClick={onClose}>
                  View cart
                </Link>
                <Link
                  className="button accent"
                  href={`/checkout/${cart?.mode ?? "b2c"}`}
                  onClick={onClose}
                >
                  Checkout
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
