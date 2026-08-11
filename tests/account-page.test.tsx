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
vi.mock("../lib/ct/account", () => ({ readCustomerProfile }));

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
});
