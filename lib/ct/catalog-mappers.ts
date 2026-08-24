import type {
  Category as CtCategory,
  Product as CtProduct,
  ProductVariant as CtProductVariant,
} from "@commercetools/platform-sdk";
import { products as sampleProducts } from "../sample-data";
import type { HeaderCategory, Product, ProductSpecification } from "../types";

function formatMoney(
  centAmount: number,
  currencyCode: string,
  fractionDigits: number,
  locale: string,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(centAmount / 10 ** fractionDigits);
}

function localized(
  value: Record<string, string> | undefined,
  locale: string,
  fallback = "",
) {
  return value?.[locale] || value?.en || Object.values(value ?? {})[0] || fallback;
}

export function attributeLabel(name: string) {
  const labels: Record<string, string> = {
    colorlabel: "Color Label",
    searchcolor: "Search Color",
    productspec: "Product Specifications",
    productspecifications: "Product Specifications",
    newarrival: "New Arrival",
  };
  const key = name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (labels[key]) return labels[key];

  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function localizedUnknown(value: unknown, locale: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  const preferred = record[locale] ?? record.en ?? Object.values(record)[0];
  return typeof preferred === "string" ? preferred : "";
}

export function formatAttributeValue(value: unknown, locale: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((item) => formatAttributeValue(item, locale))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (
      typeof record.centAmount === "number" &&
      typeof record.currencyCode === "string"
    ) {
      return formatMoney(
        record.centAmount,
        record.currencyCode,
        typeof record.fractionDigits === "number" ? record.fractionDigits : 2,
        locale,
      );
    }

    const label = record.label;
    if (typeof label === "string") return label;
    const localizedLabel = localizedUnknown(label, locale);
    if (localizedLabel) return localizedLabel;

    const localizedValue = localizedUnknown(value, locale);
    if (localizedValue) return localizedValue;

    if (typeof record.key === "string") return attributeLabel(record.key);
    if (typeof record.id === "string") return record.id;
  }

  return "";
}

export function variantAttributes(
  variant: CtProductVariant,
  locale: string,
): ProductSpecification[] {
  return (variant.attributes ?? [])
    .map((attribute) => ({
      name: attribute.name,
      label: attributeLabel(attribute.name),
      value: formatAttributeValue(attribute.value, locale),
    }))
    .filter((attribute) => attribute.value.length > 0);
}

function variantImageUrls(variant: CtProductVariant, fallbackImage: string) {
  const urls = variant.images?.map((image) => image.url).filter(Boolean) ?? [];
  return urls.length ? urls : [fallbackImage];
}

function mapVariant(
  variant: CtProductVariant,
  locale: string,
  fallbackImage: string,
) {
  const price = variant.prices?.[0]?.value;
  const centAmount = price?.centAmount ?? 0;
  const currencyCode = price?.currencyCode ?? "USD";
  const fractionDigits = price?.fractionDigits ?? 2;
  const images = variantImageUrls(variant, fallbackImage);
  const attributes = variantAttributes(variant, locale);

  return {
    id: variant.id,
    sku: variant.sku ?? `VARIANT-${variant.id}`,
    key: variant.key,
    image: images[0],
    images,
    price: {
      centAmount,
      currencyCode,
      formatted: formatMoney(centAmount, currencyCode, fractionDigits, locale),
    },
    attributes,
    specifications: attributes,
  };
}

function variantCount(data: CtProduct["masterData"]["current"]) {
  return 1 + (data.variants?.length ?? 0);
}

function brandFromSpecifications(specifications: ProductSpecification[]) {
  return specifications.find((specification) => {
    const key = specification.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const label = specification.label.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return [key, label].some((value) =>
      ["brand", "manufacturer", "vendor", "maker", "designer"].includes(value),
    );
  })?.value;
}

function productData(resource: CtProduct) {
  const { current, staged } = resource.masterData;
  return staged && variantCount(staged) > variantCount(current) ? staged : current;
}

export function mapCategoryResourcesToHeaderCategories(
  resources: CtCategory[],
  locale = "en-US",
  limit = 6,
): HeaderCategory[] {
  const seenNames = new Set<string>();

  return resources
    .filter(
      (category) =>
        !category.parent && (!category.ancestors || category.ancestors.length === 0),
    )
    .sort((a, b) => {
      const orderA = Number.parseFloat(a.orderHint);
      const orderB = Number.parseFloat(b.orderHint);

      if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) {
        return orderA - orderB;
      }

      return localized(a.name, locale).localeCompare(localized(b.name, locale));
    })
    .map((category) => mapCategoryResourceToHeaderCategory(category, locale))
    .filter((category) => {
      if (!category.name || seenNames.has(category.name)) return false;
      seenNames.add(category.name);
      return true;
    })
    .slice(0, limit);
}

export function mapCategoryResourceToHeaderCategory(
  category: CtCategory,
  locale = "en-US",
): HeaderCategory {
  return {
    id: category.id,
    name: localized(category.name, locale),
    slug: localized(category.slug, locale, category.key ?? category.id),
  };
}

export function mapProductResourceToStorefrontProduct(
  resource: CtProduct,
  index: number,
  locale = "en-US",
  categoryName = "Catalog",
): Product {
  const data = productData(resource);
  const master = data.masterVariant;
  const fallbackImage = sampleProducts[index % sampleProducts.length].image;
  const variants = [master, ...(data.variants ?? [])].map((variant) =>
    mapVariant(variant, locale, fallbackImage),
  );
  const selectedVariant = variants[0];
  const brand =
    brandFromSpecifications(variants.flatMap((variant) => variant.attributes)) ||
    sampleProducts[index % sampleProducts.length].brand ||
    "WORK/SHOP";
  const color =
    selectedVariant.attributes.find((attribute) =>
      ["Color Label", "Search Color"].includes(attribute.label),
    )?.value ?? "Standard";
  const images = Array.from(
    new Set(variants.flatMap((variant) => variant.images).filter(Boolean)),
  );

  return {
    id: resource.id,
    slug: localized(data.slug, locale, resource.key || resource.id),
    sku: selectedVariant.sku || resource.key || `SKU-${index}`,
    name: localized(data.name, locale, "Product"),
    description: localized(data.description, locale),
    brand,
    category: categoryName,
    color,
    image: selectedVariant.image,
    price: selectedVariant.price,
    badges: ["Live catalog"],
    images,
    specifications: selectedVariant.specifications,
    variants,
  };
}
