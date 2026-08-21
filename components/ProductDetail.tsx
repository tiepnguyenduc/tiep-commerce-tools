"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { Swiper as SwiperClass } from "swiper";
import { A11y, FreeMode, Keyboard, Thumbs } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { AddToCart } from "@/components/AddToCart";
import { AddToWishlist } from "@/components/AddToWishlist";
import { AddToCompare } from "@/components/ProductCompare";
import { productToCompareProduct } from "@/components/ProductCompareData";
import { ProductItemSlider } from "@/components/ProductItemSlider";
import { productsToProductItems } from "@/components/ProductItemData";
import type { Product, ProductSpecification, ProductVariant } from "@/lib/types";

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

export function ProductDetail({
  product,
  relatedProducts = [],
}: {
  product: Product;
  relatedProducts?: Product[];
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
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [mainSwiper, setMainSwiper] = useState<SwiperClass | null>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperClass | null>(null);
  const [lightboxSwiper, setLightboxSwiper] = useState<SwiperClass | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const optionGroups = useMemo(() => optionGroupsFor(variants), [variants]);
  const relatedItems = useMemo(
    () => productsToProductItems(relatedProducts),
    [relatedProducts],
  );
  const specs = specificationRows(product, selectedVariant);
  const safeThumbsSwiper =
    thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null;

  useEffect(() => {
    setActiveImage(0);
    mainSwiper?.slideTo(0);
    lightboxSwiper?.slideTo(0);
  }, [selectedVariant.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    lightboxSwiper?.slideTo(activeImage, 0);
  }, [activeImage, lightboxOpen, lightboxSwiper]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

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

  function openLightbox(index: number) {
    setActiveImage(index);
    setLightboxOpen(true);
  }

  function selectImage(index: number) {
    setActiveImage(index);
    mainSwiper?.slideTo(index);
    lightboxSwiper?.slideTo(index);
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
              <button
                aria-pressed={selected}
                className={selected ? "selected" : ""}
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
                  <em>{variant.price.formatted}</em>
                  <small>{selected ? "Selected" : "Select"}</small>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <main className="shell detail product-detail">
      <section className="product-gallery" aria-label={`${product.name} gallery`}>
        <div className="product-gallery-main">
          <Swiper
            className="product-gallery-swiper"
            keyboard
            modules={[A11y, FreeMode, Keyboard, Thumbs]}
            onSlideChange={(swiper) => setActiveImage(swiper.realIndex)}
            onSwiper={setMainSwiper}
            thumbs={{ swiper: safeThumbsSwiper }}
          >
            {gallery.map((image, index) => (
              <SwiperSlide key={`${image}-${index}`}>
                <button
                  aria-label={`Open product image ${index + 1}`}
                  className="product-gallery-zoom"
                  onClick={() => openLightbox(index)}
                  type="button"
                >
                  <img src={image} alt={product.name} />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
          {gallery.length > 1 ? (
            <div className="gallery-controls">
              <button
                aria-label="Previous product image"
                onClick={() => mainSwiper?.slidePrev()}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faChevronLeft} />
              </button>
              <button
                aria-label="Next product image"
                onClick={() => mainSwiper?.slideNext()}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faChevronRight} />
              </button>
            </div>
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <Swiper
            className="product-thumbnails"
            freeMode
            modules={[A11y, Keyboard, Thumbs]}
            onSwiper={setThumbsSwiper}
            slidesPerView="auto"
            spaceBetween={12}
            watchSlidesProgress
          >
            {gallery.map((image, index) => (
              <SwiperSlide key={`${image}-${index}`}>
                <button
                  aria-label={`Show product image ${index + 1}`}
                  aria-current={index === activeImage}
                  onClick={() => selectImage(index)}
                  type="button"
                >
                  <img src={image} alt="" />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : null}
      </section>

      <section className="product-detail-info">
        <span className="eyebrow">{product.category} collection</span>
        <h1>{product.name}</h1>
        <p className="product-summary">{product.description}</p>
        <div className="product-price-block">
          <p className="price">{selectedVariant.price.formatted}</p>
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
                      <button
                        aria-pressed={selected}
                        className={selected ? "selected" : ""}
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
                      </button>
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
          <div>
            <button
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              type="button"
            >
              -
            </button>
            <output aria-live="polite">{quantity}</output>
            <button
              aria-label="Increase quantity"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              type="button"
            >
              +
            </button>
          </div>
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

        <div className="product-accordions">
          <details>
            <summary>Product description</summary>
            <p>{product.description}</p>
          </details>
          <details open>
            <summary>Product specifications</summary>
            <dl className="spec-table">
              {specs.map((spec) => (
                <div key={`${spec.label}-${spec.value}`}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </section>
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
      {lightboxOpen ? (
        <div
          aria-label={`${product.name} image preview`}
          aria-modal="true"
          className="product-lightbox"
          role="dialog"
        >
          <button
            aria-label="Close image preview"
            className="product-lightbox-backdrop"
            onClick={() => setLightboxOpen(false)}
            type="button"
          />
          <div className="product-lightbox-panel">
            <div className="product-lightbox-head">
              <strong>{product.name}</strong>
              <button
                aria-label="Close image preview"
                onClick={() => setLightboxOpen(false)}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
              </button>
            </div>
            <Swiper
              className="product-lightbox-swiper"
              initialSlide={activeImage}
              keyboard
              modules={[A11y, Keyboard]}
              onSlideChange={(swiper) => setActiveImage(swiper.realIndex)}
              onSwiper={setLightboxSwiper}
            >
              {gallery.map((image, index) => (
                <SwiperSlide key={`${image}-${index}`}>
                  <img src={image} alt={`${product.name} preview ${index + 1}`} />
                </SwiperSlide>
              ))}
            </Swiper>
            {gallery.length > 1 ? (
              <div className="product-lightbox-controls">
                <button
                  aria-label="Previous preview image"
                  onClick={() => lightboxSwiper?.slidePrev()}
                  type="button"
                >
                  <FontAwesomeIcon aria-hidden="true" icon={faChevronLeft} />
                </button>
                <span>
                  {activeImage + 1} / {gallery.length}
                </span>
                <button
                  aria-label="Next preview image"
                  onClick={() => lightboxSwiper?.slideNext()}
                  type="button"
                >
                  <FontAwesomeIcon aria-hidden="true" icon={faChevronRight} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
