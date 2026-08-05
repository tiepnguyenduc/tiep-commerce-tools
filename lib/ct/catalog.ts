import "server-only";
import { apiRoot } from "./client";
import { products } from "../sample-data";
import type { Product, SearchResult } from "../types";
import { mapProductResourceToStorefrontProduct } from "./catalog-mappers";
import {
  applyCatalogFilters,
  type CatalogFilterOptions,
} from "../catalog-filters";

export async function searchProducts(
  q = "",
  category = "",
  options: Omit<CatalogFilterOptions, "q" | "category"> = {},
): Promise<SearchResult> {
  const filterOptions: CatalogFilterOptions = { ...options, q, category };

  if (!apiRoot) return applyCatalogFilters(products, filterOptions);
  try {
    const { body } = await apiRoot
      .products()
      .search()
      .post({
        body: {
          limit: 24,
          productProjectionParameters: {
            localeProjection: ["en-US"],
            priceCurrency: "USD",
            priceCountry: "US",
          },
          query: q
            ? { fullText: { field: "name", language: "en", value: q } }
            : undefined,
        },
      })
      .execute();
    const mapped: Product[] = body.results.map((r, i) => {
      const master = r.productProjection?.masterVariant;
      const price = master?.price?.value;
      const cents = price?.centAmount ?? 0;
      return {
        id: r.id,
        slug: r.productProjection?.slug?.["en-US"] ?? r.id,
        sku: master?.sku ?? `SKU-${i}`,
        name: r.productProjection?.name?.["en-US"] ?? "Product",
        description: r.productProjection?.description?.["en-US"] ?? "",
        category: "Catalog",
        color: "Standard",
        image: master?.images?.[0]?.url ?? products[i % products.length].image,
        price: {
          centAmount: cents,
          currencyCode: price?.currencyCode ?? "USD",
          formatted: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: price?.currencyCode ?? "USD",
          }).format(cents / 100),
        },
        badges: ["Live catalog"],
      };
    });
    return applyCatalogFilters(mapped, filterOptions);
  } catch {
    try {
      const { body } = await apiRoot
        .products()
        .get({ queryArgs: { limit: 24 } })
        .execute();
      return applyCatalogFilters(
        body.results.map((product, index) =>
          mapProductResourceToStorefrontProduct(product, index, "en-US"),
        ),
        filterOptions,
      );
    } catch {
      return applyCatalogFilters(products, filterOptions);
    }
  }
}
export async function getProduct(slug: string) {
  const result = await searchProducts();
  return (
    result.products.find((p) => p.slug === slug) ||
    products.find((p) => p.slug === slug) ||
    null
  );
}
