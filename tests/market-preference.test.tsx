import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_MARKET, MARKETS, parseMarketPreference } from "../lib/market-preference";
import { StorefrontAnnouncement } from "../components/StorefrontAnnouncement";

describe("market presentation preference", () => {
  it("accepts only supported preferences and recovers from malformed storage", () => {
    expect(parseMarketPreference("de")).toBe("de");
    expect(parseMarketPreference("en")).toBe("en");
    for (const value of [null, "", "fr", '{"country":"DE"}', "undefined", "__proto__"]) {
      expect(parseMarketPreference(value)).toBe(DEFAULT_MARKET);
    }
  });

  it("uses the project's country, currency, and language mappings", () => {
    expect(MARKETS.map(({ key, countryCode, currency, locale }) => ({ key, countryCode, currency, locale }))).toEqual([
      { key: "en", countryCode: "US", currency: "USD", locale: "en-US" },
      { key: "de", countryCode: "DE", currency: "EUR", locale: "de-DE" },
    ]);
  });
});

describe("shared storefront announcement", () => {
  it.each([
    { business: false, catalog: "/products", otherStore: "/b2b" },
    { business: true, catalog: "/b2b/products", otherStore: "/" },
  ])("renders valid catalog and cross-store links for business=$business", ({ business, catalog, otherStore }) => {
    const html = renderToStaticMarkup(<StorefrontAnnouncement business={business} />);
    expect(html).toContain(`href="${catalog}"`);
    expect(html).toContain(`href="${otherStore}"`);
    expect(html).toContain("Explore this season’s");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Language: Language");
    expect(html).not.toContain("/de-DE");
    expect(html).not.toContain('type="radio"');
  });
});
