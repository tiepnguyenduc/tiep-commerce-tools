"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faBagShopping,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import { useToast } from "@/components/Toast";
import { CartLineVariant } from "@/components/CartLineVariant";
import type { CartLine } from "@/lib/types";
import { useB2B } from "./B2BProvider";
import { useB2BTranslations } from "./useB2BTranslations";
import { B2BProductCard } from "./B2BProductCard";
import s from "./B2B.module.css";

function BagLine({ line }: { line: CartLine }) {
  const { busy, act } = useB2B();
  const { t } = useB2BTranslations();
  const showToast = useToast();
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
    if (busy || pending) return;
    setPending(true);
    setFailed(false);
    const saved = await act({
      action: "set-quantity",
      lineItemId: line.id,
      quantity: next,
    });
    setFailed(!saved);
    setPending(false);
    if (saved) {
      showToast(
        next === 0
          ? t("Item removed from your bag.")
          : t("Your business bag was updated."),
        "success",
      );
    } else {
      showToast(t("Could not update the bag."), "error");
    }
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
        {line.sku && <p className={s.bagSku}>SKU {line.sku}</p>}
        <CartLineVariant line={line} shopperFacing />
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
          <label htmlFor={`quantity-${line.id}`}>{t("Quantity")}</label>
          <div className={s.bagControls}>
            <div className={s.bagStepper}>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Decrease quantity of ${line.name}`}
                disabled={busy || pending || !valid || amount <= 1}
                onClick={() => {
                  const next = Math.max(1, amount - 1);
                  setQuantity(String(next));
                }}
              >
                −
              </Button>
              <input
                id={`quantity-${line.id}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={quantity}
                disabled={busy || pending}
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
                disabled={busy || pending || !valid || amount >= 10000}
                onClick={() => {
                  const next = Math.min(10000, amount + 1);
                  setQuantity(String(next));
                }}
              >
                +
              </Button>
            </div>
            {dirty && (
              <Button
                type="submit"
                className={s.bagUpdate}
                disabled={busy || pending || !valid}
              >
                {t("Update")}
              </Button>
            )}
            <Button
              type="button"
              variant="underlined"
              className={s.bagRemove}
              disabled={busy || pending}
              onClick={() => void update(0)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
              <span>{t("Remove")}</span>
            </Button>
          </div>
          {!valid && (
            <span id={`quantity-error-${line.id}`} className={s.bagError}>
              {t("Enter a whole number from 1 to 10,000.")}
            </span>
          )}
          {pending && (
            <span role="status" className={s.bagFeedback}>
              {t("Updating your bag…")}
            </span>
          )}
          {failed && (
            <span role="alert" className={s.bagError}>
              {t("Your change wasn’t saved. Please try again.")}
            </span>
          )}
        </form>
      </div>
      <div className={s.bagLineTotal}>
        <span>{t("Line total")}</span>
        <strong>{line.total.formatted}</strong>
      </div>
    </article>
  );
}

