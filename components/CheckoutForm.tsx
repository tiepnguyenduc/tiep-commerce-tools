"use client";
import { useState } from "react";
import type { StoreMode } from "@/lib/types";
import { CheckoutDemo } from "./CheckoutDemo";
export function CheckoutForm({ mode }: { mode: StoreMode }) {
  const [po, setPo] = useState("PO-2026-104");
  return (
    <div className="checkout-layout">
      <section className="panel">
        <span className="eyebrow">{mode.toUpperCase()} checkout</span>
        <h2>{mode === "b2b" ? "Procurement details" : "Delivery details"}</h2>
        <div className="steps">
          <span className="step on">1 · Details</span>
          <span className="step">2 · Delivery</span>
          <span className="step">3 · Payment</span>
        </div>
        {mode === "b2b" && (
          <>
            <label>
              Business unit
              <select className="field wide">
                <option>Northstar Design Group</option>
                <option>Northstar Labs</option>
              </select>
            </label>
            <label>
              Purchase order
              <input
                className="field wide"
                value={po}
                onChange={(e) => setPo(e.target.value)}
              />
            </label>
            <div className="notice">
              <b>Approval policy active</b>
              <br />
              Orders above $1,500 enter a pending flow. commercetools creates
              the Approval Flow automatically when a matching rule applies.
            </div>
          </>
        )}
        <div className="form-grid">
          <input
            className="field"
            placeholder="First name"
            defaultValue="Alex"
          />
          <input
            className="field"
            placeholder="Last name"
            defaultValue="Morgan"
          />
          <input
            className="field wide"
            placeholder="Address"
            defaultValue="40 Market Street"
          />
          <input
            className="field"
            placeholder="City"
            defaultValue="San Francisco"
          />
          <input
            className="field"
            placeholder="Postal code"
            defaultValue="94105"
          />
        </div>
        <h3>Delivery</h3>
        <div className="panel">● Standard freight · 4–7 business days</div>
      </section>
      <aside>
        <CheckoutDemo mode={mode} purchaseOrderNumber={po} />
      </aside>
    </div>
  );
}
