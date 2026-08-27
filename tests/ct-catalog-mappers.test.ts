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
              key: "art-deco-black",
              attributes: [
                {
                  name: "colorLabel",
                  value: { key: "walnut", label: "Walnut" },
                },
                { name: "manufacturer", value: "Northline" },
                { name: "newArrival", value: true },
              ],
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
          staged: {
            slug: { "en-US": "art-deco-coffee-table" },
            name: { "en-US": "Art Deco Coffee Table" },
            description: { "en-US": "Live product from Merchant Center" },
            categories: [{ typeId: "category", id: "category-1" }],
            masterVariant: {
              id: 1,
              sku: "SKU-ART-DECO",
              key: "art-deco-black",
              attributes: [
                {
                  name: "colorLabel",
                  value: { key: "walnut", label: "Walnut" },
                },
                { name: "manufacturer", value: "Northline" },
                { name: "newArrival", value: true },
              ],
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
            variants: [
              {
                id: 2,
                sku: "SKU-ART-DECO-OAK",
                key: "art-deco-oak",
                attributes: [
                  { name: "colorLabel", value: { key: "oak", label: "Oak" } },
                  { name: "newArrival", value: false },
                  {
                    name: "productSpecifications",
                    value: "Solid oak top - brass-capped legs",
                  },
                ],
                images: [
                  {
                    url: "https://example.com/table-oak-main.png",
                    dimensions: { w: 800, h: 600 },
                  },
                  {
                    url: "https://example.com/table-oak-side.png",
                    dimensions: { w: 800, h: 600 },
                  },
                ],
                prices: [
                  {
                    id: "price-2",
                    value: {
                      type: "centPrecision",
                      currencyCode: "USD",
                      centAmount: 139900,
                      fractionDigits: 2,
                    },
                  },
                ],
              },
            ],
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
      color: "Walnut",
      brand: "Northline",
      badges: ["Live catalog"],
    });
    expect(product.originalPrice).toBeUndefined();
    expect(product.variants).toHaveLength(2);
    expect(product.variants?.[1]).toMatchObject({
      id: 2,
      sku: "SKU-ART-DECO-OAK",
      key: "art-deco-oak",
      image: "https://example.com/table-oak-main.png",
      images: [
        "https://example.com/table-oak-main.png",
        "https://example.com/table-oak-side.png",
      ],
      price: {
        centAmount: 139900,
        formatted: "$1,399.00",
      },
      specifications: [
        { name: "colorLabel", label: "Color Label", value: "Oak" },
        { name: "newArrival", label: "New Arrival", value: "No" },
        {
          name: "productSpecifications",
          label: "Product Specifications",
          value: "Solid oak top - brass-capped legs",
        },
      ],
    });
  });

  it("exposes the special price and original list price when discounted", () => {
    const product = mapProductResourceToStorefrontProduct(
      {
        id: "bruno-chair",
        key: "bruno-chair",
        masterData: {
          current: {
            slug: { "en-US": "bruno-chair" },
            name: { "en-US": "Bruno Chair" },
            description: { "en-US": "On sale" },
            categories: [],
            masterVariant: {
              id: 1,
              sku: "SKU-BRUNO",
              attributes: [],
              images: [],
              prices: [
                {
                  id: "price-1",
                  value: {
                    type: "centPrecision",
                    currencyCode: "USD",
                    centAmount: 7999,
                    fractionDigits: 2,
                  },
                  discounted: {
                    value: {
                      type: "centPrecision",
                      currencyCode: "USD",
                      centAmount: 6799,
                      fractionDigits: 2,
                    },
                    discount: { typeId: "product-discount", id: "d-1" },
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

    expect(product.price).toMatchObject({
      centAmount: 6799,
      formatted: "$67.99",
    });
    expect(product.originalPrice).toMatchObject({
      centAmount: 7999,
      formatted: "$79.99",
    });
  });
});
