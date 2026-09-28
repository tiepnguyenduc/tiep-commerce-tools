"use client";
import Link from "next/link";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
export function B2BCart() {
  const { state, busy, act } = useB2B();
  const cart = state?.cart;
  return (
    <main className={s.main}>
      <div className={s.pageTitle}>
        <span className={s.eyebrow}>YOUR BUSINESS PURCHASE</span>
        <h1>Your bag.</h1>
        <p>
          {state?.context
            ? `Store ${state.context.storeKey} · ${state.context.currency}`
            : "Select your business and store to begin."}
        </p>
      </div>
      {!cart?.lines.length ? (
        <div className={s.empty}>
          <h2>Your next project starts here.</h2>
          <p>
            Your bag is empty. Explore the collection and find the right pieces.
          </p>
          <Link className={s.primaryLink} href="/b2b/products">
            Explore products →
          </Link>
        </div>
      ) : (
        <div className={s.accountGrid}>
          <section>
            {cart.lines.map((line) => (
              <article key={line.id} className={s.cartLine}>
                <Image
                  src={line.image}
                  alt={line.name}
                  width={180}
                  height={180}
                />
                <div>
                  <h3>{line.name}</h3>
                  <p>{line.unitPrice.formatted} each</p>
                  <label className={s.field}>
                    Quantity
                    <select
                      value={line.quantity}
                      disabled={busy}
                      onChange={(e) =>
                        void act({
                          action: "set-quantity",
                          lineItemId: line.id,
                          quantity: Number(e.target.value),
                        })
                      }
                    >
                      {Array.from(
                        new Set([1, 2, 3, 4, 5, 10, 20, line.quantity]),
                      )
                        .sort((a, b) => a - b)
                        .map((q) => (
                          <option key={q}>{q}</option>
                        ))}
                    </select>
                  </label>
                  <Button
                    variant="underlined"
                    disabled={busy}
                    onClick={() =>
                      void act({
                        action: "set-quantity",
                        lineItemId: line.id,
                        quantity: 0,
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
                <strong>{line.total.formatted}</strong>
              </article>
            ))}
            <Link className={s.textLink} href="/b2b/products">
              ← Continue shopping
            </Link>
          </section>
          <aside className={s.panel}>
            <h2>Order summary</h2>
            <dl className={s.specs}>
              <div>
                <dt>Subtotal</dt>
                <dd>{cart.subtotal.formatted}</dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd>{cart.taxTotal.formatted}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>
                  <strong>{cart.total.formatted}</strong>
                </dd>
              </div>
            </dl>
            <p>Each business unit and store has its own saved bag.</p>
            <p className={s.detailNote}>
              Online order submission is not enabled for this business workspace
              yet.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
