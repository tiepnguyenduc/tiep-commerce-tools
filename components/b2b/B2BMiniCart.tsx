"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import Drawer from "@/components/commercetools-ui/atoms/drawer";
import UIButton from "@/components/commercetools-ui/atoms/button";
import ButtonLink from "@/components/commercetools-ui/atoms/button/link";
import Image from "@/components/commercetools-ui/atoms/image";
import { useToast } from "@/components/Toast";
import { CartLineVariant } from "@/components/CartLineVariant";
import type { Cart, CartLine } from "@/lib/types";
import { useB2B } from "./B2BProvider";
import { useB2BTranslations } from "./useB2BTranslations";
import s from "./B2B.module.css";

type B2BMiniCartContextValue = {
  cart: Cart | null;
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setLineQuantity: (line: CartLine, quantity: number) => Promise<boolean>;
};

const B2BMiniCartContext = createContext<B2BMiniCartContextValue>({
  cart: null,
  itemCount: 0,
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  toggleCart: () => {},
  setLineQuantity: async () => false,
});

export function useB2BMiniCart() {
  return useContext(B2BMiniCartContext);
}

export function B2BMiniCartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, busy, error, reload, act } = useB2B();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const showToast = useToast();
  const { t } = useB2BTranslations();

  const cart = state?.cart ?? null;
  const itemCount = cart?.itemCount ?? 0;

  const setLineQuantity = useCallback(
    async (line: CartLine, quantity: number) => {
      if (!cart || pendingLineId || quantity < 0 || quantity > 10000)
        return false;
      setPendingLineId(line.id);
      try {
        const success = await act({
          action: "set-quantity",
          lineItemId: line.id,
          quantity,
        });
        if (success) {
          showToast(
            quantity === 0
              ? t("Item removed from your bag.")
              : t("Your business bag was updated."),
            "success",
          );
        } else {
          showToast(t("Could not update the bag."), "error");
        }
        return success;
      } catch {
        showToast(t("Network error — could not update the bag."), "error");
        return false;
      } finally {
        setPendingLineId(null);
      }
    },
    [cart, pendingLineId, act, showToast, t],
  );

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((prev) => !prev),
      setLineQuantity,
    }),
    [cart, itemCount, isOpen, setLineQuantity],
  );

  return (
    <B2BMiniCartContext.Provider value={value}>
      {children}
      <B2BMiniCartDrawer
        cart={cart}
        busy={busy}
        error={error}
        onRetry={() => void reload()}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        pendingLineId={pendingLineId}
        setLineQuantity={setLineQuantity}
      />
    </B2BMiniCartContext.Provider>
  );
}

export function B2BHeaderCartButton() {
  const { state } = useB2B();
  const { openCart, itemCount: miniCartItemCount } = useB2BMiniCart();
  const { t } = useB2BTranslations();
  const itemCount = state?.cart?.itemCount ?? miniCartItemCount ?? 0;

  return (
    <button
      type="button"
      className={s.headerCartButton}
      onClick={openCart}
      aria-label={`Business bag, ${t("{count} items", { count: itemCount })}`}
    >
      <ShoppingBagIcon aria-hidden="true" />
      <span>
        <small>{t("Purchasing bag")}</small>
        <strong>{t("{count} items", { count: itemCount })}</strong>
      </span>
      <b className={s.mobileBagCount}>{itemCount}</b>
    </button>
  );
}

