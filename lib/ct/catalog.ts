import "server-only";
import type { Product as CtProduct } from "@commercetools/platform-sdk";
import { apiRoot } from "./client";
import { products } from "../sample-data";
import type { HeaderCategory, Product, SearchResult } from "../types";
import {
  mapCategoryResourceToHeaderCategory,
  mapCategoryResourcesToHeaderCategories,
  mapProductResourceToStorefrontProduct,
} from "./catalog-mappers";
import { buildProductCategoryWherePredicate } from "./catalog-search";
import {
  applyCatalogFilters,
  type CatalogFilterOptions,
} from "../catalog-filters";

function sampleHeaderCategories(limit = 6): HeaderCategory[] {
  const seenNames = new Set<string>();

  return products
    .map((product) => product.category)
    .filter((name) => {
      if (seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    })
    .slice(0, limit)
    .map((name) => ({
      id: name,
      name,
      slug: name.toLowerCase().replaceAll(" ", "-"),
    }));
}

export async function listCatalogCategories(): Promise<HeaderCategory[]> {
  if (!apiRoot) return sampleHeaderCategories(50);

  try {
    const { body } = await apiRoot
      .categories()
      .get({
        queryArgs: {
          limit: 200,
          sort: "orderHint asc",
        },
      })
      .execute();
    const seenNames = new Set<string>();

    return body.results
      .map((category) => mapCategoryResourceToHeaderCategory(category))
      .filter((category) => {
        if (!category.name || seenNames.has(category.name)) return false;
        seenNames.add(category.name);
        return true;
      });
  } catch {
    return sampleHeaderCategories(50);
  }
}

export async function listHeaderCategories(): Promise<HeaderCategory[]> {
  if (!apiRoot) return sampleHeaderCategories();

  try {
    const { body } = await apiRoot
      .categories()
      .get({
        queryArgs: {
          limit: 20,
          sort: "orderHint asc",
          where: "parent is not defined",
        },
      })
      .execute();
    const categories = mapCategoryResourcesToHeaderCategories(body.results);
    return categories.length ? categories : sampleHeaderCategories();
  } catch {
    return sampleHeaderCategories();
  }
}

async function listCategorySubtreeIds(categoryId: string): Promise<string[]> {
  if (!apiRoot || !categoryId) return categoryId ? [categoryId] : [];

  try {
    const { body } = await apiRoot
      .categories()
      .get({
        queryArgs: {
          limit: 200,
          where: `ancestors(id="${categoryId.replaceAll('"', '\\"')}")`,
        },
      })
      .execute();

    return [categoryId, ...body.results.map((category) => category.id)];
  } catch {
    return [categoryId];
  }
}

async function listProductResources(where?: string): Promise<CtProduct[]> {
  if (!apiRoot) return [];

  const limit = 100;
  const results: CtProduct[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const { body } = await apiRoot
      .products()
      .get({
        queryArgs: {
          limit,
          offset,
          ...(where ? { where } : {}),
        },
      })
      .execute();

    results.push(...body.results);
    total = body.total ?? offset + body.count;
    offset += body.count;

    if (body.count === 0) break;
  }

  return results;
}

export async function searchProducts(
  q = "",
  category = "",
  options: Omit<CatalogFilterOptions, "q" | "category"> = {},
): Promise<SearchResult> {
  const fallbackCategory = category || options.categoryId || "";
  const filterOptions: CatalogFilterOptions = {
    ...options,
    q,
    category: fallbackCategory,
  };

  if (!apiRoot) return applyCatalogFilters(products, filterOptions);
  try {
    const categories = await listCatalogCategories();
    const categoryNameById = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    const categoryIds = options.categoryId
      ? await listCategorySubtreeIds(options.categoryId)
      : [];
    const where = buildProductCategoryWherePredicate(categoryIds);
    const resources = await listProductResources(where);
    const mapped: Product[] = resources.map((resource, i) => {
      const data = resource.masterData.current;
      const master = data.masterVariant;
      const price = master.prices?.[0]?.value;
      const cents = price?.centAmount ?? 0;
      const productCategoryName = data.categories
        .map((productCategory) => categoryNameById.get(productCategory.id))
        .find((name): name is string => Boolean(name));
      const categoryName = productCategoryName || category || "Catalog";

      return {
        id: resource.id,
        slug: data.slug?.["en-US"] ?? resource.id,
        sku: master.sku ?? `SKU-${i}`,
        name: data.name?.["en-US"] ?? "Product",
        description: data.description?.["en-US"] ?? "",
        category: categoryName,
        color: "Standard",
        image: master.images?.[0]?.url ?? products[i % products.length].image,
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
    return applyCatalogFilters(mapped, {
      q,
      color: options.color,
      price: options.price,
      sort: options.sort,
      page: options.page,
      perPage: options.perPage,
    });
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
    result.products.find((p) => p.slug === slug || p.id === slug) ||
    products.find((p) => p.slug === slug || p.id === slug) ||
    null
  );
}
