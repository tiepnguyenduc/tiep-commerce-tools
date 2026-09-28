"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
export function B2BProductDetail({ id }: { id: string }) {
  const { state, busy, act } = useB2B();
  const [variantId, setVariantId] = useState<number>();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    setAdded(false);
  }, [state?.context?.storeKey, state?.context?.businessUnitKey]);
  const p = state?.products.find((p) => p.id === id);
  if (!state)
    return (
      <main className={s.main}>
        <p className={s.empty}>Loading product…</p>
      </main>
    );
  if (!p)
    return (
      <main className={s.main}>
        <div className={s.empty}>
          <h1>Product unavailable</h1>
          <p>This product is not available in the current assortment.</p>
          <Link href="/b2b/products">Explore the catalog →</Link>
        </div>
      </main>
    );
  const variant = p.variants.find((v) => v.id === variantId) ?? p.variants[0];
  return (
    <main className={s.main}>
      <div className={s.breadcrumb}>
        <Link href="/b2b">Business</Link> /{" "}
        <Link href="/b2b/products">Products</Link> / {p.name}
      </div>
      <section className={s.detail}>
        <div className={s.detailImage}>
          <Image
            src={variant?.image || p.image}
            alt={p.name}
            width={900}
            height={900}
            priority
          />
        </div>
        <div className={s.detailInfo}>
          <span className={s.eyebrow}>{p.category}</span>
          <h1>{p.name}</h1>

          <div className={s.detailPrice}>
            {variant?.price?.formatted ??
              (state.context
                ? "Price unavailable"
                : "Select a store for pricing")}
          </div>
          {state.context && (
            <p className={s.priceCaption}>
              Pricing for {state.context.storeKey} · {state.context.currency}
            </p>
          )}
          {p.variants.length > 1 && (
            <label className={s.field}>
              Product option
              <select
                value={variant?.id}
                onChange={(e) => {
                  setVariantId(Number(e.target.value));
                  setAdded(false);
                }}
              >
                {p.variants.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.sku || `Option ${v.id}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className={s.productCategory}>SKU · {variant?.sku}</p>
          <form
            className={s.form}
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                variant &&
                (await act({
                  action: "add-to-cart",
                  productId: p.id,
                  variantId: variant.id,
                  quantity,
                }))
              )
                setAdded(true);
            }}
          >
            <label className={s.field}>
              Quantity
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  setAdded(false);
                }}
                required
              />
            </label>
            <Button
              className={s.button}
              loading={busy}
              disabled={
                !state.context ||
                !variant?.price ||
                !Number.isInteger(quantity) ||
                quantity < 1
              }
            >
              Add to business bag
            </Button>
          </form>
          {added && (
            <p role="status" className={s.success}>
              Added to your bag. <Link href="/b2b/cart">View bag →</Link>
            </p>
          )}
          {!state.context && (
            <p>
              <Link href="/b2b/account" className={s.textLink}>
                Sign in and select a business store →
              </Link>
            </p>
          )}
          {state.context && !variant?.price && (
            <p>No price is available for this option in your selected store.</p>
          )}
          <details>
            <summary>Product description</summary>
            <p>{p.description.replace(/<[^>]+>/g, "")}</p>
          </details>
          <div className={s.detailNote}>
            <strong>Made for your business</strong>
            <p>
              Your selection uses your business unit’s assigned store and
              pricing.
            </p>
          </div>
          {variant?.attributes.length > 0 && (
            <details>
              <summary>Product specifications</summary>
              <dl className={s.specs}>
                {variant.attributes.map((a) => (
                  <div key={a.name}>
                    <dt>{a.name}</dt>
                    <dd>{a.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}
