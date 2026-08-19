import type { Product } from "@/lib/types";

export type ProductItemData = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category: string;
  color?: string;
  image: string;
  price: Product["price"];
};

export function productToProductItem(product: Product): ProductItemData {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    category: product.category,
    color: product.color,
    image: product.image,
    price: product.price,
  };
}

export function productsToProductItems(products: Product[]): ProductItemData[] {
  return products.map(productToProductItem);
}

export function isProductItemData(value: unknown): value is ProductItemData {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ProductItemData>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.sku === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.category === "string" &&
    (candidate.color === undefined || typeof candidate.color === "string") &&
    typeof candidate.image === "string" &&
    typeof candidate.price?.formatted === "string" &&
    typeof candidate.price?.centAmount === "number" &&
    typeof candidate.price?.currencyCode === "string"
  );
}
