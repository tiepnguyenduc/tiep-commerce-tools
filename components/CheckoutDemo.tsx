"use client";
import { useState } from "react";
import { checkoutFlow, paymentFlow } from "@commercetools/checkout-browser-sdk";
import type { StoreMode } from "@/lib/types";
export function CheckoutDemo({
  mode,
  purchaseOrderNumber,
}: {
  mode: StoreMode;
  purchaseOrderNumber?: string;
}) {
  const [flow, setFlow] = useState<"checkoutFlow" | "paymentFlow">(
    "checkoutFlow",
  );
  const [state, setState] = useState("");
  async function start() {
    setState("Creating secure session…");
    const r = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await r.json();
    if (data.training) {
      setState(
        mode === "b2b"
          ? "Training result: PO-4821 submitted and awaiting approval."
          : "Training result: Order WS-1042 confirmed.",
      );
      return;
    }
    if (!r.ok) {
      setState(data.error || "Could not create session");
      return;
    }
    const options = {
      projectKey: data.projectKey,
      region: data.region,
      sessionId: data.sessionId,
      locale: "en-US",
      onError: (e: unknown) => setState(String(e)),
      onInfo: () => setState("Checkout completed"),
    };
    if (flow === "checkoutFlow") checkoutFlow(options);
    else paymentFlow(options);
  }
  async function placeOrder() {
    setState("Creating order from active cart…");
    const r = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, purchaseOrderNumber }),
    });
    const data = await r.json();
    if (!r.ok) {
      setState(data.error || "Order creation failed");
      return;
    }
    const order = data.order;
    setState(
      data.training
        ? `Training order created: ${order.orderNumber}`
        : `Live order created: ${order.orderNumber || order.id}`,
    );
  }
  return (
    <div className="panel">
      <span className="eyebrow">Hosted checkout integration</span>
      <h2>Checkout Browser SDK</h2>
      <p className="muted">
        The BFF creates a short-lived session. Credentials never enter the
        browser bundle.
      </p>
      <select
        className="field"
        value={flow}
        onChange={(e) => setFlow(e.target.value as typeof flow)}
      >
        <option value="checkoutFlow">checkoutFlow — full hosted</option>
        <option value="paymentFlow">paymentFlow — payments only</option>
      </select>
      <div data-ctc />
      <p>{state}</p>
      <button className="button accent" onClick={start}>
        Launch {flow} →
      </button>
      <button className="button" onClick={placeOrder}>
        Create order via Cart API →
      </button>
    </div>
  );
}
