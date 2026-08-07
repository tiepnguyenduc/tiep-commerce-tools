import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AccountPage from "../app/account/page";
import { AccountDashboard } from "../components/AccountAuth";

describe("account page", () => {
  it("shows only login and register forms before the customer is authenticated", () => {
    const html = renderToStaticMarkup(<AccountPage />);

    expect(html).toContain("Login / register");
    expect(html).toContain("Login customer");
    expect(html).toContain("Register");
    expect(html).not.toContain("Account training dashboard");
    expect(html).not.toContain("Recent orders");
    expect(html).not.toContain("Open approvals");
  });

  it("shows account sections after login without placeholder copy", () => {
    const html = renderToStaticMarkup(
      <AccountDashboard
        customer={{
          id: "customer-1",
          email: "tiep.nguyen+1@digitas.com",
          firstName: "Tiep",
          lastName: "Nguyen",
          addresses: [],
        }}
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
