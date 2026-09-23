import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { categoryUrl, toLaunchpadCategoryTree } from "../lib/mappers/launchpad-category";
import type { HeaderCategory } from "../lib/types";

const query = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => query.params }));
vi.mock("../components/commercetools-ui/atoms/link", () => ({
  default: ({ link, children, ...props }: any) => (
    <a {...props} href={link}>
      {children}
    </a>
  ),
}));

import { HeaderCategoryNavigation } from "../components/HeaderCategoryNavigation";
import { HeaderMobileCategoryMenu } from "../components/HeaderMobileCategoryMenu";

const catalog: HeaderCategory[] = [
  { id: "living", name: "Living", slug: "living" },
  { id: "sofas", name: "Sofas & Chairs", slug: "sofas", parentId: "living" },
  { id: "two-seaters", name: "Two seaters", slug: "two-seaters", parentId: "sofas" },
  { id: "lighting", name: "Lighting", slug: "lighting" },
];

beforeEach(() => {
  query.params = new URLSearchParams();
});

describe("category tree mapping", () => {
  it("nests the flat BFF categories and keeps the listing URL", () => {
    const [living, lighting] = toLaunchpadCategoryTree(catalog);

    expect([living.name, lighting.name]).toEqual(["Living", "Lighting"]);
    expect(living.descendants?.map((category) => category.name)).toEqual(["Sofas & Chairs"]);
    expect(living.descendants?.[0].descendants?.map((category) => category.depth)).toEqual([3]);
    expect(living._url).toBe("/products?categoryId=living&category=Living");
    expect(living.descendants?.[0]._url).toBe(categoryUrl({ id: "sofas", name: "Sofas & Chairs" }));
  });

  it("keeps categories reachable when a parent is missing or the chain loops", () => {
    const tree = toLaunchpadCategoryTree([
      { id: "orphan", name: "Orphan", slug: "orphan", parentId: "not-in-response" },
      { id: "a", name: "A", slug: "a", parentId: "b" },
      { id: "b", name: "B", slug: "b", parentId: "a" },
    ]);

    expect(tree.map((category) => category.name).sort()).toEqual(["A", "B", "Orphan"]);
  });
});

describe("desktop category navigation", () => {
  it("renders a closed flyout per category with a shop all shortcut", () => {
    const html = renderToStaticMarkup(<HeaderCategoryNavigation categories={toLaunchpadCategoryTree(catalog)} />);

    expect(html).toContain("Living");
    expect(html).toContain("Shop all Living");
    expect(html).toContain('aria-expanded="false"');
    // The closed flyout stays in the markup so it can transition, but is inert.
    expect(html).toContain("inert=");
    // Lighting has no children, so it gets a link without a disclosure button.
    expect(html.match(/aria-expanded/g)).toHaveLength(1);
  });

  it("collects categories beyond the inline budget into a single More flyout", () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      id: `c${index}`,
      name: `Category ${index}`,
      slug: `c${index}`,
    }));

    const html = renderToStaticMarkup(
      <HeaderCategoryNavigation categories={toLaunchpadCategoryTree(many)} maxInlineItems={7} />,
    );

    expect(html).toContain(">More<");
    expect(html).toContain("Category 8");
    expect(html.match(/data-menu=/g)).toHaveLength(8);
  });

  it("marks the listed category and its ancestors as current", () => {
    query.params = new URLSearchParams("categoryId=two-seaters&category=Two+seaters");
    const html = renderToStaticMarkup(<HeaderCategoryNavigation categories={toLaunchpadCategoryTree(catalog)} />);

    expect(html).toContain('data-active="true"');
    expect(html).toContain('aria-current="page"');
  });
});

describe("mobile category navigation", () => {
  it("offers a drill-down for parents and a direct link for leaves", () => {
    const html = renderToStaticMarkup(<HeaderMobileCategoryMenu categories={toLaunchpadCategoryTree(catalog)} />);

    expect(html).toContain("Shop by category");
    expect(html).toContain('aria-label="Show Living subcategories"');
    expect(html).toContain('type="button"');
    expect(html).toContain('href="/products?categoryId=lighting&amp;category=Lighting"');
    // Only the current level is rendered, so deeper categories stay out of the drawer.
    expect(html).not.toContain("Two seaters");
  });
});
