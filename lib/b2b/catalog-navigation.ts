import type { B2BProduct } from "./types";

export function businessCategories(products: Pick<B2BProduct, "category">[]) {
  return [
    ...new Set(
      products
        .map((product) => product.category)
        .filter((category) => category.trim()),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function businessCatalogUrl({
  category = "",
  categoryId = "",
  q = "",
}: { category?: string; categoryId?: string; q?: string } = {}) {
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (category) params.set("category", category);
  if (q.trim()) params.set("q", q.trim());
  return `/b2b/products${params.size ? `?${params}` : ""}`;
}

export function filterBusinessProducts(
  products: B2BProduct[],
  category: string,
  query: string,
  categoryId = "",
) {
  const search = query.trim().toLowerCase();
  return products.filter(
    (product) =>
      (categoryId
        ? product.categoryIds?.includes(categoryId)
        : !category || product.category === category) &&
      `${product.name} ${product.category} ${product.variants.map((variant) => variant.sku).join(" ")}`
        .toLowerCase()
        .includes(search),
  );
}
