import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { businessCatalogUrl, businessCategories, filterBusinessProducts } from "../lib/b2b/catalog-navigation";
import type { B2BProduct } from "../lib/b2b/types";

const navigation = vi.hoisted(() => ({ pathname: "/b2b/products", query: new URLSearchParams(), categories: [] as any[], loading: false, error: false }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useSearchParams: () => navigation.query }));
vi.mock("../components/b2b/useB2BNavigation", () => ({ useB2BNavigation: () => ({ ...navigation, retry: () => {} }) }));
import { B2BHeaderNavigation, B2BHeaderSearch } from "../components/b2b/B2BHeaderNavigation";

const products = [
  { id: "1", name: "Quarry Loader", category: "Loaders & parts", categoryIds: ["loader", "equipment"], variants: [{ sku: "QL-100" }] },
  { id: "2", name: "Compact Loader", category: "Loaders & parts", categoryIds: ["loader", "equipment"], variants: [{ sku: "CL-200" }] },
  { id: "3", name: "Mining Drill", category: "Drilling", categoryIds: ["drilling", "equipment"], variants: [{ sku: "MD-300" }] },
] as B2BProduct[];

beforeEach(() => {
  navigation.pathname = "/b2b/products";
  navigation.query = new URLSearchParams();
  navigation.categories = [{ id: "equipment", name: "Equipment", slug: "equipment", children: [
    { id: "drilling", name: "Drilling", slug: "drilling", children: [] },
    { id: "loader", name: "Loaders & parts", slug: "loaders", children: [] },
  ] }];
  navigation.loading = false;
  navigation.error = false;
});

describe("B2B catalog navigation", () => {
  it("derives distinct product filter labels from the supplied store assortment", () => {
    expect(businessCategories([...products, { category: "" }, { category: "  " }])).toEqual(["Drilling", "Loaders & parts"]);
    expect(businessCategories([products[2]])).toEqual(["Drilling"]);
    expect(businessCategories([])).toEqual([]);
  });
  it("encodes stable category IDs, labels, and query values", () => {
    expect(businessCatalogUrl({ categoryId: "loader", category: "Loaders & parts", q: "  QL-100  " })).toBe("/b2b/products?categoryId=loader&category=Loaders+%26+parts&q=QL-100");
    expect(businessCatalogUrl()).toBe("/b2b/products");
  });
  it("intersects categories with name or SKU searches and retains legacy label-only links", () => {
    expect(filterBusinessProducts(products, "Loaders & parts", " ql-100 ").map((item) => item.id)).toEqual(["1"]);
    expect(filterBusinessProducts(products, "Drilling", "loader")).toEqual([]);
    expect(filterBusinessProducts(products, "", "MINING").map((item) => item.id)).toEqual(["3"]);
  });
  it("filters using direct or ancestor IDs regardless of the displayed category label", () => {
    expect(filterBusinessProducts(products, "Heavy equipment", "", "equipment")).toHaveLength(3);
    expect(filterBusinessProducts(products, "Bohrgeräte", "", "drilling").map((item) => item.id)).toEqual(["3"]);
    expect(filterBusinessProducts(products, "Drilling", "", "other-id")).toEqual([]);
  });
  it("reflects consecutive query changes in category links", () => {
    navigation.query = new URLSearchParams("categoryId=drilling&category=Drilling");
    let html = renderToStaticMarkup(<B2BHeaderNavigation />);
    expect(html).toContain('aria-current="page" href="/b2b/products?categoryId=drilling&amp;category=Drilling"');
    navigation.query = new URLSearchParams("categoryId=loader&category=Loaders+%26+parts");
    html = renderToStaticMarkup(<B2BHeaderNavigation />);
    expect(html).toContain('aria-current="page" href="/b2b/products?categoryId=loader&amp;category=Loaders+%26+parts"');
    expect(html).not.toContain('aria-current="page" href="/b2b/products?categoryId=drilling&amp;category=Drilling"');
  });
  it("keeps the active category ID and label when submitting catalog search", () => {
    navigation.query = new URLSearchParams("categoryId=drilling&category=Drilling&q=MD-300");
    const html = renderToStaticMarkup(<B2BHeaderSearch />);
    expect(html).toContain('name="categoryId" value="drilling"');
    expect(html).toContain('name="category" value="Drilling"');
    expect(html).toContain('value="MD-300"');
  });
  it("renders API categories with disclosure semantics and explicit loading/error states", () => {
    let html = renderToStaticMarkup(<B2BHeaderNavigation />);
    expect(html).toContain("Equipment");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls=');
    navigation.categories = [];
    navigation.loading = true;
    expect(renderToStaticMarkup(<B2BHeaderNavigation />)).toContain("Loading categories…");
    navigation.loading = false;
    navigation.error = true;
    expect(renderToStaticMarkup(<B2BHeaderNavigation />)).toContain("Try again");
    navigation.error = false;
    expect(renderToStaticMarkup(<B2BHeaderNavigation />)).toContain("No categories are available yet.");
  });
});
