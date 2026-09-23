"use client";
import styles from "./StorefrontCatalog.module.css";

import UIButton from "@/components/commercetools-ui/atoms/button";
import Gallery from "@/components/commercetools-ui/organisms/gallery";
import ProductTabs from "@/components/commercetools-ui/organisms/product/product-tabs";
import SpecificationTable from "@/components/commercetools-ui/organisms/product/product-tabs/components/specification-table";
import QuantitySelector from "@/components/commercetools-ui/atoms/quantity-selector";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AddToCart } from "@/components/AddToCart";
import { AddToWishlist } from "@/components/AddToWishlist";
import { AddToCompare } from "@/components/ProductCompare";
import { productToCompareProduct } from "@/components/ProductCompareData";
import { ProductItemSlider } from "@/components/ProductItemSlider";
import {
  ProductRatingSnippet,
  ProductReviewsProvider,
  ProductReviewsSection,
  useProductReviewCount,
} from "@/components/ProductReviews";
import { productsToProductItems } from "@/components/ProductItemData";
import { ProductStickyBar } from "@/components/ProductStickyBar";
import type {
  Product,
  ProductRatingSummary,
  ProductReviewPage,
  ProductSpecification,
  ProductVariant,
} from "@/lib/types";

type OptionGroup = {
  name: string;
  label: string;
  values: string[];
};

function fallbackVariant(product: Product): ProductVariant {
  return {
    id: 1,
    sku: product.sku,
    key: product.sku,
    image: product.image,
    images: product.images?.length ? product.images : [product.image],
    price: product.price,
    originalPrice: product.originalPrice,
    attributes: product.specifications ?? [],
    specifications:
      product.specifications?.length
        ? product.specifications
        : [
            { name: "category", label: "Category", value: product.category },
            { name: "color", label: "Color", value: product.color },
          ],
  };
}

function dedupeValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function optionGroupsFor(variants: ProductVariant[]): OptionGroup[] {
  const attributesByName = new Map<string, ProductSpecification[]>();

  for (const variant of variants) {
    for (const attribute of variant.attributes) {
      const list = attributesByName.get(attribute.name) ?? [];
      list.push(attribute);
      attributesByName.set(attribute.name, list);
    }
  }

  return Array.from(attributesByName.entries())
    .map(([name, attributes]) => ({
      name,
      label: attributes[0]?.label ?? name,
      values: dedupeValues(attributes.map((attribute) => attribute.value)),
    }))
    .filter(
      (group) =>
        group.values.length > 1 &&
        group.values.length <= 12 &&
        group.values.every((value) => value.length <= 36) &&
        !/(code|specification|description|arrival|sku)/i.test(group.label),
    );
}

function selectedAttributeValue(variant: ProductVariant, name: string) {
  return variant.attributes.find((attribute) => attribute.name === name)?.value ?? "";
}

function variantLabel(variant: ProductVariant) {
  return variant.key || variant.sku || `Variant ${variant.id}`;
}

function variantColor(variant: ProductVariant) {
  return (
    variant.attributes.find((attribute) =>
      /color label|search color/i.test(attribute.label),
    )?.value ?? ""
  );
}

function colorValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function specificationRows(product: Product, variant: ProductVariant) {
  const rows: ProductSpecification[] = [
    { name: "sku", label: "SKU", value: variant.sku || product.sku },
    { name: "variant-id", label: "Variant ID", value: String(variant.id) },
    { name: "variant-key", label: "Variant Key", value: variant.key ?? "" },
    ...(variant.specifications.length
      ? variant.specifications
      : product.specifications ?? []),
  ];
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = `${row.label}:${row.value}`;
    if (!row.value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const TABS = { description: "description", specifications: "specifications", reviews: "reviews" } as const;

type TabId = (typeof TABS)[keyof typeof TABS];

function DetailTabs({
  description,
  specifications,
  activeTab,
  onTabChange,
}: {
  description: string;
  specifications: ProductSpecification[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const reviewCount = useProductReviewCount();

  return (
    <ProductTabs
      activeId={activeTab}
      onChange={(id) => onTabChange(id as TabId)}
      tabs={[
        {
          id: TABS.description,
          label: "Description",
          content: (
            <p className="m-0 max-w-[860px] whitespace-pre-line text-15 leading-loose text-gray-600">
              {description}
            </p>
          ),
        },
        {
          id: TABS.specifications,
          label: "Specifications",
          content: <SpecificationTable specifications={specifications} />,
        },
        {
          id: TABS.reviews,
          label: "Reviews",
          count: reviewCount,
          content: <ProductReviewsSection embedded />,
        },
      ]}
    />
  );
}

export function ProductDetail({
  product,
  relatedProducts = [],
  initialReviews = null,
  reviewsError,
  ratingSummary = null,
}: {
  product: Product;
  relatedProducts?: Product[];
  initialReviews?: ProductReviewPage | null;
  reviewsError?: string;
  ratingSummary?: ProductRatingSummary | null;
}) {
  const variants = useMemo(
    () => (product.variants?.length ? product.variants : [fallbackVariant(product)]),
    [product],
  );
  const [variantId, setVariantId] = useState(variants[0]?.id ?? 1);
  const selectedVariant =
    variants.find((variant) => variant.id === variantId) ?? variants[0];
  const gallery = selectedVariant.images.length
    ? selectedVariant.images
    : product.images?.length
      ? product.images
      : [product.image];
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>(TABS.description);
  const optionGroups = useMemo(() => optionGroupsFor(variants), [variants]);
  const relatedItems = useMemo(
    () => productsToProductItems(relatedProducts),
    [relatedProducts],
  );
  const specs = specificationRows(product, selectedVariant);
  const tabsRef = useRef<HTMLDivElement>(null);
  const variantSummary =
    optionGroups
      .map((group) => selectedAttributeValue(selectedVariant, group.name))
      .filter(Boolean)
      .join(" · ") || (variants.length > 1 ? variantLabel(selectedVariant) : "");
  const stickyMeta = [variantSummary, selectedVariant.sku ? `SKU ${selectedVariant.sku}` : ""]
    .filter(Boolean)
    .join(" · ");

  /** Opens a tab and scrolls it clear of the sticky header and the sticky bar. */
  function jumpToSection(section: TabId) {
    setActiveTab(section);

    const target = tabsRef.current;
    if (!target) return;

    // The buy bar sits at the bottom, so only the sticky header can hide the section.
    const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - header - 24,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  function selectVariantOption(name: string, value: string) {
    const nextSelections = new Map(
      optionGroups.map((group) => [
        group.name,
        group.name === name
          ? value
          : selectedAttributeValue(selectedVariant, group.name),
      ]),
    );
    const nextVariant =
      variants.find((variant) =>
        Array.from(nextSelections).every(
          ([attributeName, selectedValue]) =>
            !selectedValue ||
            selectedAttributeValue(variant, attributeName) === selectedValue,
        ),
      ) ??
      variants.find(
        (variant) => selectedAttributeValue(variant, name) === value,
      ) ??
      selectedVariant;
    setVariantId(nextVariant.id);
  }

  function variantCards() {
    if (variants.length <= 1) return null;

    return (
      <fieldset className="variant-card-fieldset">
        <legend>Choose a variant</legend>
        <div className="variant-card-list">
          {variants.map((variant) => {
            const selected = variant.id === selectedVariant.id;
            const color = variantColor(variant);
            return (
              <UIButton variant={selected ? "primary" : "secondary"} size="xs"
                aria-pressed={selected}
                className={`${styles.variantCard} ${selected ? "selected" : ""}`}
                key={variant.id}
                onClick={() => setVariantId(variant.id)}
                type="button"
              >
                <span className="variant-card-media">
                  <img src={variant.image} alt="" />
                  {color ? (
                    <span
                      aria-hidden="true"
                      className="variant-card-swatch"
                      style={{ backgroundColor: colorValue(color) }}
                    />
                  ) : null}
                </span>
                <span className="variant-card-copy">
                  <strong>{variantLabel(variant)}</strong>
                  <small>SKU {variant.sku}</small>
                  {color ? <small>{color}</small> : null}
                </span>
                <span className="variant-card-meta">
                  <em>
                    {variant.originalPrice ? (
                      <s className="price-was">
                        {variant.originalPrice.formatted}
                      </s>
                    ) : null}
                    {variant.price.formatted}
                  </em>
                  <small>{selected ? "Selected" : "Select"}</small>
                </span>
              </UIButton>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <ProductReviewsProvider
      key={product.id}
      productId={product.id}
      productName={product.name}
      initialReviews={initialReviews}
      initialSummary={ratingSummary}
      initialError={reviewsError}
      onRevealReviews={() => setActiveTab(TABS.reviews)}
    >
      <main className={`shell detail product-detail ${styles.detail}`}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">All products</Link><span>/</span><span aria-current="page">{product.name}</span></nav>
        <section className="product-gallery" aria-label={`${product.name} gallery`}>
          {product.brand ? (
            <Link
              className="product-brand-badge"
              href={`/shop-by-brand?brand=${encodeURIComponent(product.brand)}`}
            >
              <span>Brand</span>
              <strong>{product.brand}</strong>
            </Link>
          ) : null}
          <Gallery
            images={gallery}
            productName={product.name}
            imageSuffix=""
            thumbnailSuffix=""
          />
        </section>

        <section className="product-detail-info">
          <span className="eyebrow">{product.category} collection</span>
          <h1>{product.name}</h1>
          <ProductRatingSnippet className="product-review-snippet" />
          <p className="product-summary">{product.description.length > 240 ? `${product.description.slice(0, 237).replace(/\s+\S*$/, "")}…` : product.description}</p>
          <div className="product-price-block">
            <p className={selectedVariant.originalPrice ? "price on-sale" : "price"}>
              {selectedVariant.originalPrice ? (
                <span className="price-was">
                  {selectedVariant.originalPrice.formatted}
                </span>
              ) : null}
              <span className="price-now">{selectedVariant.price.formatted}</span>
            </p>
            <span>In stock and ready to ship</span>
          </div>

          {optionGroups.length ? (
            <div className="variant-options">
              {variantCards()}
              {optionGroups.map((group) => (
                <fieldset key={group.name}>
                  <legend>{group.label}</legend>
                  <div className="variant-option-list">
                    {group.values.map((value) => {
                      const selected =
                        selectedAttributeValue(selectedVariant, group.name) === value;
                      return (
                        <UIButton variant={selected ? "primary" : "secondary"} size="s"
                          aria-pressed={selected}
                          className={`gap-8 ${selected ? "selected" : ""}`}
                          key={value}
                          onClick={() => selectVariantOption(group.name, value)}
                          type="button"
                        >
                          {/(color|colour)/i.test(group.label) ? (
                            <span
                              aria-hidden="true"
                              className="color-swatch"
                              style={{ backgroundColor: colorValue(value) }}
                            />
                          ) : null}
                          <span>{value}</span>
                        </UIButton>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : variants.length > 1 ? (
            <div className="variant-options">
              {variantCards()}
            </div>
          ) : null}

          <div className="quantity-control">
            <span>Quantity</span>
            <QuantitySelector value={quantity} minValue={1} maxValue={99} onChange={setQuantity} />
          </div>

          <div className="product-actions">
            <AddToCart
              productId={product.id}
              quantity={quantity}
              sku={selectedVariant.sku}
            />
            <AddToWishlist productId={product.id} variantId={selectedVariant.id} />
            <AddToCompare product={productToCompareProduct(product)} />
          </div>

          <div className="shipping-panel">
            <strong>Shipping methods</strong>
            <dl>
              <div>
                <dt>Standard delivery</dt>
                <dd>3-5 business days</dd>
              </div>
              <div>
                <dt>Express delivery</dt>
                <dd>1-2 business days</dd>
              </div>
            </dl>
            <p>Available methods and shipping costs are calculated at checkout.</p>
          </div>
        </section>

        <div ref={tabsRef}>
          <DetailTabs
            description={product.description}
            specifications={specs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        {relatedItems.length ? (
          <ProductItemSlider
            className="panel product-related"
            eyebrow="Selected for this room"
            products={relatedItems}
            renderAction={(item) => (
              <AddToCart compact productId={item.id} sku={item.sku} />
            )}
            title="Related products"
          />
        ) : null}
      </main>

      {/* Outside the article: a fixed overlay should not inherit the detail layout. */}
      <ProductStickyBar
        product={product}
        variant={selectedVariant}
        meta={stickyMeta}
        quantity={quantity}
        onQuantityChange={setQuantity}
        activeSection={activeTab}
        onSelectSection={jumpToSection}
      />
    </ProductReviewsProvider>
  );
}
