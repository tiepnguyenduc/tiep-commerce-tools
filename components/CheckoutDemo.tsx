"use client";
import { useState } from "react";
import { checkoutFlow, paymentFlow } from "@commercetools/checkout-browser-sdk";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/Toast";
import type { StoreMode } from "@/lib/types";
export function CheckoutDemo({
  detailsFormId,
  mode,
  purchaseOrderNumber,
}: {
  detailsFormId?: string;
  mode: StoreMode;
  purchaseOrderNumber?: string;
}) {
  const [flow, setFlow] = useState<"checkoutFlow" | "paymentFlow">(
    "checkoutFlow",
  );
  const [state, setState] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const showToast = useToast();
  const busy = startingSession || placingOrder;
  function fail(message: string) {
    setState(message);
    showToast(message, "error");
  }
  function succeed(message: string) {
    setState(message);
    showToast(message, "success");
  }
  function validateDetails() {
    if (!detailsFormId) return true;
    const form = document.getElementById(detailsFormId);
    if (!(form instanceof HTMLFormElement)) return true;
    const valid = form.reportValidity();
    if (!valid) {
      showToast("Complete the required checkout details.", "error");
    }
    return valid;
  }
  async function start() {
    if (busy) return;
    if (!validateDetails()) return;
    setStartingSession(true);
    setState("Creating secure session…");
    try {
      const r = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await r.json().catch(() => ({}));
      if (data.training) {
        succeed(
          mode === "b2b"
            ? "Training result: PO-4821 submitted and awaiting approval."
            : "Training result: Order WS-1042 confirmed.",
        );
        return;
      }
      if (!r.ok) {
        fail(data.error || "Could not create session");
        return;
      }
      const options = {
        projectKey: data.projectKey,
        region: data.region,
        sessionId: data.sessionId,
        locale: "en-US",
        onError: (e: unknown) => fail(String(e)),
        onInfo: () => succeed("Checkout completed"),
      };
      showToast("Secure checkout session created.", "success");
      if (flow === "checkoutFlow") checkoutFlow(options);
      else paymentFlow(options);
    } catch {
      fail("Network error — could not create session");
    } finally {
      setStartingSession(false);
    }
  }
  async function placeOrder() {
    if (busy) return;
    if (!validateDetails()) return;
    setPlacingOrder(true);
    setState("Creating order from active cart…");
    try {
      const r = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, purchaseOrderNumber }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        fail(data.error || "Order creation failed");
        return;
      }
      const order = data.order;
      succeed(
        data.training
          ? `Training order created: ${order.orderNumber}`
          : `Live order created: ${order.orderNumber || order.id}`,
      );
    } catch {
      fail("Network error — order creation failed");
    } finally {
      setPlacingOrder(false);
    }
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
      <button className="button accent" disabled={busy} onClick={start}>
        {startingSession ? (
          "Creating session…"
        ) : (
          <>
            <span>Launch {flow}</span>
            <FontAwesomeIcon aria-hidden="true" icon={faArrowRight} />
          </>
        )}
      </button>
      <button className="button" disabled={busy} onClick={placeOrder}>
        {placingOrder ? (
          "Creating order…"
        ) : (
          <>
            <span>Create order via Cart API</span>
            <FontAwesomeIcon aria-hidden="true" icon={faArrowRight} />
          </>
        )}
      </button>
    </div>
  );
}
