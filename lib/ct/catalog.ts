import "server-only";
import { apiRoot } from "./client";
import { products } from "../sample-data";
import type { Product, SearchResult } from "../types";
import { mapProductResourceToStorefrontProduct } from "./catalog-mappers";

function filter(items: Product[], q = "", category = ""): SearchResult {
  const query = q.toLowerCase();
  const selected = items.filter(
    (p) =>
      (!query ||
        `${p.name} ${p.description} ${p.sku}`.toLowerCase().includes(query)) &&
      (!category || p.category === category),
  );
  return {
    products: selected,
    total: selected.length,
    facets: {
      categories: [...new Set(items.map((p) => p.category))],
      colors: [...new Set(items.map((p) => p.color))],
    },
  };
}
export async function searchProducts(
  q = "",
  category = "",
): Promise<SearchResult> {
  if (!apiRoot) return filter(products, q, category);
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
    return filter(mapped, q, category);
  } catch {
    try {
      const { body } = await apiRoot
        .products()
        .get({ queryArgs: { limit: 24 } })
        .execute();
      return filter(
        body.results.map((product, index) =>
          mapProductResourceToStorefrontProduct(product, index, "en-US"),
        ),
        q,
        category,
      );
    } catch {
      return filter(products, q, category);
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
