import "server-only";
import type { Product as CtProduct } from "@commercetools/platform-sdk";
import { getApiRoot } from "./client";
import { products } from "../sample-data";
import type {
  HeaderCategory,
  Product,
  ProductBrandSummary,
  SearchResult,
} from "../types";
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

/**
 * Key of the auto-maintained "Sale" category. Kept in sync with
 * scripts/collect-sale-products.mjs, which creates the category and assigns
 * discounted products to it.
 */
export const SALE_CATEGORY_KEY = "sale";

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
  const apiRoot = getApiRoot();
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
      .map((category) => ({ ...mapCategoryResourceToHeaderCategory(category), parentId: category.parent?.id }))
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
  const apiRoot = getApiRoot();
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
    const categories = mapCategoryResourcesToHeaderCategories(
      // The dedicated Sale link is rendered separately, so keep it out of the
      // generic category list to avoid a duplicate entry.
      body.results.filter((category) => category.key !== SALE_CATEGORY_KEY),
    );
    return categories.length ? categories : sampleHeaderCategories();
  } catch {
    return sampleHeaderCategories();
  }
}

/**
 * Resolve the auto-maintained "Sale" category, if it exists in the project.
 * Returns null in training mode or when the category has not been created yet.
 */
export async function getSaleCategory(): Promise<HeaderCategory | null> {
  const apiRoot = getApiRoot();
  if (!apiRoot) return null;

  try {
    const { body } = await apiRoot
      .categories()
      .withKey({ key: SALE_CATEGORY_KEY })
      .get()
      .execute();
    return mapCategoryResourceToHeaderCategory(body);
  } catch {
    return null;
  }
}

async function listCategorySubtreeIds(categoryId: string): Promise<string[]> {
  const apiRoot = getApiRoot();
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
  const apiRoot = getApiRoot();
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

  const apiRoot = getApiRoot();
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
      const productCategoryName = data.categories
        .map((productCategory) => categoryNameById.get(productCategory.id))
        .find((name): name is string => Boolean(name));
      const categoryName = productCategoryName || category || "Catalog";
      return mapProductResourceToStorefrontProduct(
        resource,
        i,
        "en-US",
        categoryName,
      );
    });
    return applyCatalogFilters(mapped, {
      q,
      brand: options.brand,
      color: options.color,
      price: options.price,
      sort: options.sort,
      sale: options.sale,
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

function normalizedBrand(value = "") {
  return value.trim().toLowerCase();
}

function productBrand(product: Product) {
  return product.brand?.trim() || "WORK/SHOP";
}

function summarizeBrands(items: Product[]): ProductBrandSummary[] {
  const byBrand = new Map<string, ProductBrandSummary>();

  for (const product of items) {
    const name = productBrand(product);
    const current = byBrand.get(normalizedBrand(name));

    if (current) {
      current.count += 1;
      current.categories = Array.from(
        new Set([...current.categories, product.category]),
      ).sort();
      continue;
    }

    byBrand.set(normalizedBrand(name), {
      name,
      count: 1,
      image: product.image,
      categories: [product.category],
    });
  }

  return Array.from(byBrand.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listCatalogBrands(): Promise<ProductBrandSummary[]> {
  const result = await searchProducts("", "", { perPage: 100 });
  return summarizeBrands(result.products);
}

export async function listProductsByBrand(brand: string): Promise<Product[]> {
  const result = await searchProducts("", "", { perPage: 100 });
  const selectedBrand = normalizedBrand(brand);

  if (!selectedBrand) return result.products;

  return result.products.filter(
    (product) => normalizedBrand(productBrand(product)) === selectedBrand,
  );
}

export async function getRelatedProducts(product: Product, limit = 8) {
  const result = await searchProducts("", "", { perPage: 100 });
  const candidates = result.products.filter((item) => item.id !== product.id);
  const sameCategory = candidates.filter(
    (item) => item.category === product.category,
  );
  const fallback = candidates.filter((item) => item.category !== product.category);

  return [...sameCategory, ...fallback].slice(0, limit);
}
