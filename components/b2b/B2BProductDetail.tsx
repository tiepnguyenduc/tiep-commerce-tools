"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckIcon, ShoppingBagIcon, TruckIcon } from "@heroicons/react/24/outline";
import Button from "@/components/commercetools-ui/atoms/button";
import QuantitySelector from "@/components/commercetools-ui/atoms/quantity-selector";
import Gallery from "@/components/commercetools-ui/organisms/gallery";
import ProductTabs from "@/components/commercetools-ui/organisms/product/product-tabs";
import SpecificationTable from "@/components/commercetools-ui/organisms/product/product-tabs/components/specification-table";
import {
  ProductRatingSnippet,
  ProductReviewsProvider,
  ProductReviewsSection,
  useProductReviewCount,
} from "@/components/ProductReviews";
import { useReservedSpace } from "@/components/ProductStickyBar";
import stickyStyles from "@/components/ProductStickyBar.module.css";
import { useToast } from "@/components/Toast";
import { businessCatalogUrl } from "@/lib/b2b/catalog-navigation";
import {
  B2B_RECENTLY_VIEWED_KEY,
  parseRecentlyViewed,
  pushRecentlyViewed,
  relatedBusinessProducts,
  resolveRecentlyViewed,
} from "@/lib/b2b/recently-viewed";
import type { B2BProduct, B2BProductVariant } from "@/lib/b2b/types";
import type { ProductRatingSummary, ProductReviewPage, ProductSpecification } from "@/lib/types";
import {
  colorValue,
  isColorGroup,
  optionGroupsFor,
  selectedAttributeValue,
  variantColor,
  variantForOption,
  type OptionGroup,
} from "@/lib/variant-options";
import { useB2B } from "./B2BProvider";
import { B2BCompareButton } from "./B2BCompare";
import { B2BProductCard } from "./B2BProductCard";
import { B2BSaveButton } from "./B2BWishlist";
import { useB2BTranslations } from "./useB2BTranslations";
import { useB2BMiniCart } from "./B2BMiniCart";
import s from "./B2B.module.css";
import d from "./B2BProductDetail.module.css";

type Translate = ReturnType<typeof useB2BTranslations>["t"];

/** The API accepts up to 10,000 per line; the page keeps a sane ceiling for one click. */
const MAX_QUANTITY = 999;
const TABS = { description: "description", specifications: "specifications", reviews: "reviews" } as const;
type TabId = (typeof TABS)[keyof typeof TABS];

function plainText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").trim();
}

function summaryOf(text: string) {
  return text.length > 240 ? `${text.slice(0, 237).replace(/\s+\S*$/, "")}…` : text;
}

function variantImages(product: B2BProduct, variant: B2BProductVariant) {
  if (variant.images?.length) return variant.images;
  if (variant.image) return [variant.image];
  return product.images.length ? product.images : [product.image].filter(Boolean);
}

function brandOf(variant: B2BProductVariant) {
  return variant.attributes.find((attribute) => /^brand(name)?$/i.test(attribute.name))?.value ?? "";
}

