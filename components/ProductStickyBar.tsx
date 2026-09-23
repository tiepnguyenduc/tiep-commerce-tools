"use client";

import Button from "@/components/commercetools-ui/atoms/button";
import QuantitySelector from "@/components/commercetools-ui/atoms/quantity-selector";
import { useEffect, useRef, type RefObject } from "react";
import { AddToCart } from "@/components/AddToCart";
import { AddToWishlist } from "@/components/AddToWishlist";
import { useProductReviewCount } from "@/components/ProductReviews";
import styles from "./ProductStickyBar.module.css";
import type { Product, ProductVariant } from "@/lib/types";

export type ProductSection = "description" | "specifications" | "reviews";

const SECTIONS: { id: ProductSection; label: string }[] = [
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
  { id: "reviews", label: "Reviews" },
];

/**
 * Publishes the bar's height so the document can reserve the strip it covers at the
 * bottom of the viewport. Nothing the shopper needs ever ends up behind the bar.
 */
function useReservedSpace(barRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const publish = () =>
      document.documentElement.style.setProperty("--product-sticky-bar", `${Math.round(bar.offsetHeight)}px`);

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--product-sticky-bar");
    };
  }, [barRef]);
}

/**
 * Always-on purchase bar docked to the bottom of the viewport: same variant, same
 * quantity and the same actions as the buy box, in reach wherever the shopper is.
 */
export function ProductStickyBar({
  product,
  variant,
  meta,
  quantity,
  onQuantityChange,
  activeSection,
  onSelectSection,
}: {
  product: Product;
  variant: ProductVariant;
  meta?: string;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  activeSection?: ProductSection;
  onSelectSection?: (section: ProductSection) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const reviewCount = useProductReviewCount();

  useReservedSpace(barRef);

  const price = variant.price;
  const wasPrice = variant.originalPrice;

  return (
    <div
      ref={barRef}
      className={styles.bar}
      data-sticky-bar=""
      role="region"
      aria-label={`Buy ${product.name}`}
    >
      <div className={`shell ${styles.inner}`}>
        <div className={styles.identity}>
          <img className={styles.thumb} src={variant.image || product.image} alt="" width={56} height={56} />
          <span className={styles.copy}>
            <strong>{product.name}</strong>
            {meta ? <small>{meta}</small> : null}
          </span>
        </div>

        {onSelectSection ? (
          <nav className={styles.sections} aria-label="Product details">
            {SECTIONS.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="fit"
                type="button"
                className={styles.sectionLink}
                data-current={activeSection === section.id || undefined}
                onClick={() => onSelectSection(section.id)}
              >
                <span>
                  {section.label}
                  {section.id === "reviews" && reviewCount ? ` (${reviewCount})` : ""}
                </span>
              </Button>
            ))}
          </nav>
        ) : null}

        <div className={styles.purchase}>
          <p className={wasPrice ? `${styles.price} ${styles.onSale}` : styles.price}>
            {wasPrice ? <s>{wasPrice.formatted}</s> : null}
            <span>{price.formatted}</span>
          </p>
          <div className={styles.quantity}>
            <span className={styles.quantityLabel}>Qty</span>
            <QuantitySelector value={quantity} minValue={1} maxValue={99} onChange={onQuantityChange} />
          </div>
          <AddToCart productId={product.id} quantity={quantity} sku={variant.sku} />
          <AddToWishlist productId={product.id} variantId={variant.id} />
        </div>
      </div>
    </div>
  );
}
