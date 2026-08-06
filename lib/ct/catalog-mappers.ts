import type {
  Category as CtCategory,
  Product as CtProduct,
} from "@commercetools/platform-sdk";
import { products as sampleProducts } from "../sample-data";
import type { HeaderCategory, Product } from "../types";

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
  const data = resource.masterData.current;
  const master = data.masterVariant;
  const price = master.prices?.[0]?.value;
  const centAmount = price?.centAmount ?? 0;
  const currencyCode = price?.currencyCode ?? "USD";
  const fractionDigits = price?.fractionDigits ?? 2;

  return {
    id: resource.id,
    slug: localized(data.slug, locale, resource.key || resource.id),
    sku: master.sku ?? resource.key ?? `SKU-${index}`,
    name: localized(data.name, locale, "Product"),
    description: localized(data.description, locale),
    category: categoryName,
    color: "Standard",
    image: master.images?.[0]?.url ?? sampleProducts[index % sampleProducts.length].image,
    price: {
      centAmount,
      currencyCode,
      formatted: formatMoney(centAmount, currencyCode, fractionDigits, locale),
    },
    badges: ["Live catalog"],
  };
}