function specificationRows(product: B2BProduct, variant: B2BProductVariant, t: Translate) {
  const rows: ProductSpecification[] = [
    { name: "sku", label: t("SKU"), value: variant.sku },
    { name: "category", label: t("Category"), value: product.category },
    ...variant.attributes.map((attribute) => ({
      name: attribute.name,
      label: attribute.label ?? attribute.name,
      value: attribute.value,
    })),
  ];
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.label}:${row.value}`;
    if (!row.value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Adds a variant to the business bag, with toast feedback shared by the buy box and sticky bar. */
function useAddToBag(product: B2BProduct) {
  const { act } = useB2B();
  const { openCart } = useB2BMiniCart();
  const { t } = useB2BTranslations();
  const showToast = useToast();
  const [status, setStatus] = useState<"idle" | "pending" | "added">("idle");
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(reset.current), []);

  async function add(variantId: number, quantity: number) {
    if (status === "pending") return false;
    clearTimeout(reset.current);
    setStatus("pending");
    const success = await act({ action: "add-to-cart", productId: product.id, variantId, quantity });
    setStatus(success ? "added" : "idle");
    showToast(
      success
        ? `${product.name} ${t("added to your bag.")}`
        : t("The result could not be confirmed. Check your bag before trying again."),
      success ? "success" : "error",
    );
    if (success) {
      openCart();
      reset.current = setTimeout(() => setStatus("idle"), 2500);
    }
    return success;
  }

  return { status, setStatus, add };
}

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
  const { t } = useB2BTranslations();
  const reviewCount = useProductReviewCount();
  return (
    <ProductTabs
      className={d.tabs}
      activeId={activeTab}
      onChange={(id) => onTabChange(id as TabId)}
      tabs={[
        {
          id: TABS.description,
          label: t("Description"),
          content: (
            <p className={d.description}>
              {description || t("No description is available for this product.")}
            </p>
          ),
        },
        {
          id: TABS.specifications,
          label: t("Specifications"),
          content: <SpecificationTable specifications={specifications} />,
        },
        {
          id: TABS.reviews,
          label: t("Reviews"),
          count: reviewCount,
          content: <ProductReviewsSection embedded />,
        },
      ]}
    />
  );
}

function VariantPicker({
  variants,
  selected,
  groups,
  onSelect,
}: {
  variants: B2BProductVariant[];
  selected: B2BProductVariant;
  groups: OptionGroup[];
  onSelect: (variant: B2BProductVariant) => void;
}) {
  const { t } = useB2BTranslations();
  if (variants.length <= 1) return null;
  return (
    <div className={d.variants}>
      <fieldset>
        <legend>{t("Choose a variant")}</legend>
        <div className={d.variantCards}>
          {variants.map((variant) => {
            const active = variant.id === selected.id;
            const color = variantColor(variant);
            return (
              <button
                type="button"
                key={variant.id}
                className={d.variantCard}
                aria-pressed={active}
                onClick={() => onSelect(variant)}
              >
                <span className={d.variantMedia}>
                  {variant.image ? <img src={variant.image} alt="" /> : null}
                  {color ? (
                    <span aria-hidden="true" className={d.swatch} style={{ backgroundColor: colorValue(color) }} />
                  ) : null}
                </span>
                <span className={d.variantCopy}>
                  <strong>{variant.sku || t("Option {id}", { id: variant.id })}</strong>
                  {color ? <small>{color}</small> : null}
                  <small>
                    {variant.originalPrice ? <s>{variant.originalPrice.formatted}</s> : null}{" "}
                    {variant.price?.formatted ?? t("Price unavailable")}
                  </small>
                </span>
                <span className={d.variantState}>{active ? t("Selected") : t("Select")}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {groups.map((group) => (
        <fieldset key={group.name}>
          <legend>
            {group.label}
            <span>{selectedAttributeValue(selected, group.name)}</span>
          </legend>
          <div className={d.optionList}>
            {group.values.map((value) => {
              const active = selectedAttributeValue(selected, group.name) === value;
              return (
                <button
                  type="button"
                  key={value}
                  className={d.option}
                  aria-pressed={active}
                  onClick={() => onSelect(variantForOption(variants, groups, selected, group.name, value))}
                >
                  {isColorGroup(group) ? (
                    <span aria-hidden="true" className={d.swatch} style={{ backgroundColor: colorValue(value) }} />
                  ) : null}
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function StockStatus({ variant }: { variant: B2BProductVariant }) {
  const { t } = useB2BTranslations();
  const availability = variant.availability;
  if (!availability) return null;
  if (!availability.isOnStock) return <span className={d.outOfStock}>{t("Out of stock")}</span>;
  return (
    <span className={d.inStock}>
      <CheckIcon aria-hidden="true" />
      {typeof availability.availableQuantity === "number" && availability.availableQuantity > 0
        ? t("In stock · {count} available", { count: availability.availableQuantity })
        : t("In stock")}
    </span>
  );
}

/** Always-on purchase bar docked to the viewport bottom, mirroring the buy box. */
function B2BStickyBar({
  product,
  variant,
  meta,
  quantity,
  maxQuantity,
  canAdd,
  status,
  onQuantityChange,
  onAdd,
}: {
  product: B2BProduct;
  variant: B2BProductVariant;
  meta: string;
  quantity: number;
  maxQuantity: number;
  canAdd: boolean;
  status: "idle" | "pending" | "added";
  onQuantityChange: (quantity: number) => void;
  onAdd: () => void;
}) {
  const { t } = useB2BTranslations();
  const barRef = useRef<HTMLDivElement>(null);
  useReservedSpace(barRef);
  return (
    <div ref={barRef} className={stickyStyles.bar} role="region" aria-label={t("Buy {name}", { name: product.name })}>
      <div className={`${stickyStyles.inner} ${d.stickyInner}`}>
        <div className={stickyStyles.identity}>
          <img className={stickyStyles.thumb} src={variant.image || product.image} alt="" width={56} height={56} />
          <span className={stickyStyles.copy}>
            <strong>{product.name}</strong>
            {meta ? <small>{meta}</small> : null}
          </span>
        </div>
        <div className={`${stickyStyles.purchase} ${d.stickyPurchase}`}>
          {variant.price ? (
            <p className={variant.originalPrice ? `${stickyStyles.price} ${stickyStyles.onSale}` : stickyStyles.price}>
              {variant.originalPrice ? <s>{variant.originalPrice.formatted}</s> : null}
              <span>{variant.price.formatted}</span>
            </p>
          ) : null}
          <div className={stickyStyles.quantity}>
            <span className={stickyStyles.quantityLabel}>{t("Qty")}</span>
            <QuantitySelector
              className={d.stepper}
              editable
              label={t("Quantity")}
              value={quantity}
              minValue={1}
              maxValue={maxQuantity}
              disabled={!canAdd}
              onChange={onQuantityChange}
            />
          </div>
          <button
            type="button"
            className={d.stickyAdd}
            disabled={!canAdd || status === "pending"}
            data-state={status}
            onClick={onAdd}
          >
            {status === "added" ? <CheckIcon aria-hidden="true" /> : <ShoppingBagIcon aria-hidden="true" />}
            <span>{status === "pending" ? t("Adding…") : status === "added" ? t("Added to bag") : t("Add to business bag")}</span>
          </button>
          <B2BSaveButton compact productId={product.id} variantId={variant.id} />
        </div>
      </div>
    </div>
  );
}

function ProductView({
  product: p,
  initialReviews,
  reviewsError,
  ratingSummary,
}: {
  product: B2BProduct;
  initialReviews: ProductReviewPage | null;
  reviewsError: string;
  ratingSummary: ProductRatingSummary | null;
}) {
  const { t } = useB2BTranslations();
  const { state, busy } = useB2B();
  const pathname = usePathname();
  const params = useSearchParams();
  const requestedVariant = Number(params.get("variant"));
  const variant = p.variants.find((v) => v.id === requestedVariant) ?? p.variants[0];
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>(TABS.description);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { status, setStatus, add } = useAddToBag(p);
  const groups = useMemo(() => optionGroupsFor(p.variants), [p.variants]);

  // Context changes reprice the page; a confirmation from the old store no longer applies.
  useEffect(() => {
    setStatus("idle");
  }, [state?.context?.storeKey, state?.context?.businessUnitKey, setStatus]);

  useEffect(() => {
    let stored: string[] = [];
    try {
      stored = parseRecentlyViewed(window.localStorage.getItem(B2B_RECENTLY_VIEWED_KEY));
      window.localStorage.setItem(B2B_RECENTLY_VIEWED_KEY, JSON.stringify(pushRecentlyViewed(stored, p.id)));
    } catch {
      // Storage can be unavailable (private mode, quota); the page works without it.
    }
    setRecentIds(stored);
  }, [p.id]);

  if (!variant)
    return (
      <main className={s.main}>
        <div className={s.empty}>
          <h1>{t("Product unavailable")}</h1>
          <p>{t("This product is not available in the current assortment.")}</p>
          <Link href="/b2b/products">{t("Explore the catalog →")}</Link>
        </div>
      </main>
    );

  const description = plainText(p.description);
  const images = variantImages(p, variant);
  const brand = brandOf(variant);
  const specs = specificationRows(p, variant, t);
  const related = relatedBusinessProducts(p, state?.products ?? []);
  const recent = resolveRecentlyViewed(recentIds, state?.products ?? [], p.id).slice(0, 4);
  const inBag = (state?.cart?.lines ?? [])
    .filter((line) => line.productId === p.id && line.variantId === variant.id)
    .reduce((sum, line) => sum + line.quantity, 0);
  const outOfStock = variant.availability?.isOnStock === false;
  const stockLimit = variant.availability?.availableQuantity;
  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY, stockLimit && stockLimit > 0 ? stockLimit : MAX_QUANTITY));
  const canAdd = Boolean(state?.context && variant.price && !outOfStock && !busy);
  const variantSummary =
    groups
      .map((group) => selectedAttributeValue(variant, group.name))
      .filter(Boolean)
      .join(" · ");
  const stickyMeta = [variantSummary, variant.sku ? `${t("SKU")} ${variant.sku}` : ""].filter(Boolean).join(" · ");

  function selectVariant(next: B2BProductVariant) {
    if (next.id === variant.id) return;
    setStatus("idle");
    setQuantity(1);
    const query = new URLSearchParams(params.toString());
    if (next.id === p.variants[0]?.id) query.delete("variant");
    else query.set("variant", String(next.id));
    // Native history keeps the URL shareable without re-running the server page.
    window.history.replaceState(null, "", `${pathname}${query.size ? `?${query}` : ""}`);
  }

  async function addToBag() {
    if (canAdd) await add(variant.id, Math.min(quantity, maxQuantity));
  }

  return (
    <ProductReviewsProvider
      key={p.id}
      productId={p.id}
      productName={p.name}
      initialReviews={initialReviews}
      initialSummary={ratingSummary}
      initialError={reviewsError}
      apiBasePath="/api/b2b/products"
      onBeforeWrite={() => {
        if (state?.customer) return true;
        window.location.assign("/b2b/account");
        return false;
      }}
      onRevealReviews={() => setActiveTab(TABS.reviews)}
    >
      <main className={s.main}>
        <nav className={s.breadcrumb} aria-label={t("Breadcrumb")}>
          <Link href="/b2b">{t("Business")}</Link>
          <span aria-hidden="true">/</span>
          <Link href="/b2b/products">{t("All products")}</Link>
          {p.category ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={businessCatalogUrl({ category: p.category })}>{p.category}</Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{p.name}</span>
        </nav>
        <section className={s.detail}>
          <div className={d.gallery} aria-label={t("{name} gallery", { name: p.name })}>
            <Gallery images={images} productName={p.name} imageSuffix="" thumbnailSuffix="" />
          </div>
          <div className={s.detailInfo}>
            <div className={d.meta}>
              <span className={s.eyebrow}>{p.category}</span>
              {variant.sku ? (
                <span className={d.sku}>
                  {t("SKU")} <strong>{variant.sku}</strong>
                </span>
              ) : null}
            </div>
            <h1>{p.name}</h1>
            {brand ? (
              <p className={d.brand}>
                {t("Brand")} <strong>{brand}</strong>
              </p>
            ) : null}
            <ProductRatingSnippet className={d.rating} />
            {description ? <p className={d.summary}>{summaryOf(description)}</p> : null}

            <div className={d.priceBlock}>
              <p
                className={
                  !variant.price
                    ? d.noPrice
                    : variant.originalPrice
                      ? `${d.price} ${d.onSale}`
                      : d.price
                }
              >
                {variant.originalPrice ? <s className={d.wasPrice}>{variant.originalPrice.formatted}</s> : null}
                <span>
                  {variant.price?.formatted ??
                    (state?.context ? t("Price unavailable") : t("Sign in & select a store for pricing"))}
                </span>
              </p>
              <div className={d.priceMeta}>
                {state?.context && (
                  <span>
                    {t("Pricing for {store} · {currency}", {
                      store: state.context.storeKey,
                      currency: state.context.currency,
                    })}
                  </span>
                )}
                <StockStatus variant={variant} />
              </div>
            </div>

            <VariantPicker variants={p.variants} selected={variant} groups={groups} onSelect={selectVariant} />

            <form
              className={d.buyBox}
              onSubmit={(e) => {
                e.preventDefault();
                void addToBag();
              }}
            >
              <div className={d.purchase}>
                <span className={d.quantityLabel}>{t("Quantity")}</span>
                <QuantitySelector
                  className={d.stepper}
                  editable
                  label={t("Quantity")}
                  value={Math.min(quantity, maxQuantity)}
                  minValue={1}
                  maxValue={maxQuantity}
                  disabled={!canAdd}
                  onChange={(value) => {
                    setQuantity(value);
                    setStatus("idle");
                  }}
                />
                <Button className={d.addButton} loading={status === "pending"} disabled={!canAdd}>
                  <ShoppingBagIcon aria-hidden="true" />
                  {outOfStock ? t("Out of stock") : t("Add to business bag")}
                </Button>
              </div>
              {inBag > 0 ? (
                <p className={d.inBag}>
                  <CheckIcon aria-hidden="true" />
                  {t("{count} already in your bag", { count: inBag })}
                  <Link href="/b2b/cart">{t("View bag →")}</Link>
                </p>
              ) : null}
              <div className={d.secondaryActions}>
                <B2BCompareButton productId={p.id} />
                <B2BSaveButton productId={p.id} variantId={variant.id} />
              </div>
            </form>
            {!state?.context && (
              <p className={d.notice}>
                <Link href="/b2b/account" className={s.textLink}>
                  {t("Sign in and select a business store →")}
                </Link>
              </p>
            )}
            {state?.context && !variant.price && (
              <p className={d.notice}>{t("No price is available for this option in your selected store.")}</p>
            )}

            <div className={d.shipping}>
              <strong>
                <TruckIcon aria-hidden="true" />
                {t("Delivery for your business")}
              </strong>
              <dl>
                <div>
                  <dt>{t("Standard delivery")}</dt>
                  <dd>{t("3-5 business days")}</dd>
                </div>
                <div>
                  <dt>{t("Express delivery")}</dt>
                  <dd>{t("1-2 business days")}</dd>
                </div>
              </dl>
              <p>{t("Available methods and shipping costs are calculated at checkout.")}</p>
              <p className={d.shippingNote}>
                <strong>{t("Made for your business")}</strong>
                {t("Your selection uses your business unit’s assigned store and pricing.")}
              </p>
            </div>
          </div>
        </section>

        <DetailTabs
          description={description}
          specifications={specs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {related.length ? (
          <section className={d.section} aria-labelledby="b2b-related-products">
            <span className={s.eyebrow}>{t("SELECTED FOR YOUR BUSINESS")}</span>
            <h2 id="b2b-related-products">{t("Related products")}</h2>
            <div className={s.products}>
              {related.map((product) => (
                <B2BProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}
        {recent.length ? (
          <section className={d.section} aria-labelledby="b2b-recently-viewed">
            <h2 id="b2b-recently-viewed">{t("Recently viewed")}</h2>
            <div className={s.products}>
              {recent.map((product) => (
                <B2BProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <B2BStickyBar
        product={p}
        variant={variant}
        meta={stickyMeta}
        quantity={Math.min(quantity, maxQuantity)}
        maxQuantity={maxQuantity}
        canAdd={canAdd}
        status={status}
        onQuantityChange={(value) => {
          setQuantity(value);
          setStatus("idle");
        }}
        onAdd={() => void addToBag()}
      />
    </ProductReviewsProvider>
  );
}

function ProductDetailContent({
  id,
  initialReviews,
  reviewsError,
  ratingSummary,
}: B2BProductDetailProps) {
  const { t } = useB2BTranslations();
  const { state } = useB2B();
  const product = state?.products.find((candidate) => candidate.id === id);
  if (!state)
    return (
      <main className={s.main}>
        <p className={s.empty}>{t("Loading product…")}</p>
      </main>
    );
  if (!product)
    return (
      <main className={s.main}>
        <div className={s.empty}>
          <h1>{t("Product unavailable")}</h1>
          <p>{t("This product is not available in the current assortment.")}</p>
          <Link href="/b2b/products">{t("Explore the catalog →")}</Link>
        </div>
      </main>
    );
  return (
    <ProductView
      product={product}
      initialReviews={initialReviews ?? null}
      reviewsError={reviewsError ?? ""}
      ratingSummary={ratingSummary ?? null}
    />
  );
}

type B2BProductDetailProps = {
  id: string;
  initialReviews?: ProductReviewPage | null;
  reviewsError?: string;
  ratingSummary?: ProductRatingSummary | null;
};

export function B2BProductDetail(props: B2BProductDetailProps) {
  return (
    <Suspense
      fallback={
        <main className={s.main}>
          <p className={s.empty}>Loading product…</p>
        </main>
      }
    >
      <ProductDetailContent {...props} />
    </Suspense>
  );
}
