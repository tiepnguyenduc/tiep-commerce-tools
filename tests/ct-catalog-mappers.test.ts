import { describe, expect, it } from "vitest";
import {
  mapCategoryResourcesToHeaderCategories,
  mapProductResourceToStorefrontProduct,
} from "../lib/ct/catalog-mappers";

describe("commercetools catalog mapping", () => {
  it("maps root categories to header category links", () => {
    const categories = mapCategoryResourcesToHeaderCategories(
      [
        {
          id: "root-furniture",
          key: "furniture",
          name: { "en-US": "Furniture" },
          slug: { "en-US": "furniture" },
          ancestors: [],
          orderHint: "0.20",
        },
        {
          id: "child-sofas",
          key: "sofas",
          name: { "en-US": "Sofas" },
          slug: { "en-US": "sofas" },
          ancestors: [{ typeId: "category", id: "root-furniture" }],
          parent: { typeId: "category", id: "root-furniture" },
          orderHint: "0.10",
        },
        {
          id: "root-decor",
          key: "decor",
          name: { en: "Decor" },
          slug: { en: "decor" },
          ancestors: [],
          orderHint: "0.10",
        },
      ] as any,
      "en-US",
    );

    expect(categories).toEqual([
      { id: "root-decor", name: "Decor", slug: "decor" },
      { id: "root-furniture", name: "Furniture", slug: "furniture" },
    ]);
  });

  it("maps Product Query API resources to storefront products", () => {
    const product = mapProductResourceToStorefrontProduct(
      {
        id: "ecb274f7-5520-45e2-bc75-5fdbe14d0cd3",
        key: "art-deco-coffee-table",
        masterData: {
          current: {
            slug: { "en-US": "art-deco-coffee-table" },
            name: { "en-US": "Art Deco Coffee Table" },
            description: { "en-US": "Live product from Merchant Center" },
            categories: [{ typeId: "category", id: "category-1" }],
            masterVariant: {
              id: 1,
              sku: "SKU-ART-DECO",
              images: [
                {
                  url: "https://example.com/table.png",
                  dimensions: { w: 800, h: 600 },
                },
              ],
              prices: [
                {
                  id: "price-1",
                  value: {
                    type: "centPrecision",
                    currencyCode: "USD",
                    centAmount: 129900,
                    fractionDigits: 2,
                  },
                },
              ],
            },
          },
        },
      } as any,
      0,
      "en-US",
    );

    expect(product).toMatchObject({
      id: "ecb274f7-5520-45e2-bc75-5fdbe14d0cd3",
      slug: "art-deco-coffee-table",
      sku: "SKU-ART-DECO",
      name: "Art Deco Coffee Table",
      image: "https://example.com/table.png",
      price: {
        centAmount: 129900,
        currencyCode: "USD",
        formatted: "$1,299.00",
      },
      badges: ["Live catalog"],
    });
  });
});
