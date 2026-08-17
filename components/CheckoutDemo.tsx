"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkoutFlow, type Message } from "@commercetools/checkout-browser-sdk";
import { useToast } from "@/components/Toast";
import type { StoreMode } from "@/lib/types";

export function CheckoutDemo({ mode }: { mode: StoreMode }) {
  const [state, setState] = useState("Opening hosted checkout...");
  const [canRetry, setCanRetry] = useState(false);
  const started = useRef(false);
  const [startingSession, setStartingSession] = useState(false);
  const showToast = useToast();

  function fail(message: string) {
    setState(message);
    setCanRetry(true);
    showToast(message, "error");
  }

  function succeed(message: string) {
    setState(message);
    setCanRetry(false);
    showToast(message, "success");
  }

  function handleError(message: Message) {
    fail(String(message.payload ?? message.code ?? "Checkout error"));
  }

  function handleInfo(message: Message) {
    if (message.code === "checkout_completed") {
      succeed("Checkout completed");
    }
  }

  const startCheckout = useCallback(async (force = false) => {
    if (startingSession) return;
    if (started.current && !force) return;
    started.current = true;
    setStartingSession(true);
    setCanRetry(false);
    setState("Creating secure session...");
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
            ? "Training result: hosted checkout submitted for approval."
            : "Training result: Order WS-1042 confirmed.",
        );
        return;
      }
      if (!r.ok) {
        fail(data.error || "Could not create session");
        return;
      }
      checkoutFlow({
        projectKey: data.projectKey,
        region: data.region,
        sessionId: data.sessionId,
        locale: "en-US",
        onError: handleError,
        onInfo: handleInfo,
      });
      showToast("Secure checkout session created.", "success");
      setCanRetry(false);
      setState("Hosted checkout is open.");
    } catch {
      fail("Network error - could not create session");
    } finally {
      setStartingSession(false);
    }
  }, [mode, showToast, startingSession]);

  useEffect(() => {
    void startCheckout();
  }, [startCheckout]);

  return (
    <div className="panel checkout-direct-panel">
      <span className="eyebrow">Hosted checkout</span>
      <h2>{startingSession ? "Opening checkout" : "Checkout status"}</h2>
      <p>{state}</p>
      {!startingSession && canRetry && (
        <button
          className="button accent"
          onClick={() => void startCheckout(true)}
        >
          Try again
        </button>
      )}
    </div>
  );
}
