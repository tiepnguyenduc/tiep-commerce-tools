"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import type { CartLine } from "@/lib/types";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";

function BagLine({ line }: { line: CartLine }) {
  const { busy, act } = useB2B();
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const amount = Number(quantity);
  const valid =
    /^\d+$/.test(quantity) &&
    Number.isSafeInteger(amount) &&
    amount > 0 &&
    amount <= 10000;
  const dirty = amount !== line.quantity;
  const href = line.productId
    ? `/b2b/products/${encodeURIComponent(line.productId)}`
    : null;
  async function update(next: number) {
    setPending(true);
    setFailed(false);
    const saved = await act({
      action: "set-quantity",
      lineItemId: line.id,
      quantity: next,
    });
    setFailed(!saved);
    setPending(false);
  }
  const productImage = (
    <Image src={line.image} alt={line.name} width={180} height={180} />
  );
  return (
    <article className={s.bagLine} aria-busy={pending}>
      {href ? (
        <Link
          href={href}
          className={s.bagImage}
          tabIndex={-1}
          aria-hidden="true"
        >
          {productImage}
        </Link>
      ) : (
        <div className={s.bagImage}>{productImage}</div>
      )}
      <div className={s.bagProduct}>
        <h3>{href ? <Link href={href}>{line.name}</Link> : line.name}</h3>
        {line.variantLabel && line.variantLabel !== line.sku && (
          <p>{line.variantLabel}</p>
        )}
        {line.sku && <p className={s.bagSku}>SKU {line.sku}</p>}
        <p className={s.bagUnitPrice}>
          {line.unitPrice.formatted} <span>/ unit</span>
        </p>
        <form
          className={s.bagQuantityForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && dirty && !busy) void update(amount);
          }}
        >
          <label htmlFor={`quantity-${line.id}`}>Quantity</label>
          <div className={s.bagControls}>
            <div className={s.bagStepper}>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Decrease quantity of ${line.name}`}
                disabled={busy || !valid || amount <= 1}
                onClick={() => setQuantity(String(amount - 1))}
              >
                −
              </Button>
              <input
                id={`quantity-${line.id}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={quantity}
                disabled={busy}
                aria-invalid={!valid}
                aria-describedby={
                  !valid ? `quantity-error-${line.id}` : undefined
                }
                onChange={(event) => setQuantity(event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                aria-label={`Increase quantity of ${line.name}`}
                disabled={busy || !valid || amount >= 10000}
                onClick={() => setQuantity(String(amount + 1))}
              >
                +
              </Button>
            </div>
            {dirty && (
              <Button
                type="submit"
                className={s.bagUpdate}
                disabled={busy || !valid}
              >
                Update
              </Button>
            )}
            <Button
              type="button"
              variant="underlined"
              className={s.bagRemove}
              disabled={busy}
              onClick={() => void update(0)}
            >
              Remove
            </Button>
          </div>
          {!valid && (
            <span id={`quantity-error-${line.id}`} className={s.bagError}>
              Enter a whole number from 1 to 10,000.
            </span>
          )}
          {pending && (
            <span role="status" className={s.bagFeedback}>
              Updating your bag…
            </span>
          )}
          {failed && (
            <span role="alert" className={s.bagError}>
              Your change wasn’t saved. Please try again.
            </span>
          )}
        </form>
      </div>
      <div className={s.bagLineTotal}>
        <span>Line total</span>
        <strong>{line.total.formatted}</strong>
      </div>
    </article>
  );
}

export function B2BCart() {
  const { state, busy, error, reload } = useB2B();
  const cart = state?.cart;
  const unit = state?.businessUnits.find(
    (entry) => entry.key === state.context?.businessUnitKey,
  );
  const store = unit?.stores.find(
    (entry) => entry.key === state?.context?.storeKey,
  );
  return (
    <main className={`${s.main} ${s.bagMain}`}>
      <header className={s.bagHeading}>
        <div>
          <span className={s.eyebrow}>YOUR BUSINESS PURCHASE</span>
          <h1>
            Your bag<span>.</span>
          </h1>
          <p>Review the essentials for your next project.</p>
        </div>
        {cart && cart.lines.length > 0 && (
          <span className={s.bagCount}>
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} in your
            bag
          </span>
        )}
      </header>
      {!state ? (
        <section className={s.bagEmpty} aria-busy={busy}>
          <h2>
            {error ? "We couldn’t load your bag." : "Getting your bag ready…"}
          </h2>
          <p>
            {error
              ? "Please try again to see your saved business purchase."
              : "Loading your business context and saved items."}
          </p>
          {error && (
            <Button
              className={s.button}
              disabled={busy}
              onClick={() => void reload()}
            >
              Try again
            </Button>
          )}
        </section>
      ) : !cart?.lines.length ? (
        <section className={s.bagEmpty}>
          <span className={s.eyebrow}>ROOM FOR YOUR NEXT PROJECT</span>
          <h2>Your essentials are waiting.</h2>
          <p>
            {state.context
              ? "Your bag is empty. Find the right tools, materials and equipment for the work ahead."
              : "Choose your business and store to start building a bag for your team."}
          </p>
          <Link
            className={s.primaryLink}
            href={state.context ? "/b2b/products" : "/b2b/account"}
          >
            {state.context ? "Explore products" : "Set up your business"}{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <div className={s.bagLayout}>
          <section aria-label="Items in your bag" className={s.bagItems}>
            <div className={s.bagSectionHeading}>
              <h2>Your items</h2>
              <span>PRICE IN {cart.total.currencyCode}</span>
            </div>
            {cart.lines.map((line) => (
              <BagLine
                key={`${cart.id}-${line.id}-${line.quantity}`}
                line={line}
              />
            ))}
            <div className={s.bagContinue}>
              <Link className={s.textLink} href="/b2b/products">
                ← Continue shopping
              </Link>
              <span>Saved to your business bag</span>
            </div>
          </section>
          <aside className={s.bagSummary} aria-labelledby="bag-summary-title">
            <span className={s.eyebrow}>THE PURCHASE AT A GLANCE</span>
            <h2 id="bag-summary-title">Order summary</h2>
            {state.context && (
              <div className={s.bagContext}>
                <strong>{unit?.name || state.context.businessUnitKey}</strong>
                <span>{store?.name || state.context.storeKey}</span>
              </div>
            )}
            <dl className={s.bagTotals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{cart.subtotal.formatted}</dd>
              </div>
              {cart.discountTotal.centAmount > 0 && (
                <div>
                  <dt>Discounts</dt>
                  <dd>−{cart.discountTotal.formatted}</dd>
                </div>
              )}
              <div>
                <dt>Tax currently calculated</dt>
                <dd>{cart.taxTotal.formatted}</dd>
              </div>
              <div className={s.bagGrandTotal}>
                <dt>
                  Total <span>{cart.total.currencyCode}</span>
                </dt>
                <dd>{cart.total.formatted}</dd>
              </div>
            </dl>
            <p className={s.bagTaxNote}>
              Shipping and final tax are not confirmed.
            </p>
            <div className={s.bagCheckoutNotice}>
              <strong>Checkout is not available yet</strong>
              <p>
                Online order submission is not enabled for this business
                workspace. Your items are saved here for later.
              </p>
            </div>
            <p className={s.bagSavedNote}>
              Each business and store has its own saved bag.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
