import { describe, expect, it } from "vitest";
import { applyCatalogFilters } from "../lib/catalog-filters";
import type { Product } from "../lib/types";

function product(
  id: string,
  centAmount: number,
  category: string,
  color: string,
  name = id,
): Product {
  return {
    id,
    slug: id,
    sku: id.toUpperCase(),
    name,
    description: `${category} ${color}`,
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
  product("cheap-red-chair", 2400, "Seating", "Red", "Cheap chair"),
  product("mid-blue-desk", 7500, "Workspace", "Blue", "Desk"),
  product("premium-red-desk", 25000, "Workspace", "Red", "Premium desk"),
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
    expect(result.facets.categories).toEqual(["Seating", "Workspace"]);
    expect(result.facets.colors).toEqual(["Blue", "Red"]);
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
});
