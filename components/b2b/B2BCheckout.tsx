"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faCircleCheck, faClock } from "@fortawesome/free-solid-svg-icons";
import Image from "@/components/commercetools-ui/atoms/image";
import { useToast } from "@/components/Toast";
import type { Cart } from "@/lib/types";
import type { B2BCheckout as Checkout, B2BOrderAddress, B2BOrderConfirmation as Confirmation } from "@/lib/b2b/order-types";
import { useB2B } from "./B2BProvider";
import { useB2BTranslations } from "./useB2BTranslations";
import s from "./B2B.module.css";
import c from "./B2BCheckout.module.css";

async function load<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load your order.");
  return result;
}

export function orderHref(order: { id: string; businessUnitKey: string }) {
  return `/b2b/orders/${encodeURIComponent(order.id)}?businessUnitKey=${encodeURIComponent(order.businessUnitKey)}`;
}

function addressLines(address: Omit<B2BOrderAddress, "id">) {
  return [
    address.company,
    address.name,
    address.street,
    [address.postalCode, address.city, address.region].filter(Boolean).join(" "),
    address.country,
  ].filter(Boolean);
}

function OrderLines({ cart }: { cart: Cart }) {
  const { t } = useB2BTranslations();
  return (
    <ul className={c.lines} aria-label={t("Items in this order")}>
      {cart.lines.map((line) => (
        <li key={line.id} className={c.line}>
          <Image src={line.image} alt={line.name} width={64} height={64} />
          <div>
            <strong>{line.name}</strong>
            <span>
              {t("SKU")} {line.sku} · {line.quantity} × {line.unitPrice.formatted}
            </span>
          </div>
          <b>{line.total.formatted}</b>
        </li>
      ))}
    </ul>
  );
}

