import type { Product, SearchResult } from "./types";

export type CatalogFilterOptions = {
  q?: string;
  brand?: string | string[];
  category?: string;
  categoryId?: string;
  color?: string;
  price?: string;
  sort?: string;
  page?: string | number;
  perPage?: number;
};

function normalize(value = "") {
  return value.trim().toLowerCase();
}

function normalizeValues(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function getFacets(items: Product[]) {
  return {
    brands: [
      ...new Set(
        items
          .map((p) => p.brand?.trim())
          .filter((brand): brand is string => Boolean(brand)),
      ),
    ].sort(),
    categories: [...new Set(items.map((p) => p.category))].sort(),
    colors: [...new Set(items.map((p) => p.color))].sort(),
  };
}

function matchesPrice(product: Product, price = "") {
  if (!price) return true;

  const [min, max] = price.split("-");
  const minCents = min ? Number(min) * 100 : undefined;
  const maxCents = max ? Number(max) * 100 : undefined;

  if (min && Number.isNaN(minCents)) return true;
  if (max && Number.isNaN(maxCents)) return true;

  return (
    (minCents === undefined || product.price.centAmount >= minCents) &&
    (maxCents === undefined || product.price.centAmount < maxCents)
  );
}

function sortProducts(items: Product[], sort = "") {
  const selected = [...items];

  if (sort === "price-asc") {
    selected.sort((a, b) => a.price.centAmount - b.price.centAmount);
  }

  if (sort === "price-desc") {
    selected.sort((a, b) => b.price.centAmount - a.price.centAmount);
  }

  if (sort === "name-asc") {
    selected.sort((a, b) => a.name.localeCompare(b.name));
  }

  return selected;
}

function normalizePositiveInteger(value: string | number | undefined, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function applyCatalogFilters(
  items: Product[],
  options: CatalogFilterOptions = {},
): SearchResult {
  const query = normalize(options.q);
  const brands = normalizeValues(options.brand);
  const category = normalize(options.category);
  const color = normalize(options.color);

  const selected = items.filter((product) => {
    const searchable = normalize(
      `${product.name} ${product.description} ${product.sku} ${product.brand ?? ""}`,
    );

    return (
      (!query || searchable.includes(query)) &&
      (!brands.length || brands.includes(normalize(product.brand))) &&
      (!category || normalize(product.category) === category) &&
      (!color || normalize(product.color) === color) &&
      matchesPrice(product, options.price)
    );
  });

  const sortedProducts = sortProducts(selected, options.sort);
  const perPage = normalizePositiveInteger(options.perPage, sortedProducts.length || 1);
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / perPage));
  const requestedPage = normalizePositiveInteger(options.page, 1);
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * perPage;
  const products = sortedProducts.slice(start, start + perPage);

  return {
    products,
    total: sortedProducts.length,
    facets: getFacets(items),
    pagination: {
      page,
      perPage,
      totalPages,
    },
  };
}
