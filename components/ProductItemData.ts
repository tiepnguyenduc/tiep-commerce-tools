import type { Product } from "@/lib/types";

export type ProductItemData = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand?: string;
  category: string;
  color?: string;
  description?: string;
  image: string;
  price: Product["price"];
  specifications?: Product["specifications"];
};

export function productToProductItem(product: Product): ProductItemData {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category: product.category,
    color: product.color,
    description: product.description,
    image: product.image,
    price: product.price,
    specifications: product.specifications,
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
    (candidate.brand === undefined || typeof candidate.brand === "string") &&
    typeof candidate.category === "string" &&
    (candidate.color === undefined || typeof candidate.color === "string") &&
    (candidate.description === undefined ||
      typeof candidate.description === "string") &&
    typeof candidate.image === "string" &&
    typeof candidate.price?.formatted === "string" &&
    typeof candidate.price?.centAmount === "number" &&
    typeof candidate.price?.currencyCode === "string"
  );
}
