import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCart, updateCart } from "../lib/cart-engine";
import type { Cart } from "../lib/types";

const state = vi.hoisted(() => ({
  cart: null as Cart | null,
  loading: false,
  loadError: "",
  loadCart: vi.fn(),
  syncCart: vi.fn(),
}));
vi.mock("../components/MiniCart", () => ({ useMiniCart: () => state }));
vi.mock("../components/Toast", () => ({ useToast: () => vi.fn() }));
vi.mock("../components/RecentlyViewedProducts", () => ({
  useRecentlyViewedProducts: () => [],
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
vi.mock("../components/commercetools-ui/atoms/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));
import { CartView } from "../components/CartView";

beforeEach(() => {
  state.cart = null;
  state.loading = false;
  state.loadError = "";
});
describe("cart page shared state", () => {
  it.each(["b2c", "b2b"] as const)(
    "preserves %s checkout route and server total",
    (mode) => {
      state.cart = updateCart(emptyCart(mode), "p1", 2);
      state.cart.total = {
        centAmount: 45678,
        currencyCode: "EUR",
        formatted: "€456.78",
      };
      const html = renderToStaticMarkup(<CartView />);
      expect(html).toContain(`href="/checkout/${mode}"`);
      expect(html).toContain("€456.78");
      expect(html).toContain(state.cart.lines[0].name);
    },
  );
  it("does not offer checkout for an empty cart", () => {
    state.cart = emptyCart();
    const html = renderToStaticMarkup(<CartView />);
    expect(html).not.toContain('href="/checkout/');
    expect(html).toContain('href="/products"');
  });
  it("renders a recoverable load failure instead of an endless loading state", () => {
    state.loadError = "Could not load your cart. Please try again.";
    const html = renderToStaticMarkup(<CartView />);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('href="/checkout/');
  });
});
