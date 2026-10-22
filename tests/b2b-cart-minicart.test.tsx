import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import type { B2BState } from "@/lib/b2b/types";
import type { Cart } from "@/lib/types";

const mockB2B = vi.hoisted(() => ({
  state: null as B2BState | null,
  busy: false,
  error: "",
  reload: vi.fn(),
  act: vi.fn(),
}));

const mockMiniCart = vi.hoisted(() => ({
  cart: null as Cart | null,
  itemCount: 0,
  isOpen: false,
  openCart: vi.fn(),
  closeCart: vi.fn(),
  toggleCart: vi.fn(),
  setLineQuantity: vi.fn(),
}));

vi.mock("@/components/b2b/B2BProvider", () => ({
  useB2B: () => mockB2B,
}));

vi.mock("@/components/Toast", () => ({
  useToast: () => vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/commercetools-ui/atoms/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

import { B2BCart } from "@/components/b2b/B2BCart";
import { B2BHeaderCartButton } from "@/components/b2b/B2BMiniCart";

describe("B2B Cart & MiniCart", () => {
  beforeEach(() => {
    mockB2B.busy = false;
    mockB2B.error = "";
    mockB2B.act.mockReset();
    mockB2B.reload.mockReset();

    mockB2B.state = {
      configured: true,
      customer: { id: "cust-1", email: "test@example.com" },
      businessUnits: [
        {
          key: "unit-1",
          name: "Acme Industrial",
          stores: [{ key: "store-1", name: "Main Store" }],
          canManageAssociates: true,
        },
      ],
      context: {
        businessUnitKey: "unit-1",
        storeKey: "store-1",
        currency: "USD",
        country: "US",
        distributionChannelId: "dist-1",
      },
      products: [],
      cart: null,
    };
  });

  it("renders empty state when B2B cart has no lines", () => {
    const html = renderToStaticMarkup(<B2BCart />);
    expect(html).toContain("Your essentials are waiting.");
    expect(html).toContain("Explore products");
    expect(html).toContain('href="/b2b/products"');
  });

  it("renders cart lines, summary and checkout link when items exist", () => {
    mockB2B.state!.cart = {
      id: "cart-123",
      version: 1,
      mode: "b2b",
      itemCount: 2,
      lines: [
        {
          id: "line-1",
          productId: "prod-1",
          slug: "drill-press",
          sku: "DP-100",
          name: "Heavy Duty Drill Press",
          image: "/images/drill.jpg",
          quantity: 2,
          unitPrice: { centAmount: 15000, currencyCode: "USD", formatted: "$150.00" },
          total: { centAmount: 30000, currencyCode: "USD", formatted: "$300.00" },
        },
      ],
      subtotal: { centAmount: 30000, currencyCode: "USD", formatted: "$300.00" },
      discountTotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      taxTotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      total: { centAmount: 30000, currencyCode: "USD", formatted: "$300.00" },
      discountCodes: [],
    };

    const html = renderToStaticMarkup(<B2BCart />);
    expect(html).toContain("Heavy Duty Drill Press");
    expect(html).toContain("DP-100");
    expect(html).toContain("$150.00");
    expect(html).toContain("$300.00");
    expect(html).toContain('href="/checkout/b2b"');
    expect(html).toContain("Proceed to checkout");
    expect(html).toContain("Clear bag");
  });

  it("renders B2BHeaderCartButton with item count and badge", () => {
    mockB2B.state!.cart = {
      id: "cart-123",
      version: 1,
      mode: "b2b",
      itemCount: 5,
      lines: [],
      subtotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      discountTotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      taxTotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      total: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      discountCodes: [],
    };

    const html = renderToStaticMarkup(<B2BHeaderCartButton />);
    expect(html).toContain("5 items");
    expect(html).toContain("Purchasing bag");
  });
});
