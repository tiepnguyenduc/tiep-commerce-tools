import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Product, ProductVariant } from "../lib/types";

vi.mock("../components/AddToCart", () => ({
  AddToCart: ({ quantity, sku }: any) => <button type="button">{`Add to cart ${sku} x${quantity}`}</button>,
}));
vi.mock("../components/AddToWishlist", () => ({
  AddToWishlist: () => <button type="button">Wishlist</button>,
}));
import { ProductStickyBar } from "../components/ProductStickyBar";

const variant: ProductVariant = {
  id: 2,
  sku: "ALC-01",
  key: "alc-01",
  image: "/chair-oak.jpg",
  images: ["/chair-oak.jpg"],
  price: { centAmount: 63750, currencyCode: "EUR", formatted: "€637.50" },
  originalPrice: { centAmount: 75000, currencyCode: "EUR", formatted: "€750.00" },
  attributes: [],
  specifications: [],
};

const product: Product = {
  id: "product-1",
  sku: "ALC-01",
  slug: "abigail-lounge-chair",
  name: "Abigail Lounge Chair",
  description: "A lounge chair",
  category: "Furniture",
  color: "Oak",
  image: "/chair.jpg",
  badges: [],
  price: variant.price,
  originalPrice: variant.originalPrice,
  variants: [variant],
};

const render = (overrides: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <ProductStickyBar
      product={product}
      variant={variant}
      meta="Oak · SKU ALC-01"
      quantity={3}
      onQuantityChange={() => undefined}
      {...overrides}
    />,
  );

describe("product sticky bar", () => {
  it("is served with the page instead of waiting for a scroll handler", () => {
    const html = render();

    expect(html).toContain("data-sticky-bar");
    // Always on: nothing here may be hidden from the keyboard or a screen reader.
    expect(html).not.toContain("inert=");
    expect(html).toContain('role="region"');
  });

  it("carries the selected variant, its price and the chosen quantity", () => {
    const html = render();

    expect(html).toContain("Abigail Lounge Chair");
    expect(html).toContain("Oak · SKU ALC-01");
    expect(html).toContain("€637.50");
    expect(html).toContain("€750.00");
    expect(html).toContain("Add to cart ALC-01 x3");
    expect(html).toContain("/chair-oak.jpg");
  });

  it("keeps to the purchase decision and leaves the tabs to the page", () => {
    const html = render();

    expect(html).not.toContain("Specifications");
    expect(html).not.toContain("Reviews");
  });
});
