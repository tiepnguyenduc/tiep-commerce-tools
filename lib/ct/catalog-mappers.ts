import type { Product as CtProduct } from "@commercetools/platform-sdk";
import { products as sampleProducts } from "../sample-data";
import type { Product } from "../types";

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

export function mapProductResourceToStorefrontProduct(
  resource: CtProduct,
  index: number,
  locale = "en-US",
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
    category: "Catalog",
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
