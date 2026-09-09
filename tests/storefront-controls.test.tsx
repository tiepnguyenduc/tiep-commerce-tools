import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Checkbox from "../components/commercetools-ui/atoms/checkbox";
import Radio from "../components/commercetools-ui/atoms/radio";
import Dropdown from "../components/commercetools-ui/atoms/dropdown/default-dropdown";
import { toLaunchpadCartItem } from "../lib/mappers/launchpad-cart";
import type { CartLine } from "../lib/types";

describe("storefront UI data and form boundaries", () => {
  it("preserves line ID, SKU, count and BFF money without inventing stock", () => {
    const line = { id: "line", productId: "product", slug: "chair", sku: "chair-blue", name: "Blue chair", image: "/chair.png", quantity: 2,
      unitPrice: { centAmount: 1200, currencyCode: "EUR", formatted: "€12.00" },
      total: { centAmount: 2100, currencyCode: "EUR", formatted: "€21.00" } } as CartLine;
    const item = toLaunchpadCartItem(line);
    expect(item).toMatchObject({ lineItemId: "line", count: 2, price: line.unitPrice, totalPrice: line.total, _url: "/products/chair", variant: { sku: "chair-blue" } });
    expect(item.variant?.isOnStock).toBeUndefined();
  });
  it("retains native names, disabled states and selected filter defaults", () => {
    const html = renderToStaticMarkup(<form>
      <Checkbox name="brand" value="demo" defaultChecked disabled />
      <Radio name="price" value="low" defaultChecked />
      <Dropdown name="sort" defaultValue="price"><option value="name">Name</option><option value="price">Price</option></Dropdown>
    </form>);
    expect(html).toMatch(/name="brand"/);
    expect(html).toContain('disabled=""');
    expect(html).toContain('name="price"');
    expect(html).toMatch(/<option value="price" selected="">Price/);
  });
});
