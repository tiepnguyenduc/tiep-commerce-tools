"use client";
import { useState } from "react";
import type { StoreMode } from "@/lib/types";
import { CheckoutDemo } from "./CheckoutDemo";
export function CheckoutForm({ mode }: { mode: StoreMode }) {
  const [po, setPo] = useState("PO-2026-104");
  const detailsFormId = `checkout-details-${mode}`;
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
        <form
          id={detailsFormId}
          onSubmit={(event) => event.preventDefault()}
        >
          {mode === "b2b" && (
            <>
              <label>
                Business unit
                <select className="field wide" required>
                  <option>Northstar Design Group</option>
                  <option>Northstar Labs</option>
                </select>
              </label>
              <label>
                Purchase order
                <input
                  className="field wide"
                  maxLength={40}
                  minLength={3}
                  placeholder="PO number"
                  required
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
              autoComplete="given-name"
              className="field"
              defaultValue="Alex"
              maxLength={50}
              placeholder="First name"
              required
            />
            <input
              autoComplete="family-name"
              className="field"
              defaultValue="Morgan"
              maxLength={50}
              placeholder="Last name"
              required
            />
            <input
              autoComplete="address-line1"
              className="field wide"
              defaultValue="40 Market Street"
              maxLength={120}
              placeholder="Address"
              required
            />
            <input
              autoComplete="address-level2"
              className="field"
              defaultValue="San Francisco"
              maxLength={80}
              placeholder="City"
              required
            />
            <input
              autoComplete="postal-code"
              className="field"
              defaultValue="94105"
              maxLength={16}
              placeholder="Postal code"
              required
            />
          </div>
        </form>
        <h3>Delivery</h3>
        <div className="panel">● Standard freight · 4–7 business days</div>
      </section>
      <aside>
        <CheckoutDemo
          detailsFormId={detailsFormId}
          mode={mode}
          purchaseOrderNumber={po.trim()}
        />
      </aside>
    </div>
  );
}
