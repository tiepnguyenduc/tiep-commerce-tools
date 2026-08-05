import type { Product, SearchResult } from "./types";

export type CatalogFilterOptions = {
  q?: string;
  category?: string;
  color?: string;
  price?: string;
  sort?: string;
};

function normalize(value = "") {
  return value.trim().toLowerCase();
}

function getFacets(items: Product[]) {
  return {
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

export function applyCatalogFilters(
  items: Product[],
  options: CatalogFilterOptions = {},
): SearchResult {
  const query = normalize(options.q);
  const category = normalize(options.category);
  const color = normalize(options.color);

  const selected = items.filter((product) => {
    const searchable = normalize(
      `${product.name} ${product.description} ${product.sku}`,
    );

    return (
      (!query || searchable.includes(query)) &&
      (!category || normalize(product.category) === category) &&
      (!color || normalize(product.color) === color) &&
      matchesPrice(product, options.price)
    );
  });

  const products = sortProducts(selected, options.sort);

  return {
    products,
    total: products.length,
    facets: getFacets(items),
  };
}
