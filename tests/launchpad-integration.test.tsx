import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Input from "../components/commercetools-ui/atoms/input";
import QuantitySelector from "../components/commercetools-ui/atoms/quantity-selector";
import { toLaunchpadTileProduct } from "../lib/mappers/launchpad-product";
import type { Product } from "../lib/types";

const product: Product = {
  id: "product-1", sku: "selected-sku", slug: "desk", name: "Desk",
  description: "Desk", category: "Furniture", color: "Oak", image: "/desk.jpg", badges: [],
  price: { centAmount: 8000, currencyCode: "EUR", formatted: "€80.00" },
  originalPrice: { centAmount: 10000, currencyCode: "EUR", formatted: "€100.00" },
};

describe("Launchpad storefront integration", () => {
  it("keeps the BFF selected SKU, URL, currency and discounted price", () => {
    const tile = toLaunchpadTileProduct(product);
    expect(tile._url).toBe("/products/desk");
    expect(tile.variants).toHaveLength(1);
    expect(tile.variants[0].sku).toBe("selected-sku");
    expect(tile.variants[0].price).toEqual(product.originalPrice);
    expect(tile.variants[0].discountedPrice?.value).toEqual(product.price);
    expect(tile.variants[0].images).toEqual(["/desk.jpg"]);
    expect(tile.variants[0].isOnStock).toBeUndefined();
  });

  it("does not invent a discount for a normal price", () => {
    const tile = toLaunchpadTileProduct({ ...product, originalPrice: undefined });
    expect(tile.variants[0].price).toEqual(product.price);
    expect(tile.variants[0].discountedPrice).toBeUndefined();
  });

  it("keeps labels unique across repeated forms and respects explicit IDs", () => {
    const html = renderToStaticMarkup(<><Input name="email" label="Email" /><Input name="email" label="Email" /><Input id="shipping-email" label="Shipping email" /></>);
    const labels = [...html.matchAll(/for="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(labels).size).toBe(3);
    expect(labels).toContain("shipping-email");
    for (const label of labels) expect(html).toContain(`id="${label}"`);
  });

  it("quantity buttons never submit forms and respect disabled state", () => {
    const html = renderToStaticMarkup(<QuantitySelector value={1} minValue={1} disabled />);
    expect(html.match(/type="button"/g)).toHaveLength(2);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Decrease quantity"');
    expect(html).toContain('aria-label="Increase quantity"');
  });
});