function Totals({ cart, shipping }: { cart: Cart; shipping?: string }) {
  const { t } = useB2BTranslations();
  return (
    <dl className={s.bagTotals}>
      <div>
        <dt>{t("Subtotal")}</dt>
        <dd>{cart.subtotal.formatted}</dd>
      </div>
      {cart.discountTotal.centAmount > 0 && (
        <div>
          <dt>{t("Discounts")}</dt>
          <dd>−{cart.discountTotal.formatted}</dd>
        </div>
      )}
      {shipping && (
        <div>
          <dt>{t("Shipping")}</dt>
          <dd>{shipping}</dd>
        </div>
      )}
      {cart.taxTotal.centAmount > 0 && (
        <div>
          <dt>{t("Tax")}</dt>
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
  );
}

export function B2BCheckout() {
  const { reload } = useB2B();
  const { t } = useB2BTranslations();
  const router = useRouter();
  const showToast = useToast();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [loadError, setLoadError] = useState("");
  const [addressId, setAddressId] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoadError("");
    try {
      const { checkout: next } = await load<{ checkout: Checkout }>("/api/b2b/checkout");
      setCheckout(next);
      setAddressId((current) =>
        next.addresses.some((address) => address.id === current) ? current : next.defaultAddressId,
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your order.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    if (!checkout?.cart || placing) return;
    setPlacing(true);
    setError("");
    try {
      const response = await fetch("/api/b2b/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ purchaseOrderNumber, addressId, cartVersion: checkout.cart.version }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("The order could not be placed."));
      showToast(t("Order {number} placed.", { number: result.order.orderNumber }), "success");
      void reload(); // The ordered bag is closed; refresh the header bag count.
      router.push(orderHref(result.order));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("The order could not be placed."));
      setPlacing(false);
      void refresh(); // A failed attempt may still have changed the bag version.
    }
  }

  const cart = checkout?.cart;
  return (
    <main className={`${s.main} ${s.bagMain}`}>
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <Link href="/b2b">{t("Home")}</Link>
        <span aria-hidden="true">/</span>
        <Link href="/b2b/cart">{t("Purchasing bag")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("Checkout")}</span>
      </nav>
      <header className={s.bagHeading}>
        <div>
          <span className={s.eyebrow}>{t("YOUR BUSINESS PURCHASE")}</span>
          <h1>
            {t("Checkout")}
            <span>.</span>
          </h1>
          <p>{t("Choose the delivery address, add your purchase order number and place the order.")}</p>
        </div>
        <Link className={s.textLink} href="/b2b/cart">
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> {t("Back to bag")}
        </Link>
      </header>

      {loadError ? (
        <section className={s.bagEmpty}>
          <h2>{t("We couldn’t load your order.")}</h2>
          <p role="alert">{loadError}</p>
          <button type="button" className={s.button} onClick={() => void refresh()}>
            {t("Try again")}
          </button>
        </section>
      ) : !checkout ? (
        <section className={s.bagEmpty} aria-busy="true">
          <h2>{t("Getting your order ready…")}</h2>
        </section>
      ) : !cart ? (
        <section className={s.bagEmpty}>
          <h2>{t("Your bag is empty.")}</h2>
          <p>{t("Add products to your bag before checking out.")}</p>
          <Link className={s.primaryLink} href="/b2b/products">
            {t("Explore products")} <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <form className={s.bagLayout} onSubmit={(event) => void placeOrder(event)}>
          <div className={c.steps}>
            <fieldset className={c.step}>
              <legend>{t("1. Delivery address")}</legend>
              {checkout.addresses.length ? (
                <div className={c.addresses}>
                  {checkout.addresses.map((address) => (
                    <label key={address.id} className={c.address} data-selected={address.id === addressId}>
                      <input
                        type="radio"
                        name="addressId"
                        value={address.id}
                        checked={address.id === addressId}
                        onChange={() => setAddressId(address.id)}
                      />
                      <span>
                        {addressLines(address).map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className={c.notice}>
                  {t("Your company has no delivery address yet.")}{" "}
                  <Link className={s.textLink} href="/b2b/account/company">
                    {t("Add a company address")}
                  </Link>
                </p>
              )}
            </fieldset>

            <fieldset className={c.step}>
              <legend>{t("2. Purchase order")}</legend>
              <label className={c.field}>
                <span>{t("Purchase order number")}</span>
                <input
                  name="purchaseOrderNumber"
                  value={purchaseOrderNumber}
                  onChange={(event) => setPurchaseOrderNumber(event.target.value)}
                  maxLength={50}
                  required
                  autoComplete="off"
                  placeholder="PO-2026-001"
                />
              </label>
              <p className={c.hint}>{t("Your finance team uses this number to match the invoice.")}</p>
            </fieldset>

            <fieldset className={c.step}>
              <legend>{t("3. Review items")}</legend>
              <OrderLines cart={cart} />
            </fieldset>
          </div>

          <aside className={s.bagSummary} aria-labelledby="checkout-summary-title">
            <span className={s.eyebrow}>{t("THE PURCHASE AT A GLANCE")}</span>
            <h2 id="checkout-summary-title">{t("Order summary")}</h2>
            <div className={s.bagContext}>
              <strong>{checkout.businessUnit.name}</strong>
              <span>{checkout.store.name}</span>
            </div>
            <Totals cart={cart} />
            <p className={s.bagTaxNote}>
              {t("Orders above your company’s approval limits wait for an approver before they are processed.")}
            </p>
            {error && (
              <p className={c.error} role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className={s.bagCheckoutBtn}
              disabled={placing || !addressId || !purchaseOrderNumber.trim()}
            >
              <span>{placing ? t("Placing order…") : t("Place order")}</span>
              <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
            </button>
          </aside>
        </form>
      )}
    </main>
  );
}

export function B2BOrderConfirmationView({ order }: { order: Confirmation }) {
  const { t, locale } = useB2BTranslations();
  const pending = order.approval?.status === "Pending";
  const rejected = order.approval?.status === "Rejected";
  const created = new Date(order.createdAt);
  return (
    <>
      <section className={c.status} data-state={pending ? "pending" : rejected ? "rejected" : "placed"}>
        <FontAwesomeIcon icon={pending ? faClock : faCircleCheck} aria-hidden="true" />
        <div>
          <h2>
            {pending
              ? t("Your order is waiting for approval")
              : rejected
                ? t("Your order was rejected")
                : t("Thank you, your order has been placed")}
          </h2>
          <p>
            {pending
              ? t("It matches an approval rule of your company. It will be processed once the approvers sign off.")
              : rejected
                ? t("An approver rejected this order. Check the approval details for the reason.")
                : t("We have received your order and will start processing it.")}
          </p>
          {order.approval && (
            <Link
              className={s.textLink}
              href={`/b2b/account/approval-flows/${encodeURIComponent(order.approval.id)}?businessUnitKey=${encodeURIComponent(order.businessUnit.key)}`}
            >
              {t("View approval details →")}
            </Link>
          )}
        </div>
      </section>

      <div className={s.bagLayout}>
        <div className={c.steps}>
          <dl className={c.facts}>
            <div>
              <dt>{t("Order number")}</dt>
              <dd>{order.orderNumber}</dd>
            </div>
            <div>
              <dt>{t("Purchase order number")}</dt>
              <dd>{order.purchaseOrderNumber || "—"}</dd>
            </div>
            <div>
              <dt>{t("Placed on")}</dt>
              <dd>
                {Number.isNaN(created.getTime())
                  ? "—"
                  : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(created)}
              </dd>
            </div>
            <div>
              <dt>{t("Company")}</dt>
              <dd>{order.businessUnit.name}</dd>
            </div>
            {order.shippingAddress && (
              <div>
                <dt>{t("Delivery address")}</dt>
                <dd>
                  {addressLines(order.shippingAddress).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </dd>
              </div>
            )}
            {order.shippingMethod && (
              <div>
                <dt>{t("Shipping method")}</dt>
                <dd>{order.shippingMethod}</dd>
              </div>
            )}
          </dl>
          <section className={c.step}>
            <h3>{t("Items")}</h3>
            <OrderLines cart={order.order} />
          </section>
        </div>
        <aside className={s.bagSummary} aria-labelledby="order-summary-title">
          <span className={s.eyebrow}>{t("ORDER TOTAL")}</span>
          <h2 id="order-summary-title">{t("Order summary")}</h2>
          <Totals cart={order.order} shipping={order.shippingPrice?.formatted} />
          <Link className={s.bagCheckoutBtn} href="/b2b/products">
            <span>{t("Continue shopping")}</span>
            <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </>
  );
}

export function B2BOrderConfirmation({ id, businessUnitKey = "" }: { id: string; businessUnitKey?: string }) {
  const { t } = useB2BTranslations();
  const [order, setOrder] = useState<Confirmation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    load<{ order: Confirmation }>(
      `/api/b2b/orders/${encodeURIComponent(id)}?businessUnitKey=${encodeURIComponent(businessUnitKey)}`,
    )
      .then((result) => active && setOrder(result.order))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not load your order."));
    return () => {
      active = false;
    };
  }, [id, businessUnitKey]);

  return (
    <main className={`${s.main} ${s.bagMain}`}>
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <Link href="/b2b">{t("Home")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("Order confirmation")}</span>
      </nav>
      <header className={s.bagHeading}>
        <div>
          <span className={s.eyebrow}>{t("ORDER CONFIRMATION")}</span>
          <h1>
            {order ? order.orderNumber : t("Your order")}
            <span>.</span>
          </h1>
        </div>
      </header>
      {error ? (
        <section className={s.bagEmpty}>
          <h2>{t("We couldn’t load your order.")}</h2>
          <p role="alert">{error}</p>
        </section>
      ) : !order ? (
        <section className={s.bagEmpty} aria-busy="true">
          <h2>{t("Loading your order…")}</h2>
        </section>
      ) : (
        <B2BOrderConfirmationView order={order} />
      )}
    </main>
  );
}