function B2BMiniCartLineItem({
  line,
  disabled,
  onQuantityChange,
  onNavigate,
}: {
  line: CartLine;
  disabled: boolean;
  onQuantityChange: (quantity: number) => Promise<boolean>;
  onNavigate: () => void;
}) {
  const href = line.productId
    ? `/b2b/products/${encodeURIComponent(line.productId)}`
    : null;

  return (
    <article className="mini-cart-line">
      {href ? (
        <Link href={href} onClick={onNavigate} tabIndex={-1} aria-hidden="true">
          <Image
            src={line.image}
            alt={line.name}
            width={82}
            height={82}
            style={{ objectFit: "contain" }}
          />
        </Link>
      ) : (
        <Image
          src={line.image}
          alt={line.name}
          width={82}
          height={82}
          style={{ objectFit: "contain" }}
        />
      )}
      <div className="mini-cart-line-info">
        <h3>
          {href ? (
            <Link href={href} onClick={onNavigate}>
              {line.name}
            </Link>
          ) : (
            line.name
          )}
        </h3>
        {line.sku && (
          <p className="muted" style={{ fontSize: "11px" }}>
            SKU: {line.sku}
          </p>
        )}
        <CartLineVariant line={line} />
        <p
          className="muted"
          style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}
        >
          {line.unitPrice.formatted}{" "}
          <span style={{ fontWeight: 400, fontSize: "11px" }}>/ unit</span>
        </p>

        <div className="mini-cart-line-actions">
          <div className="mini-cart-qty">
            <button
              type="button"
              disabled={disabled || line.quantity <= 1}
              onClick={() => void onQuantityChange(line.quantity - 1)}
              aria-label={`Decrease quantity of ${line.name}`}
            >
              −
            </button>
            <span>{line.quantity}</span>
            <button
              type="button"
              disabled={disabled || line.quantity >= 10000}
              onClick={() => void onQuantityChange(line.quantity + 1)}
              aria-label={`Increase quantity of ${line.name}`}
            >
              +
            </button>
          </div>

          <UIButton
            variant="ghost"
            size="fit"
            disabled={disabled}
            onClick={() => void onQuantityChange(0)}
            aria-label={`Remove ${line.name} from bag`}
            style={{
              color: "#8a4b38",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
            <span>Remove</span>
          </UIButton>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <strong style={{ fontSize: "14px", fontWeight: 700 }}>
          {line.total.formatted}
        </strong>
      </div>
    </article>
  );
}

function B2BMiniCartDrawer({
  cart,
  busy,
  error,
  onRetry,
  isOpen,
  onClose,
  pendingLineId,
  setLineQuantity,
}: {
  cart: Cart | null;
  busy: boolean;
  error: string;
  onRetry: () => void;
  isOpen: boolean;
  onClose: () => void;
  pendingLineId: string | null;
  setLineQuantity: (line: CartLine, quantity: number) => Promise<boolean>;
}) {
  const { t } = useB2BTranslations();
  const { state } = useB2B();
  const lines = cart?.lines ?? [];

  const activeUnit = state?.businessUnits.find(
    (item) => item.key === state.context?.businessUnitKey,
  );
  const activeStore = activeUnit?.stores.find(
    (store) => store.key === state?.context?.storeKey,
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Purchasing mini cart"
      className="storefront-mini-cart"
    >
      <header className="mini-cart-head">
        <div>
          <span
            className="eyebrow"
            style={{
              textTransform: "uppercase",
              fontSize: "10px",
              letterSpacing: "1.5px",
              color: "#6a6d62",
            }}
          >
            {t("Purchasing bag")}
          </span>
          <h2 style={{ fontSize: "22px", margin: "4px 0 0" }}>
            {cart?.itemCount ?? 0}{" "}
            {cart?.itemCount === 1 ? t("item") : t("items")}
          </h2>
          {state?.context && (
            <p
              style={{ margin: "2px 0 0", fontSize: "11px", color: "#676a5f" }}
            >
              {activeUnit?.name || state.context.businessUnitKey} ·{" "}
              {activeStore?.name || state.context.storeKey}
            </p>
          )}
        </div>
        <UIButton
          variant="ghost"
          size="fit"
          aria-label="Close mini cart"
          onClick={onClose}
          type="button"
        >
          <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
        </UIButton>
      </header>

      {error ? (
        <div className="mini-cart-empty">
          <p role="alert">{error}</p>
          <UIButton type="button" onClick={onRetry}>
            {t("Try again")}
          </UIButton>
        </div>
      ) : busy && !cart ? (
        <p role="status" className="mini-cart-empty">
          {t("Loading your cart…")}
        </p>
      ) : lines.length === 0 ? (
        <div className="mini-cart-empty">
          <h3 style={{ fontSize: "18px", margin: "0 0 6px" }}>
            {t("Your cart is empty.")}
          </h3>
          <p className="muted" style={{ fontSize: "13px", margin: "0 0 16px" }}>
            {t("Browse the catalog and add products here.")}
          </p>
          <ButtonLink variant="primary" href="/b2b/products" onClick={onClose}>
            {t("Explore products")}
          </ButtonLink>
        </div>
      ) : (
        <>
          <div className="mini-cart-lines">
            {lines.map((line) => (
              <B2BMiniCartLineItem
                key={line.id}
                line={line}
                disabled={busy || pendingLineId !== null}
                onQuantityChange={(qty) => setLineQuantity(line, qty)}
                onNavigate={onClose}
              />
            ))}
          </div>

          <footer className="mini-cart-summary">
            <div
              className="row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                margin: "4px 0",
                fontSize: "13px",
              }}
            >
              <span>{t("Subtotal")}</span>
              <strong>{cart?.subtotal.formatted}</strong>
            </div>
            {cart && cart.discountTotal.centAmount > 0 && (
              <div
                className="row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  margin: "4px 0",
                  fontSize: "13px",
                  color: "#2d613b",
                }}
              >
                <span>{t("Discount")}</span>
                <strong>−{cart.discountTotal.formatted}</strong>
              </div>
            )}
            {cart && cart.taxTotal.centAmount > 0 && (
              <div
                className="row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  margin: "4px 0",
                  fontSize: "13px",
                }}
              >
                <span>{t("Tax")}</span>
                <strong>{cart.taxTotal.formatted}</strong>
              </div>
            )}
            <div
              className="row mini-cart-total"
              style={{
                display: "flex",
                justifyContent: "space-between",
                margin: "8px 0 16px",
                paddingTop: "8px",
                borderTop: "1px solid var(--line)",
                fontSize: "16px",
              }}
            >
              <span>{t("Total")}</span>
              <strong>{cart?.total.formatted}</strong>
            </div>

            <div
              className="mini-cart-cta"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <ButtonLink
                variant="secondary"
                href="/b2b/cart"
                onClick={onClose}
                style={{ textAlign: "center", justifyContent: "center" }}
              >
                {t("View bag")}
              </ButtonLink>
              <ButtonLink
                variant="primary"
                href="/b2b/checkout"
                onClick={onClose}
                style={{ textAlign: "center", justifyContent: "center" }}
              >
                {t("Checkout")}
              </ButtonLink>
            </div>
          </footer>
        </>
      )}
    </Drawer>
  );
}
