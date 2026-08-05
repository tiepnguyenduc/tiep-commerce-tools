"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Cart } from "@/lib/types";
export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
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
