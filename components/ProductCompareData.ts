import type { ProductItemData } from "@/components/ProductItemData";
import type { Product, ProductSpecification } from "@/lib/types";

export type CompareProductData = ProductItemData & {
  description?: string;
  specifications?: ProductSpecification[];
};

export function productToCompareProduct(product: Product): CompareProductData {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category: product.category,
    color: product.color,
    image: product.image,
    price: product.price,
    description: product.description,
    specifications: product.specifications,
  };
}

export function itemToCompareProduct(
  product: ProductItemData,
): CompareProductData {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category: product.category,
    color: product.color,
    image: product.image,
    price: product.price,
    description: product.description,
    specifications: product.specifications,
  };
}

export function isSpecification(value: unknown): value is ProductSpecification {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ProductSpecification>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.value === "string"
  );
}

export function isCompareProductData(
  value: unknown,
): value is CompareProductData {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CompareProductData>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.sku === "string" &&
    typeof candidate.name === "string" &&
    (candidate.brand === undefined || typeof candidate.brand === "string") &&
    typeof candidate.category === "string" &&
    (candidate.color === undefined || typeof candidate.color === "string") &&
    typeof candidate.image === "string" &&
    typeof candidate.price?.formatted === "string" &&
    typeof candidate.price?.centAmount === "number" &&
    typeof candidate.price?.currencyCode === "string" &&
    (candidate.description === undefined ||
      typeof candidate.description === "string") &&
    (candidate.specifications === undefined ||
      candidate.specifications.every(isSpecification))
  );
}
