import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocale, languageDisplayName, languagePreferenceKey, parseStorefrontLanguages, resolveStorefrontLanguage } from "../lib/storefront-languages";
import { loadStorefrontLanguages } from "../components/useStorefrontLanguages";

afterEach(() => vi.unstubAllGlobals());

describe("API-driven storefront languages", () => {
  it("preserves API order and full regional locale codes", () => {
    const locales = ["en-GB", "en-AU", "de-DE", "en-NZ", "en-GB"];
    expect(parseStorefrontLanguages({ languages: locales })).toEqual(["en-GB", "en-AU", "de-DE", "en-NZ"]);
    expect(parseStorefrontLanguages({ languages: [] })).toEqual([]);
  });
  it("rejects malformed response data instead of fabricating language options", () => {
    for (const data of [null, {}, { languages: "en" }, { languages: ["en-GB", 3] }, { languages: ["not_a_locale"] }]) {
      expect(() => parseStorefrontLanguages(data)).toThrow("load the available languages");
    }
  });
  it("validates saved full locale against this storefront's available languages", () => {
    expect(resolveStorefrontLanguage(["en-GB", "en-AU"], "en-AU")).toBe("en-AU");
    expect(resolveStorefrontLanguage(["en-GB", "en-AU"], "de-DE")).toBe("en-GB");
    expect(resolveStorefrontLanguage(["fr-FR", "en-GB"], null)).toBe("fr-FR");
    expect(resolveStorefrontLanguage([], "en-GB")).toBeNull();
    expect(isLocale('{"locale":"en"}')).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
  it("isolates saved B2B and B2C locales from each other and the country preference", () => {
    expect(languagePreferenceKey("b2b")).toBe("workshop-language-b2b");
    expect(languagePreferenceKey("b2c")).toBe("workshop-language-b2c");
    expect(languagePreferenceKey("b2b")).not.toBe(languagePreferenceKey("b2c"));
    expect(languagePreferenceKey("b2b")).not.toBe("workshop-market-preference");
  });
  it("gives regional languages meaningful distinct display names", () => {
    expect(languageDisplayName("en-GB")).toBe("English (United Kingdom)");
    expect(languageDisplayName("en-AU")).toBe("English (Australia)");
    expect(languageDisplayName("de-DE", "de")).toContain("Deutsch");
  });
  it("loads only the requested storefront endpoint with same-origin credentials", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ languages: ["fr-FR", "en-GB"] }) });
    vi.stubGlobal("fetch", request);
    expect(await loadStorefrontLanguages("/api/b2b/languages")).toEqual(["fr-FR", "en-GB"]);
    expect(request).toHaveBeenCalledWith("/api/b2b/languages", { credentials: "same-origin" });
    request.mockResolvedValue({ ok: false });
    await expect(loadStorefrontLanguages("/api/languages")).rejects.toThrow("load the available languages");
  });
});
