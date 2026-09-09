"use client";
import ButtonLink from "@/components/commercetools-ui/atoms/button/link";
import CTInput from "@/components/commercetools-ui/atoms/input";
import { StorefrontCartItem } from "./StorefrontCartItem";
import UIButton from "@/components/commercetools-ui/atoms/button";
import { useEffect, useMemo, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

import { useMiniCart } from "@/components/MiniCart";
import { ProductItemSlider } from "@/components/ProductItemSlider";
import { type RecentlyViewedProduct, useRecentlyViewedProducts } from "@/components/RecentlyViewedProducts";
import { useToast } from "@/components/Toast";
import type { Cart, CartLine } from "@/lib/types";

export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);
  const [removingDiscountId, setRemovingDiscountId] = useState<string | null>(
    null,
  );
  const recentlyViewedProducts = useRecentlyViewedProducts();
  const { syncCart } = useMiniCart();
  const showToast = useToast();
  const suggestedProducts = useMemo(
    () => recentlyViewedProducts.slice(0, 8),
    [recentlyViewedProducts],
  );

  function receiveCart(nextCart: Cart | null) {
    setCart(nextCart);
    syncCart(nextCart);
  }

  async function load() {
    const response = await fetch("/api/cart");
    const data = await response.json();
    receiveCart(response.ok ? data : null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setQty(
    line: Pick<CartLine, "id" | "productId" | "sku">,
    quantity: number,
  ) {
    if (!cart || pendingLineId || clearingCart) return;
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
    const existing = cart.lines.find(
      (line) => line.sku === product.sku || line.productId === product.id,
    );
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
    if (!cart || clearingCart || pendingLineId || cart.itemCount === 0) return;
    setClearingCart(true);
    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: cart.mode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(data.error || "Could not clear the cart.", "error");
        return;
      }
      receiveCart(data);
      showToast("Cart cleared.", "success");
    } catch {
      showToast("Network error — could not clear the cart.", "error");
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
    if (!response.ok) {
      throw new Error(data.error || "Discount update failed.");
    }
    receiveCart(data);
  }

  async function applyDiscount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = discountCode.trim();
    if (!code || applyingDiscount) return;
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
    if (removingDiscountId) return;
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

  if (!cart) return <p>Loading training cart…</p>;

  return (
    <>
      <div className="cart-layout">
        <div className="panel">
          <div className="cart-panel-head">
            <h2>Cart items</h2>
            {cart.itemCount > 0 && (
              <UIButton variant="ghost" size="fit"
                className="text-button danger"
                disabled={clearingCart || pendingLineId !== null}
                onClick={clearAllItems}
                type="button"
              >
                {clearingCart ? "Clearing…" : "Clear all"}
              </UIButton>
            )}
          </div>

          {cart.lines.length === 0 ? (
            <div>
              <h2>Your project starts here.</h2>
              <p className="muted">
                Add a product to demonstrate the BFF-backed cart flow.
              </p>
            </div>
          ) : (
            cart.lines.map((line) => <StorefrontCartItem key={line.id} line={line} disabled={pendingLineId !== null || clearingCart} onQuantityChange={(quantity) => setQty(line, quantity)} />)
          )}
        </div>

        <aside className="panel">
          <span className="eyebrow">Order summary</span>
          <h2>
            {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
          </h2>
          <div className="row">
            <span>Subtotal</span>
            <strong>{cart.subtotal.formatted}</strong>
          </div>
          <div className="row">
            <span>Tax</span>
            <strong>{cart.taxTotal.formatted}</strong>
          </div>
          <div className="row discount-row">
            <span>Discount</span>
            <strong>
              {cart.discountTotal.centAmount > 0
                ? `−${cart.discountTotal.formatted}`
                : cart.discountTotal.formatted}
            </strong>
          </div>
          <div className="row cart-total-row">
            <span>Total</span>
            <strong>{cart.total.formatted}</strong>
          </div>
          {cart.itemCount > 0 && (
            <div className="discount-box">
              <form className="discount-form" onSubmit={applyDiscount}>
                <label htmlFor="discount-code">Discount code</label>
                <div className="discount-form-controls">
                  <CTInput
                    autoComplete="off"
                    id="discount-code"
                    maxLength={32}
                    minLength={2}
                    pattern="\\S.*"
                    required
                    value={discountCode}
                    onChange={(event) => {
                      setDiscountCode(event.target.value);
                      setDiscountError("");
                    }}
                    placeholder="Enter code"
                    title="Enter a valid discount code."
                  />
                  <UIButton variant="ghost" size="fit"
                    type="submit"
                    disabled={!discountCode.trim() || applyingDiscount}
                  >
                    {applyingDiscount ? "Applying…" : "Apply"}
                  </UIButton>
                </div>
              </form>
              {cart.discountCodes.length > 0 && (
                <div className="discount-codes" aria-label="Applied discount codes">
                  {cart.discountCodes.map((discount) => (
                    <div className="discount-chip" key={discount.id}>
                      <span>
                        <strong>{discount.code}</strong>
                        {discount.state !== "MatchesCart" && (
                          <small>{discount.state}</small>
                        )}
                      </span>
                      <UIButton variant="ghost" size="fit"
                        type="button"
                        onClick={() => removeDiscount(discount.id)}
                        disabled={removingDiscountId !== null}
                        aria-label={`Remove discount code ${discount.code}`}
                      >
                        {removingDiscountId === discount.id
                          ? "Removing…"
                          : "Remove"}
                      </UIButton>
                    </div>
                  ))}
                </div>
              )}
              {discountError && (
                <p className="discount-error" role="alert">
                  {discountError}
                </p>
              )}
            </div>
          )}
          <p className="muted">Shipping is calculated during checkout.</p>
          {cart.itemCount > 0 && (
            <ButtonLink variant="primary" href={`/checkout/${cart.mode}`}>
              <span>Checkout as {cart.mode.toUpperCase()}</span>
              <FontAwesomeIcon aria-hidden="true" icon={faArrowRight} />
            </ButtonLink>
          )}
        </aside>
      </div>

      {suggestedProducts.length > 0 && (
        <ProductItemSlider
          className="panel recently-viewed"
          eyebrow="Recently viewed"
          products={suggestedProducts}
          renderAction={(product) => {
            const existingLine = cart.lines.find(
              (line) => line.productId === product.id,
            );
            const pendingProductLineId =
              existingLine?.id ?? `recent-${product.id}`;
            return (
              <UIButton variant="ghost" size="fit"
                className="pill"
                disabled={
                  pendingLineId !== null ||
                  clearingCart ||
                  (existingLine?.quantity ?? 0) >= 99
                }
                onClick={() => addRecentlyViewedProduct(product)}
                type="button"
              >
                {pendingLineId === pendingProductLineId ? "Adding…" : "Add"}
              </UIButton>
            );
          }}
          title="Products you looked at"
        />
      )}
    </>
  );
}
