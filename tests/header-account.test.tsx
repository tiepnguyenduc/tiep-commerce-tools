import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  customerAuthChangeEvent,
  customerDisplayName,
  HeaderAccountLink,
  publishCustomerAuthChange,
} from "../components/HeaderAccountLink";
import type { CustomerProfile } from "../lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a {...props} href={href}>
      {children}
    </a>
  ),
}));

const customer: CustomerProfile = {
  id: "customer-1",
  email: "tiep@example.com",
  firstName: "Tiep",
  lastName: "Nguyen",
  addresses: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("header account link", () => {
  it("shows Login / Register for an anonymous customer", () => {
    const html = renderToStaticMarkup(
      <HeaderAccountLink initialCustomer={null} />,
    );

    expect(html).toContain("Login / Register");
    expect(html).toContain('href="/account"');
  });

  it("shows the full customer name when authenticated", () => {
    const html = renderToStaticMarkup(
      <HeaderAccountLink initialCustomer={customer} />,
    );

    expect(html).toContain("Tiep Nguyen");
    expect(html).not.toContain("Login / Register");
  });

  it("falls back to the customer email when no name is available", () => {
    expect(
      customerDisplayName({ ...customer, firstName: undefined, lastName: undefined }),
    ).toBe("tiep@example.com");
  });

  it("publishes customer changes for immediate header updates", () => {
    const eventTarget = new EventTarget();
    const listener = vi.fn();
    eventTarget.addEventListener(customerAuthChangeEvent, listener);
    vi.stubGlobal("window", eventTarget);

    publishCustomerAuthChange(customer);

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual(customer);
  });
});
