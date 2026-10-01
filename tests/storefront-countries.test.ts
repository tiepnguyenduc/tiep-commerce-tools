import { afterEach, describe, expect, it, vi } from "vitest";
import { countryDisplayName, countryFlag, countryPreferenceKey, isCountryCode, parseStorefrontCountries, resolveStorefrontCountry } from "../lib/storefront-countries";
import { loadStorefrontCountries } from "../components/useStorefrontCountries";

afterEach(() => vi.unstubAllGlobals());
describe("storefront country preferences", () => {
  it("parses only API country options, preserving order and empty results", () => {
    expect(parseStorefrontCountries({ countries: ["GB", "DE", "US", "ES", "FR", "GB"] })).toEqual(["GB", "DE", "US", "ES", "FR"]);
    expect(parseStorefrontCountries({ countries: [] })).toEqual([]);
    for (const data of [null, {}, { countries: "US" }, { countries: ["US", 4] }, { countries: ["USA"] }]) expect(() => parseStorefrontCountries(data)).toThrow("load the available countries");
  });
  it("validates saved country against each project's configured list", () => {
    expect(resolveStorefrontCountry(["GB", "DE"], "DE")).toBe("DE");
    expect(resolveStorefrontCountry(["GB", "DE"], "US")).toBe("GB");
    expect(resolveStorefrontCountry(["FR", "US"], null)).toBe("FR");
    expect(resolveStorefrontCountry([], "US")).toBeNull();
    for (const invalid of [null, "de", "en-GB", '{"country":"US"}', "USA"]) expect(isCountryCode(invalid)).toBe(false);
  });
  it("isolates B2B country, B2C country and language storage", () => {
    expect(countryPreferenceKey("b2b")).toBe("workshop-country-b2b");
    expect(countryPreferenceKey("b2c")).toBe("workshop-country-b2c");
    expect(countryPreferenceKey("b2b")).not.toBe(countryPreferenceKey("b2c"));
    expect(countryPreferenceKey("b2b")).not.toBe("workshop-language-b2b");
  });
  it("renders region names and flags without assigning currencies", () => {
    expect(countryDisplayName("GB")).toBe("United Kingdom");
    expect(countryDisplayName("DE", "de")).toBe("Deutschland");
    expect(countryFlag("GB")).toBe("🇬🇧");
    expect(countryFlag("FR")).toBe("🇫🇷");
    expect(countryFlag("bad")).toBe("");
  });
  it("loads the requested endpoint and rejects failures instead of inventing countries", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ countries: ["GB", "FR"] }) });
    vi.stubGlobal("fetch", request);
    expect(await loadStorefrontCountries("/api/b2b/countries")).toEqual(["GB", "FR"]);
    expect(request).toHaveBeenCalledWith("/api/b2b/countries", { credentials: "same-origin" });
    request.mockResolvedValue({ ok: false });
    await expect(loadStorefrontCountries("/api/countries")).rejects.toThrow("load the available countries");
  });
});