export function B2BCart() {
  const { state, busy, error, reload, act } = useB2B();
  const { t } = useB2BTranslations();
  const showToast = useToast();
  const [clearing, setClearing] = useState(false);

  const cart = state?.cart;
  const unit = state?.businessUnits.find(
    (entry) => entry.key === state.context?.businessUnitKey,
  );
  const store = unit?.stores.find(
    (entry) => entry.key === state?.context?.storeKey,
  );

  const suggestedProducts = useMemo(() => {
    if (!state?.products) return [];
    const inBagSkus = new Set((cart?.lines ?? []).map((l) => l.sku));
    return state.products
      .filter((p) => !p.variants.some((v) => inBagSkus.has(v.sku)))
      .slice(0, 4);
  }, [state?.products, cart?.lines]);

  async function clearBag() {
    if (busy || clearing || !cart?.lines.length) return;
    setClearing(true);
    try {
      const success = await act({ action: "clear-cart" });
      if (success) {
        showToast(t("Your purchasing bag was cleared."), "success");
      } else {
        showToast(t("Could not clear the bag."), "error");
      }
    } catch {
      showToast(t("Could not clear the bag."), "error");
    } finally {
      setClearing(false);
    }
  }

  return (
    <main className={`${s.main} ${s.bagMain}`}>
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <Link href="/b2b">{t("Home")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("Purchasing bag")}</span>
      </nav>

      <header className={s.bagHeading}>
        <div>
          <span className={s.eyebrow}>{t("YOUR BUSINESS PURCHASE")}</span>
          <h1>
            {t("Your bag")}<span>.</span>
          </h1>
          <p>{t("Review the essentials for your next project.")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {cart && cart.lines.length > 0 && (
            <span className={s.bagCount}>
              {cart.itemCount} {cart.itemCount === 1 ? t("item") : t("items")} {t("in your bag")}
            </span>
          )}
          <Link className={s.textLink} href="/b2b/products">
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> {t("Continue shopping")}
          </Link>
        </div>
      </header>

      {!state ? (
        <section className={s.bagEmpty} aria-busy={busy}>
          <h2>
            {error ? t("We couldn’t load your bag.") : t("Getting your bag ready…")}
          </h2>
          <p>
            {error
              ? t("Please try again to see your saved business purchase.")
              : t("Loading your business context and saved items.")}
          </p>
          {error && (
            <Button
              className={s.button}
              disabled={busy}
              onClick={() => void reload()}
            >
              {t("Try again")}
            </Button>
          )}
        </section>
      ) : !cart?.lines.length ? (
        <section className={s.bagEmpty}>
          <div style={{ fontSize: "36px", color: "#61665a", marginBottom: "12px" }}>
            <FontAwesomeIcon icon={faBagShopping} aria-hidden="true" />
          </div>
          <span className={s.eyebrow}>{t("ROOM FOR YOUR NEXT PROJECT")}</span>
          <h2>{t("Your essentials are waiting.")}</h2>
          <p>
            {state.context
              ? t("Your bag is empty. Find the right tools, materials and equipment for the work ahead.")
              : t("Choose your business and store to start building a bag for your team.")}
          </p>
          <Link
            className={s.primaryLink}
            href={state.context ? "/b2b/products" : "/b2b/account"}
          >
            {state.context ? t("Explore products") : t("Set up your business")}{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <>
          <div className={s.bagLayout}>
            <section aria-label="Items in your bag" className={s.bagItems}>
              <div className={s.bagSectionHeading}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <h2>{t("Your items")}</h2>
                  <span style={{ fontSize: "12px", color: "#64665d" }}>
                    ({cart.itemCount} {cart.itemCount === 1 ? t("item") : t("items")})
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span>PRICE IN {cart.total.currencyCode}</span>
                  <button
                    type="button"
                    className={s.bagClearBtn}
                    disabled={busy || clearing}
                    onClick={() => void clearBag()}
                  >
                    {clearing ? t("Clearing…") : t("Clear bag")}
                  </button>
                </div>
              </div>

              {cart.lines.map((line) => (
                <BagLine
                  key={`${cart.id}-${line.id}-${line.quantity}`}
                  line={line}
                />
              ))}

              <div className={s.bagContinue}>
                <Link className={s.textLink} href="/b2b/products">
                  ← {t("Continue shopping")}
                </Link>
                <span>{t("Saved to your business bag")}</span>
              </div>
            </section>

            <aside className={s.bagSummary} aria-labelledby="bag-summary-title">
              <span className={s.eyebrow}>{t("THE PURCHASE AT A GLANCE")}</span>
              <h2 id="bag-summary-title">{t("Order summary")}</h2>

              {state.context && (
                <div className={s.bagContext}>
                  <strong>{unit?.name || state.context.businessUnitKey}</strong>
                  <span>{store?.name || state.context.storeKey}</span>
                </div>
              )}

              <dl className={s.bagTotals}>
                <div>
                  <dt>{t("Subtotal")}</dt>
                  <dd>{cart.subtotal.formatted}</dd>
                </div>
                {cart.discountTotal.centAmount > 0 && (
                  <div style={{ color: "#2d613b" }}>
                    <dt>{t("Discounts")}</dt>
                    <dd>−{cart.discountTotal.formatted}</dd>
                  </div>
                )}
                {cart.taxTotal.centAmount > 0 && (
                  <div>
                    <dt>{t("Tax currently calculated")}</dt>
                    <dd>{cart.taxTotal.formatted}</dd>
                  </div>
                )}
                <div className={s.bagGrandTotal}>
                  <dt>
                    {t("Total")} <span>{cart.total.currencyCode}</span>
                  </dt>
                  <dd>{cart.total.formatted}</dd>
                </div>
              </dl>

              <p className={s.bagTaxNote}>
                {t("Shipping and final tax are calculated at checkout.")}
              </p>

              {state.context ? (
                <Link href="/checkout/b2b" className={s.bagCheckoutBtn}>
                  <span>{t("Proceed to checkout")}</span>
                  <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
                </Link>
              ) : (
                <div className={s.bagCheckoutNotice}>
                  <strong>{t("Store selection required")}</strong>
                  <p>
                    {t("Please sign in and select a store to proceed to checkout.")}
                  </p>
                  <Link href="/b2b/account" className={s.textLink} style={{ marginTop: "8px" }}>
                    {t("Select store →")}
                  </Link>
                </div>
              )}

              <p className={s.bagSavedNote}>
                {t("Each business and store has its own saved bag.")}
              </p>
            </aside>
          </div>

          {suggestedProducts.length > 0 && (
            <section className={s.bagSuggested} aria-label="Recommended equipment">
              <div className={s.sectionTitle}>
                <div>
                  <span className={s.eyebrow}>{t("POPULAR ADDITIONS")}</span>
                  <h2>{t("Recommended for your business")}</h2>
                </div>
                <Link className={s.textLink} href="/b2b/products">
                  {t("View full catalog →")}
                </Link>
              </div>
              <div className={s.categories} style={{ gridTemplateColumns: `repeat(${Math.min(4, suggestedProducts.length)}, 1fr)` }}>
                {suggestedProducts.map((p) => (
                  <B2BProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
