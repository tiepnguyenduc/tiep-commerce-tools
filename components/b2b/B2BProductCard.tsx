"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import Image from "@/components/commercetools-ui/atoms/image";
import { useToast } from "@/components/Toast";
import type { B2BProduct } from "@/lib/b2b/types";
import { useB2B } from "./B2BProvider";
import { B2BCompareButton } from "./B2BCompare";
import { B2BSaveButton } from "./B2BWishlist";
import { useB2BTranslations } from "./useB2BTranslations";
import { useB2BMiniCart } from "./B2BMiniCart";
import s from "./B2B.module.css";

function CatalogCartButton({
  productId,
  productName,
  variantId,
  hasPrice,
}: {
  productId: string;
  productName: string;
  variantId?: number;
  hasPrice: boolean;
}) {
  const { state, busy, act } = useB2B();
  const { openCart } = useB2BMiniCart();
  const { t } = useB2BTranslations();
  const showToast = useToast();
  const [status, setStatus] = useState<"idle" | "pending" | "added">("idle");
  const unavailable = !state?.context || !hasPrice || variantId === undefined;
  const label = !state?.context
    ? t("Select a store to add this product to your business bag")
    : !hasPrice || variantId === undefined
      ? t("Price unavailable; this product cannot be added to the bag")
      : status === "pending"
        ? t("Adding {name} to your bag", { name: productName })
        : status === "added"
          ? t("{name} added to your bag", { name: productName })
          : t("Add {name} to your business bag", { name: productName });

  return (
    <button
      type="button"
      className={s.productCartAction}
      aria-label={label}
      title={label}
      disabled={unavailable || busy || status === "pending"}
      data-state={status}
      onClick={async () => {
        if (unavailable || variantId === undefined) return;
        setStatus("pending");
        const success = await act({
          action: "add-to-cart",
          productId,
          variantId,
          quantity: 1,
        });
        setStatus(success ? "added" : "idle");
        showToast(
          success
            ? `${productName} ${t("added to your bag.")}`
            : t(
                "The result could not be confirmed. Check your bag before trying again.",
              ),
          success ? "success" : "error",
        );
        if (success) openCart();
      }}
    >
      {status === "added" ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <ShoppingBagIcon aria-hidden="true" />
      )}
      <span>
        {status === "pending"
          ? t("Adding…")
          : status === "added"
            ? t("Added to bag")
            : t("Add to business bag")}
      </span>
    </button>
  );
}

/** Assortment tile: image, quick compare/save/add-to-bag actions, name and contract price. */
export function B2BProductCard({ product: p }: { product: B2BProduct }) {
  const { t } = useB2BTranslations();
  const { state } = useB2B();
  return (
    <article className={s.product}>
      <div className={s.productMedia}>
        <Link
          href={`/b2b/products/${encodeURIComponent(p.id)}`}
          className={s.productImage}
        >
          <Image
            src={p.image}
            alt={p.name}
            fill
            sizes="(max-width: 700px) 45vw, (max-width: 1000px) 30vw, 22vw"
          />
        </Link>
        <div className={s.productActions}>
          <B2BCompareButton compact productId={p.id} />
          <B2BSaveButton
            compact
            productId={p.id}
            variantId={p.variants[0]?.id}
          />
        </div>
        <CatalogCartButton
          productId={p.id}
          productName={p.name}
          variantId={p.variants[0]?.id}
          hasPrice={Boolean(p.variants[0]?.price)}
        />
      </div>
      <p className={s.productCategory}>{p.category}</p>
      <h3>
        <Link href={`/b2b/products/${encodeURIComponent(p.id)}`}>{p.name}</Link>
      </h3>
      <div className={s.price}>
        {p.price?.formatted ??
          (state?.context
            ? t("Price unavailable")
            : t("Sign in & select a store for pricing"))}
      </div>
    </article>
  );
}
