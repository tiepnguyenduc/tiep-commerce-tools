import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { B2BAccountProfile } from "../lib/b2b/account-types";
const fixture = vi.hoisted(() => ({ path: "/b2b/account", customer: true }));
vi.mock("next/navigation", () => ({ usePathname: () => fixture.path }));
vi.mock("../components/b2b/B2BAccount", () => ({
  B2BAccount: ({ embedded }: { embedded?: boolean }) => (
    <div>
      {embedded ? "Company management" : "Sign in to your business account"}
    </div>
  ),
}));
vi.mock("../components/b2b/B2BProvider", () => ({
  useB2B: () => ({
    state: {
      customer: fixture.customer
        ? {
            id: "fixture-user",
            firstName: "Alex",
            lastName: "Morgan",
            email: "alex@example.test",
          }
        : null,
      context: { businessUnitKey: "fixture-company" },
    },
    busy: false,
  }),
}));
vi.mock("../components/useStorefrontCountries", () => ({
  useStorefrontCountries: () => ({
    countries: ["GB", "AU", "DE"],
    loading: false,
    error: false,
  }),
}));
const profile: B2BAccountProfile = {
  id: "fixture-user",
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex@example.test",
  companies: [
    {
      key: "fixture-company",
      name: "Example Equipment Ltd",
      roles: ["Buyer", "Company administrator"],
      stores: ["Equipment store"],
    },
  ],
  countries: ["GB", "AU", "DE"],
  defaultShippingAddressId: "fixture-address",
  defaultBillingAddressId: "fixture-address",
  addresses: [
    {
      id: "fixture-address",
      company: "Example Equipment Ltd",
      firstName: "Alex",
      lastName: "Morgan",
      streetName: "Example Street",
      streetNumber: "24",
      city: "London",
      postalCode: "SW1A 1AA",
      country: "GB",
      phone: "+44 20 0000 0000",
    },
  ],
};
vi.mock("../components/b2b/useB2BAccountProfile", () => ({
  useB2BAccountProfile: () => ({
    profile,
    loading: false,
    busy: false,
    message: "",
    actionError: "",
    submit: vi.fn(),
    retry: vi.fn(),
  }),
}));
import {
  addressFormPayload,
  B2BAccountWorkspace,
  B2BAccountDashboard,
  B2BAddressEditor,
  B2BAddressesPage,
  B2BProfilePage,
} from "../components/b2b/B2BAccountWorkspace";
beforeEach(() => {
  fixture.customer = true;
  fixture.path = "/b2b/account";
});
function exportPreview(name: string, html: string) {
  const target = process.env.B2B_ACCOUNT_PREVIEW_DIR;
  if (!target) return;
  mkdirSync(target, { recursive: true });
  const source = readFileSync(
    "components/b2b/B2BAccountWorkspace.module.css",
    "utf8",
  );
  const classes = new Map<string, string>();
  for (const [, names] of html.matchAll(/class="([^"]+)"/g))
    for (const name of names.split(" ")) {
      const match = /^_([^_]+)_/.exec(name);
      if (match) classes.set(match[1], name);
    }
  const css = source
    .replace(/:global\(([^)]+)\)/g, "$1")
    .replace(/\.([a-zA-Z][\w-]*)/g, (full, name) =>
      classes.has(name) ? `.${classes.get(name)}` : full,
    );
  const launchpad = readFileSync("app/launchpad.css", "utf8");
  const reset = launchpad.match(
    /#launchpad-storefront \.ct-ui,\s*#launchpad-storefront \.ct-ui \*\s*\{[^}]+\}/,
  )?.[0];
  if (!reset)
    throw new Error(
      "Expected Launchpad border reset for faithful account preview.",
    );
  writeFileSync(
    `${target}/${name}.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Account UI fixture preview</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f3ed;color:#30372a;font-family:Arial,sans-serif}a{color:inherit;text-decoration:none}button,input,select{font:inherit}.ct-ui input,.ct-ui select,.ct-ui button{font:inherit}svg{width:22px;height:22px}summary{cursor:pointer}.fixture-banner{padding:12px 28px;background:#303a2b;color:#fff;font-size:12px}${css}${reset}</style><body id="launchpad-storefront"><div class="fixture-banner">UI fixture preview · synthetic data only · no live account or mutations</div><div class="ct-ui">${html}</div></body></html>`,
  );
}
describe("B2B account UI", () => {
  it("renders My Wishlist inside the account sidebar shell", () => {
    fixture.path = "/b2b/wishlist";
    const html = renderToStaticMarkup(
      <B2BAccountWorkspace title="My Wishlist">
        <div>Wishlist management</div>
      </B2BAccountWorkspace>,
    );
    expect(html).toContain('aria-label="Account navigation"');
    expect(html).toMatch(
      /<a(?=[^>]*href="\/b2b\/wishlist")(?=[^>]*aria-current="page")[^>]*>/,
    );
    expect(html).toContain("Wishlist management");
  });

  it("renders working dashboard routes and preserves guest authentication", () => {
    const html = renderToStaticMarkup(<B2BAccountDashboard />);
    for (const path of [
      "/b2b/account/profile",
      "/b2b/account/addresses",
      "/b2b/account/company",
      "/b2b/wishlist",
    ])
      expect(html).toContain(`href="${path}"`);
    expect(html).not.toContain("/approvals");
    exportPreview("dashboard", html);
    fixture.customer = false;
    expect(renderToStaticMarkup(<B2BAccountDashboard />)).toContain(
      "Sign in to your business account",
    );
  });
  it("shows actual company roles, defaults and gated destructive form", () => {
    fixture.path = "/b2b/account/profile";
    const html = renderToStaticMarkup(<B2BProfilePage />);
    expect(html).toContain("Example Equipment Ltd");
    expect(html).toContain("Company administrator");
    expect(html).toContain("Default shipping address");
    expect(html).toContain("Default billing address");
    expect(html).toContain("cannot be undone");
    expect(html).toMatch(/disabled=""[^>]*>Permanently delete account/);
    expect(html).toContain('name="password"');
    exportPreview("profile", html);
  });
  it("shows company and default badges in the personal address book", () => {
    fixture.path = "/b2b/account/addresses";
    const html = renderToStaticMarkup(<B2BAddressesPage />);
    expect(html).toContain("Example Equipment Ltd");
    expect(html).toContain("Default shipping");
    expect(html).toContain("separate from shared business unit addresses");
    expect(html).toContain("/b2b/account/addresses/fixture-address/edit");
    exportPreview("addresses", html);
  });
  it("requires company name and round-trips existing address values", () => {
    fixture.path = "/b2b/account/addresses/fixture-address/edit";
    const html = renderToStaticMarkup(
      <B2BAddressEditor id="fixture-address" />,
    );
    expect(html).toMatch(
      /<input(?=[^>]*name="company")(?=[^>]*required="")(?=[^>]*value="Example Equipment Ltd")[^>]*>/,
    );
    expect(html).toContain('name="firstName"');
    expect(html).toContain('value="SW1A 1AA"');
    expect(html).toContain('value="GB"');
    exportPreview("edit-address", html);
    exportPreview("new-address", renderToStaticMarkup(<B2BAddressEditor />));
  });
  it("sends required company and checkbox states to the account API", () => {
    const form = new FormData();
    for (const [name, value] of Object.entries({
      company: " Example Ltd ",
      firstName: "Alex",
      lastName: "Morgan",
      streetName: "Street",
      city: "City",
      postalCode: "123",
      country: "GB",
      defaultShipping: "on",
    }))
      form.set(name, value);
    expect(addressFormPayload(form, "address-id")).toMatchObject({
      action: "save-address",
      address: { id: "address-id", company: "Example Ltd" },
      defaultShipping: true,
      defaultBilling: false,
    });
    form.set("company", " ");
    expect(() => addressFormPayload(form)).toThrow("Company name");
  });
});
