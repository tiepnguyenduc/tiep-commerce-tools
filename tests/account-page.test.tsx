import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountAuth, AccountDashboard } from "../components/AccountAuth";

const customer = {
  id: "customer-1",
  email: "tiep.nguyen+1@digitas.com",
  firstName: "Tiep",
  lastName: "Nguyen",
  addresses: [],
};

const readCustomerProfile = vi.hoisted(() => vi.fn());
const readCustomerOrderDetail = vi.hoisted(() => vi.fn());
vi.mock("../lib/ct/account", () => ({
  readCustomerOrderDetail,
  readCustomerProfile,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a {...props} href={href}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("account page", () => {
  it("server-renders the dashboard when the session already has a customer", async () => {
    readCustomerProfile.mockResolvedValueOnce(customer);
    const { default: Page } = await import("../app/account/page");

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("Account Dashboard");
    expect(html).not.toContain("Login / register");
  });

  it("server-renders the login form when there is no session", async () => {
    readCustomerProfile.mockRejectedValueOnce(
      new Error("Customer login required."),
    );
    const { default: Page } = await import("../app/account/page");

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("Login / register");
    expect(html).not.toContain("Account Dashboard");
  });

  it("server-renders the requested account URL instead of falling back to dashboard", async () => {
    readCustomerProfile.mockResolvedValueOnce(customer);
    const { default: Page } = await import("../app/account/[page]/page");

    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ page: "wishlist" }) }),
    );

    expect(html).toContain("My Wishlist");
    expect(html).toContain("Loading wishlist");
    expect(html).not.toContain("Contact Information");
  });

  it("server-renders an order at /account/orders/[orderId]", async () => {
    readCustomerProfile.mockResolvedValueOnce(customer);
    readCustomerOrderDetail.mockResolvedValueOnce({
      id: "order-1",
      orderNumber: "100000001",
      createdAt: "2026-08-07T00:00:00.000Z",
      orderState: "Open",
      lineCount: 1,
      lines: [],
      itemsTotal: {
        centAmount: 5000,
        currencyCode: "USD",
        formatted: "$50.00",
      },
      total: {
        centAmount: 5000,
        currencyCode: "USD",
        formatted: "$50.00",
      },
    });
    const { default: Page } = await import(
      "../app/account/orders/[orderId]/page"
    );

    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ orderId: "order-1" }) }),
    );

    expect(html).toContain("My Orders");
    expect(html).toContain("Order #100000001");
    expect(readCustomerOrderDetail).toHaveBeenCalledWith("order-1");
  });

  it("shows only login and register forms before the customer is authenticated", () => {
    const html = renderToStaticMarkup(<AccountAuth initialCustomer={null} />);

    expect(html).toContain("Login / register");
    expect(html).toContain("Login customer");
    expect(html).toContain("Register");
    expect(html).not.toContain("Account training dashboard");
    expect(html).not.toContain("Recent orders");
    expect(html).not.toContain("Open approvals");
  });

  it("renders the account dashboard on the first paint for a signed-in customer", () => {
    const html = renderToStaticMarkup(
      <AccountAuth initialCustomer={customer} />,
    );

    expect(html).toContain("My Account");
    expect(html).toContain("Account Dashboard");
    expect(html).not.toContain("Login / register");
    expect(html).not.toContain("Login customer");
  });

  it("shows account sections after login without placeholder copy", () => {
    const html = renderToStaticMarkup(
      <AccountDashboard
        customer={customer}
        onLogout={() => {}}
        status="Live customer ready: tiep.nguyen+1@digitas.com"
      />,
    );

    expect(html).toContain("My account");
    expect(html).toContain("Profile");
    expect(html).toContain("Addresses");
    expect(html).toContain("Orders");
    expect(html).not.toContain("In production");
    expect(html).not.toContain("protected BFF endpoints");
  });

  it("renders linked location selects on the address page", () => {
    const html = renderToStaticMarkup(
      <AccountAuth initialCustomer={customer} initialPage="addresses" />,
    );

    expect(html).toContain('name="country"');
    expect(html).toContain('name="region"');
    expect(html).toContain("State / Region");
    expect(html).toContain('name="city"');
    expect(html).toContain('name="postalCode"');
    expect(html).toContain('placeholder="Enter postal code"');
    expect(html).not.toContain("<datalist");
    expect(html).not.toMatch(/name="postalCode"[^>]*\slist=/);
    expect(html).toContain("All four fields stay matched");
  });
});
