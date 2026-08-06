"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Cart } from "@/lib/types";
export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [removingDiscountId, setRemovingDiscountId] = useState<string | null>(
    null,
  );
  async function load() {
    const response = await fetch("/api/cart");
    const data = await response.json();
    setCart(response.ok ? data : null);
  }
  useEffect(() => {
    void load();
  }, []);
  async function setQty(productId: string, quantity: number) {
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const data = await r.json();
    if (r.ok) setCart(data);
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
    setCart(data);
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
    } catch (error) {
      setDiscountError(
        error instanceof Error ? error.message : "Discount update failed.",
      );
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
    } catch (error) {
      setDiscountError(
        error instanceof Error ? error.message : "Discount update failed.",
      );
    } finally {
      setRemovingDiscountId(null);
    }
  }
  if (!cart) return <p>Loading training cart…</p>;
  return (
    <div className="cart-layout">
      <div className="panel">
        {cart.lines.length === 0 ? (
          <div>
            <h2>Your project starts here.</h2>
            <p className="muted">
              Add a product to demonstrate the BFF-backed cart flow.
            </p>
            <Link className="button" href="/products">
              Browse catalog
            </Link>
          </div>
        ) : (
          cart.lines.map((l) => (
            <div className="cart-line" key={l.id}>
              <img src={l.image} alt="" />
              <div>
                <b>{l.name}</b>
                <p className="muted">
                  {l.sku} · {l.unitPrice.formatted}
                </p>
                <div className="qty">
                  <button onClick={() => setQty(l.productId, l.quantity - 1)}>
                    −
                  </button>
                  <span>{l.quantity}</span>
                  <button onClick={() => setQty(l.productId, l.quantity + 1)}>
                    +
                  </button>
                  <button
                    className="pill"
                    onClick={() => setQty(l.productId, 0)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <strong>{l.total.formatted}</strong>
            </div>
          ))
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
        {cart.discountTotal.centAmount > 0 && (
          <div className="row discount-row">
            <span>Discount</span>
            <strong>−{cart.discountTotal.formatted}</strong>
          </div>
        )}
        <div className="row cart-total-row">
          <span>Total</span>
          <strong>{cart.total.formatted}</strong>
        </div>
        {cart.itemCount > 0 && (
          <div className="discount-box">
            <form className="discount-form" onSubmit={applyDiscount}>
              <label htmlFor="discount-code">Discount code</label>
              <div className="discount-form-controls">
                <input
                  id="discount-code"
                  value={discountCode}
                  onChange={(event) => {
                    setDiscountCode(event.target.value);
                    setDiscountError("");
                  }}
                  placeholder="Enter code"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!discountCode.trim() || applyingDiscount}
                >
                  {applyingDiscount ? "Applying…" : "Apply"}
                </button>
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
                    <button
                      type="button"
                      onClick={() => removeDiscount(discount.id)}
                      disabled={removingDiscountId !== null}
                      aria-label={`Remove discount code ${discount.code}`}
                    >
                      {removingDiscountId === discount.id ? "Removing…" : "Remove"}
                    </button>
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
        <p className="muted">
          Shipping and tax are calculated during checkout.
        </p>
        {cart.itemCount > 0 && (
          <Link className="button accent" href={`/checkout/${cart.mode}`}>
            Checkout as {cart.mode.toUpperCase()} →
          </Link>
        )}
      </aside>
    </div>
  );
}
