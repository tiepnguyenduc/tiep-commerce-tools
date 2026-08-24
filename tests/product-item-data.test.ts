import { describe, expect, it } from "vitest";
import {
  isProductItemData,
  productToProductItem,
  type ProductItemData,
} from "@/components/ProductItemData";
import {
  itemToCompareProduct,
  productToCompareProduct,
} from "@/components/ProductCompareData";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "product-1",
  slug: "focus-chair",
  sku: "FOCUS-CHAIR",
  name: "Focus Chair",
  description: "A task chair with quiet support for long planning sessions.",
  brand: "Aeroform",
  category: "Seating",
  color: "Red",
  image: "/images/focus-chair.jpg",
  price: {
    centAmount: 48900,
    currencyCode: "USD",
    formatted: "$489.00",
  },
  badges: [],
  specifications: [
    {
      name: "frame",
      label: "Frame",
      value: "Aluminum",
    },
  ],
};

describe("product item data", () => {
  it("stores brand when mapping catalog products for sliders", () => {
    expect(productToProductItem(product)).toMatchObject({
      id: "product-1",
      brand: "Aeroform",
      description:
        "A task chair with quiet support for long planning sessions.",
    });
  });

  it("accepts legacy recently viewed items without brand", () => {
    const legacyItem: ProductItemData = {
      id: "product-1",
      slug: "focus-chair",
      sku: "FOCUS-CHAIR",
      name: "Focus Chair",
      category: "Seating",
      image: "/images/focus-chair.jpg",
      price: product.price,
    };

    expect(isProductItemData(legacyItem)).toBe(true);
  });

  it("preserves brand in compare data from products and slider items", () => {
    const item = productToProductItem(product);

    expect(productToCompareProduct(product).brand).toBe("Aeroform");
    expect(itemToCompareProduct(item).brand).toBe("Aeroform");
  });
});
