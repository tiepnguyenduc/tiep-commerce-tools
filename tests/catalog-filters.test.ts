import { describe, expect, it } from "vitest";
import { applyCatalogFilters } from "../lib/catalog-filters";
import type { Product } from "../lib/types";

function product(
  id: string,
  centAmount: number,
  category: string,
  color: string,
  name = id,
  brand = "",
): Product {
  return {
    id,
    slug: id,
    sku: id.toUpperCase(),
    name,
    description: `${category} ${color}`,
    brand,
    category,
    color,
    image: "image.png",
    price: {
      centAmount,
      currencyCode: "USD",
      formatted: `$${centAmount / 100}`,
    },
    badges: [],
  };
}

const products = [
  product("cheap-red-chair", 2400, "Seating", "Red", "Cheap chair", "Aeroform"),
  product("mid-blue-desk", 7500, "Workspace", "Blue", "Desk", "Relay Works"),
  product(
    "premium-red-desk",
    25000,
    "Workspace",
    "Red",
    "Premium desk",
    "Relay Works",
  ),
];

describe("catalog filters", () => {
  it("filters by query, category, color and price range", () => {
    const result = applyCatalogFilters(products, {
      q: "desk",
      category: "Workspace",
      color: "Red",
      price: "200-",
    });

    expect(result.products.map((x) => x.id)).toEqual(["premium-red-desk"]);
    expect(result.total).toBe(1);
    expect(result.facets.brands).toEqual(["Aeroform", "Relay Works"]);
    expect(result.facets.categories).toEqual(["Seating", "Workspace"]);
    expect(result.facets.colors).toEqual(["Blue", "Red"]);
  });

  it("filters by product brand", () => {
    const result = applyCatalogFilters(products, { brand: "Relay Works" });

    expect(result.products.map((x) => x.id)).toEqual([
      "mid-blue-desk",
      "premium-red-desk",
    ]);
    expect(result.total).toBe(2);
  });

  it("filters by multiple product brands", () => {
    const result = applyCatalogFilters(
      [
        ...products,
        product(
          "black-task-lamp",
          4900,
          "Lighting",
          "Black",
          "Lamp",
          "Lumina Works",
        ),
      ],
      { brand: ["Aeroform", "Relay Works"] },
    );

    expect(result.products.map((x) => x.id)).toEqual([
      "cheap-red-chair",
      "mid-blue-desk",
      "premium-red-desk",
    ]);
    expect(result.total).toBe(3);
  });

  it("sorts by price ascending and descending", () => {
    expect(
      applyCatalogFilters(products, { sort: "price-asc" }).products.map(
        (x) => x.id,
      ),
    ).toEqual(["cheap-red-chair", "mid-blue-desk", "premium-red-desk"]);
    expect(
      applyCatalogFilters(products, { sort: "price-desc" }).products.map(
        (x) => x.id,
      ),
    ).toEqual(["premium-red-desk", "mid-blue-desk", "cheap-red-chair"]);
  });

  it("sorts by name ascending", () => {
    expect(
      applyCatalogFilters(products, { sort: "name-asc" }).products.map(
        (x) => x.name,
      ),
    ).toEqual(["Cheap chair", "Desk", "Premium desk"]);
  });

  it("paginates filtered products without changing total", () => {
    const manyProducts = Array.from({ length: 25 }, (_, index) =>
      product(`product-${index + 1}`, 1000 + index, "Workspace", "Oak"),
    );

    const result = applyCatalogFilters(manyProducts, {
      page: "2",
      perPage: 12,
    });

    expect(result.products.map((x) => x.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `product-${index + 13}`),
    );
    expect(result.total).toBe(25);
    expect(result.pagination).toEqual({
      page: 2,
      perPage: 12,
      totalPages: 3,
    });
  });

  it("matches product brand in keyword search", () => {
    const result = applyCatalogFilters(
      [
        product("lamp", 4900, "Lighting", "Black", "Desk lamp", "Lumina Works"),
        product("chair", 14900, "Seating", "Green", "Task chair", "Aeroform"),
      ],
      { q: "lumina" },
    );

    expect(result.products.map((x) => x.id)).toEqual(["lamp"]);
  });
});
