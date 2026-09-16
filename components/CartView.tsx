"use client";
import ButtonLink from "@/components/commercetools-ui/atoms/button/link";
import CTInput from "@/components/commercetools-ui/atoms/input";
import { CartLineVariant } from "./CartLineVariant";
import QuantitySelector from "@/components/commercetools-ui/atoms/quantity-selector";
import Image from "@/components/commercetools-ui/atoms/image";
import Link from "next/link";
import styles from "./CartView.module.css";
import UIButton from "@/components/commercetools-ui/atoms/button";
import { useEffect, useMemo, useRef, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowLeft,
  faBagShopping,
  faTrashCan,
  faCartPlus,
} from "@fortawesome/free-solid-svg-icons";

import { useMiniCart } from "@/components/MiniCart";
import { ProductItemSlider } from "@/components/ProductItemSlider";
import {
  type RecentlyViewedProduct,
  useRecentlyViewedProducts,
} from "@/components/RecentlyViewedProducts";
import { useToast } from "@/components/Toast";
import type { Cart, CartLine } from "@/lib/types";

export function CartView() {
  const summaryRef = useRef<HTMLElement>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);
  const [removingDiscountId, setRemovingDiscountId] = useState<string | null>(
    null,
  );
  const recentlyViewedProducts = useRecentlyViewedProducts();
  const { cart, syncCart, loading, loadError, loadCart } = useMiniCart();
  const busy =
    pendingLineId !== null ||
    clearingCart ||
    applyingDiscount ||
    removingDiscountId !== null;
  const showToast = useToast();
  const suggestedProducts = useMemo(
    () => recentlyViewedProducts.slice(0, 8),
    [recentlyViewedProducts],
  );

  useEffect(() => {
    const summary = summaryRef.current;
    const header = document.querySelector("header.header");
    if (!summary || !header) return;
    const updatePosition = () => {
      const offset = header.getBoundingClientRect().height + 24;
      summary.style.setProperty("--cart-summary-offset", `${offset}px`);
      summary.dataset.sticky = String(
        window.innerHeight >= offset + summary.offsetHeight + 24,
      );
    };
    const observer = new ResizeObserver(updatePosition);
    observer.observe(header);
    observer.observe(summary);
    window.addEventListener("resize", updatePosition);
    updatePosition();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [cart?.lines.length]);

  function receiveCart(nextCart: Cart | null) {
    syncCart(nextCart);
  }

  async function setQty(
    line: Pick<CartLine, "id" | "productId" | "sku">,
    quantity: number,
  ) {
    if (!cart || busy) return;
    setPendingLineId(line.id);
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: line.productId,
          sku: line.sku,
          quantity,
          mode: cart.mode,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(data.error || "Could not update the cart.", "error");
        return;
      }
      receiveCart(data);
      showToast(
        quantity === 0 ? "Item removed from your cart." : "Cart updated.",
        "success",
      );
    } catch {
      showToast("Network error — could not update the cart.", "error");
    } finally {
      setPendingLineId(null);
    }
  }

  async function addRecentlyViewedProduct(product: RecentlyViewedProduct) {
    if (!cart) return;
    const existing = cart.lines.find((line) => line.sku === product.sku);
    await setQty(
      existing ?? {
        id: `recent-${product.id}`,
        productId: product.id,
        sku: product.sku,
      },
      (existing?.quantity ?? 0) + 1,
    );
  }

  async function clearAllItems() {
    if (!cart || busy || cart.itemCount === 0) return;
    setClearingCart(true);
    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: cart.mode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Could not clear the cart.");
      receiveCart(data);
      showToast("Cart cleared.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not clear the cart.",
        "error",
      );
    } finally {
      setClearingCart(false);
    }
  }

  async function updateDiscount(
    method: "POST" | "DELETE",
    body: Record<string, string>,
  ) {
    if (!cart) return;
    const response = await fetch("/api/cart/discount", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, mode: cart.mode }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Discount update failed.");
    receiveCart(data);
  }

  async function applyDiscount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = discountCode.trim();
    if (!code || busy) return;
    setApplyingDiscount(true);
    setDiscountError("");
    try {
      await updateDiscount("POST", { code });
      setDiscountCode("");
      showToast(`Discount code ${code} applied.`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Discount update failed.";
      setDiscountError(message);
      showToast(message, "error");
    } finally {
      setApplyingDiscount(false);
    }
  }

  async function removeDiscount(discountCodeId: string) {
    if (busy) return;
    setRemovingDiscountId(discountCodeId);
    setDiscountError("");
    try {
      await updateDiscount("DELETE", { discountCodeId });
      showToast("Discount code removed.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Discount update failed.";
      setDiscountError(message);
      showToast(message, "error");
    } finally {
      setRemovingDiscountId(null);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Shopping bag</span>
      </nav>
      <header className={styles.heading}>
        <div>
          <h1>Your shopping bag</h1>
        </div>
        <Link className={styles.continueLink} href="/products">
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> Continue
          shopping
        </Link>
      </header>
      {loadError && (
        <div className={styles.error} role="alert">
          <span>{loadError}</span>
          <UIButton
            variant="secondary"
            size="s"
            onClick={() => void loadCart()}
            disabled={loading}
          >
            Try again
          </UIButton>
        </div>
      )}
      {!cart ? (
        loading ? (
          <div
            className={styles.loading}
            role="status"
            aria-label="Loading your shopping bag"
          >
            <div />
            <div />
            <div />
            <p>Loading your shopping bag…</p>
          </div>
        ) : !loadError ? (
          <p role="status">
            Your shopping bag is unavailable. Please try again.
          </p>
        ) : null
      ) : cart.lines.length === 0 ? (
        <section className={styles.empty}>
          <FontAwesomeIcon icon={faBagShopping} aria-hidden="true" />
          <p className={styles.eyebrow}>Room for something lovely</p>
          <h2>Your bag is waiting.</h2>
          <p>Discover considered pieces for the spaces you love.</p>
          <ButtonLink
            href="/products"
            variant="primary"
            className={styles.checkout}
          >
            Explore the collection{" "}
            <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
          </ButtonLink>
        </section>
      ) : (
        <div className={styles.layout}>
          <section
            className={styles.items}
            aria-label="Items in your shopping bag"
            aria-busy={busy}
          >
            <div className={styles.listHeading}>
              <h2>
                {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} in your
                bag
              </h2>
              <UIButton
                variant="ghost"
                size="s"
                className={`${styles.continueLink} ${styles.clear}`}
                disabled={busy}
                loading={clearingCart}
                onClick={clearAllItems}
              >
                Clear bag
              </UIButton>
            </div>
            {cart.lines.map((line) => (
              <article className={styles.item} key={line.id}>
                <Link
                  className={styles.image}
                  href={`/products/${line.slug || line.productId}`}
                  aria-label={`View ${line.name}`}
                >
                  <Image
                    src={line.image}
                    alt={line.name}
                    fill
                    sizes="(max-width: 600px) 104px, 180px"
                    style={{ objectFit: "contain" }}
                  />
                </Link>
                <div className={styles.productInfo}>
                  <p className={styles.sku}>SKU {line.sku}</p>
                  <h3>
                    <Link href={`/products/${line.slug || line.productId}`}>
                      {line.name}
                    </Link>
                  </h3>
                  <CartLineVariant line={line} shopperFacing />
                  <p className={styles.unitPrice}>
                    {line.unitPrice.formatted} <span>/ each</span>
                  </p>
                  <div className={styles.actions}>
                    <QuantitySelector
                      className={styles.quantity}
                      label={`Quantity for ${line.name}`}
                      editable
                      value={line.quantity}
                      minValue={1}
                      maxValue={99}
                      disabled={busy}
                      onChange={(quantity) => void setQty(line, quantity)}
                    />
                    <UIButton
                      variant="ghost"
                      size="s"
                      className={styles.remove}
                      disabled={busy}
                      onClick={() => void setQty(line, 0)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
                      <span>Remove</span>
                    </UIButton>
                  </div>
                </div>
                <div className={styles.lineTotal}>
                  <span>Item total</span>
                  <strong>{line.total.formatted}</strong>
                  {pendingLineId === line.id && (
                    <small role="status">Updating…</small>
                  )}
                </div>
              </article>
            ))}
          </section>
          <aside
            ref={summaryRef}
            className={styles.summary}
            aria-labelledby="cart-summary-title"
          >
            <p className={styles.eyebrow}>A little closer to home</p>
            <h2 id="cart-summary-title">Order summary</h2>
            <dl className={styles.totals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{cart.subtotal.formatted}</dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd>{cart.taxTotal.formatted}</dd>
              </div>
              <div
                className={
                  cart.discountTotal.centAmount > 0 ? styles.saving : undefined
                }
              >
                <dt>Discount</dt>
                <dd>
                  {cart.discountTotal.centAmount > 0 ? "−" : ""}
                  {cart.discountTotal.formatted}
                </dd>
              </div>
            </dl>
            <div className={styles.discount}>
              <form onSubmit={applyDiscount}>
                <label htmlFor="discount-code">Have a discount code?</label>
                <div className={styles.discountControls}>
                  <CTInput
                    id="discount-code"
                    containerClassName={styles.codeInput}
                    aria-describedby={
                      discountError ? "cart-discount-error" : undefined
                    }
                    aria-invalid={!!discountError}
                    autoComplete="off"
                    maxLength={32}
                    minLength={2}
                    required
                    disabled={busy}
                    value={discountCode}
                    onChange={(event) => {
                      setDiscountCode(event.target.value);
                      setDiscountError("");
                    }}
                    placeholder="Enter your code"
                  />
                  <UIButton
                    variant="secondary"
                    size="s"
                    className={styles.apply}
                    type="submit"
                    disabled={!discountCode.trim() || busy}
                    loading={applyingDiscount}
                  >
                    Apply
                  </UIButton>
                </div>
              </form>
              {cart.discountCodes.length > 0 && (
                <ul
                  className={styles.codes}
                  aria-label="Applied discount codes"
                >
                  {cart.discountCodes.map((discount) => (
                    <li key={discount.id}>
                      <span>
                        <strong>{discount.code}</strong>
                        {discount.state !== "MatchesCart" && (
                          <small>Not applied to this bag</small>
                        )}
                      </span>
                      <UIButton
                        variant="underlined"
                        size="s"
                        disabled={busy}
                        onClick={() => void removeDiscount(discount.id)}
                        aria-label={`Remove discount code ${discount.code}`}
                      >
                        {removingDiscountId === discount.id
                          ? "Removing…"
                          : "Remove"}
                      </UIButton>
                    </li>
                  ))}
                </ul>
              )}
              {discountError && (
                <p
                  id="cart-discount-error"
                  className={styles.discountError}
                  role="alert"
                >
                  {discountError}
                </p>
              )}
            </div>
            <div className={styles.total}>
              <span>Total</span>
              <strong>{cart.total.formatted}</strong>
            </div>
            <p className={styles.shipping}>
              Shipping is calculated at checkout.
            </p>
            {busy ? (
              <UIButton
                className={styles.checkout}
                variant="primary"
                size="full"
                disabled
              >
                Updating your bag…
              </UIButton>
            ) : (
              <ButtonLink
                className={styles.checkout}
                variant="primary"
                size="full"
                href={`/checkout/${cart.mode}`}
              >
                {cart.mode === "b2b"
                  ? "Business checkout"
                  : "Continue to checkout"}
                <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
              </ButtonLink>
            )}
            <p className={styles.summaryNote}>
              Review your delivery and payment details in the next step.
            </p>
          </aside>
        </div>
      )}
      {cart && suggestedProducts.length > 0 && (
        <ProductItemSlider
          className={`panel product-related ${styles.recent}`}
          eyebrow="Worth another look"
          title="Recently viewed"
          products={suggestedProducts}
          renderAction={(product) => {
            const existing = cart.lines.find(
              (line) => line.sku === product.sku,
            );
            return (
              <UIButton
                size="xs"
                iconPosition="left"
                className={`launchpad-add-to-cart gap-10${existing ? " in-cart" : ""}`}
                loading={
                  pendingLineId === (existing?.id ?? `recent-${product.id}`)
                }
                aria-label={
                  existing
                    ? `Add more to cart (${existing.quantity} in cart)`
                    : undefined
                }
                disabled={busy || (existing?.quantity ?? 0) >= 99}
                onClick={() => void addRecentlyViewedProduct(product)}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faCartPlus} />
                <span>
                  {existing ? `In cart (${existing.quantity}) +` : "Add"}
                </span>
              </UIButton>
            );
          }}
        />
      )}
    </div>
  );
}
