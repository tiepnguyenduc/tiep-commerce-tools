import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProductTabs from "../components/commercetools-ui/organisms/product/product-tabs";
import SpecificationTable from "../components/commercetools-ui/organisms/product/product-tabs/components/specification-table";

const tabs = [
  { id: "description", label: "Description", content: <p>Full description</p> },
  { id: "specifications", label: "Specifications", content: <p>Attribute table</p> },
  { id: "reviews", label: "Reviews", count: 3, content: <p>Review list</p> },
];

const render = (activeId: string) =>
  renderToStaticMarkup(<ProductTabs tabs={tabs} activeId={activeId} onChange={() => {}} />);

describe("product tabs", () => {
  it("renders every tab but only the active panel", () => {
    const html = render("description");
    expect(html).toContain("Description");
    expect(html).toContain("Specifications");
    expect(html).toContain("Reviews");
    expect(html).toContain("Full description");
    expect(html).not.toContain("Attribute table");
    expect(html).not.toContain("Review list");
  });

  it("wires the selected tab to its panel for assistive tech", () => {
    const html = render("reviews");
    expect(html).toContain('id="product-tab-reviews"');
    expect(html).toContain('aria-controls="product-tabpanel-reviews"');
    expect(html).toContain('id="product-tabpanel-reviews"');
    expect(html).toContain('aria-labelledby="product-tab-reviews"');
    // Roving tabindex: only the selected tab is reachable with Tab.
    expect(html.match(/tabindex="0"/g)).toHaveLength(2); // selected tab + panel
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
  });

  it("falls back to the first tab when the active id is unknown", () => {
    expect(render("missing")).toContain("Full description");
  });

  it("shows the review count as a chip", () => {
    expect(render("description")).toMatch(/Reviews.*>3</s);
  });
});

describe("specification table", () => {
  it("lists every label and value", () => {
    const html = renderToStaticMarkup(
      <SpecificationTable
        specifications={[
          { name: "sku", label: "SKU", value: "ADCT-01" },
          { name: "finish", label: "Finish", value: "Gold" },
        ]}
      />,
    );
    expect(html).toContain("SKU");
    expect(html).toContain("ADCT-01");
    expect(html).toContain("Finish");
    expect(html).toContain("Gold");
  });

  it("explains an empty attribute set instead of rendering an empty table", () => {
    const html = renderToStaticMarkup(<SpecificationTable specifications={[]} />);
    expect(html).toContain("No specifications are published");
    expect(html).not.toContain("<dl");
  });
});
