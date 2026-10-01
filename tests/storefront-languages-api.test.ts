import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getApiRoot: vi.fn(), getB2BApiRoot: vi.fn() }));
vi.mock("../lib/ct/client", () => mocks);
import { canonicalStorefrontLocale, projectLanguages } from "../lib/ct/storefront-languages";
import { GET as businessLanguages } from "../app/api/b2b/languages/route";
import { GET as retailLanguages } from "../app/api/languages/route";
import { GET as navigation } from "../app/api/b2b/navigation/route";
beforeEach(() => vi.resetAllMocks());
describe("API project languages", () => {
  it("retains all ten project locales and regional distinctions in API order", () => {
    const languages = ["en-US", "de-DE", "en-GB", "en-AU", "fr-FR", "es-ES", "it-IT", "nl-NL", "pt-BR", "ja-JP"];
    expect(projectLanguages([...languages, "en-us", null, "bad_locale", 1])).toEqual(languages);
    expect(projectLanguages(undefined)).toEqual([]);
    expect(canonicalStorefrontLocale("zh-Hant-TW")).toBe("zh-Hant-TW");
  });
  it("reads only the B2B project's languages and exposes no project metadata", async () => {
    const execute = vi.fn().mockResolvedValue({ body: { languages: ["en-GB", "en-AU"], key: "private-project", name: "Private config" } });
    mocks.getB2BApiRoot.mockReturnValue({ get: () => ({ execute }) });
    const response = await businessLanguages();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ languages: ["en-GB", "en-AU"] });
    expect(mocks.getApiRoot).not.toHaveBeenCalled();
  });
  it("reads B2C languages from its own project", async () => {
    mocks.getApiRoot.mockReturnValue({ get: () => ({ execute: async () => ({ body: { languages: ["fr-FR"] } }) }) });
    expect(await (await retailLanguages()).json()).toEqual({ languages: ["fr-FR"] });
    expect(mocks.getB2BApiRoot).not.toHaveBeenCalled();
  });
  it("does not invent language options on empty or failed API responses", async () => {
    mocks.getB2BApiRoot.mockReturnValue({ get: () => ({ execute: async () => ({ body: { languages: [] } }) }) });
    expect(await (await businessLanguages()).json()).toEqual({ languages: [] });
    mocks.getB2BApiRoot.mockReturnValue(null);
    expect((await businessLanguages()).status).toBe(503);
    mocks.getB2BApiRoot.mockImplementation(() => { throw new Error("secret config"); });
    const response = await businessLanguages();
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret");
  });
  it("localizes navigation with full locales beyond English and German", async () => {
    mocks.getB2BApiRoot.mockReturnValue({ categories: () => ({ get: () => ({ execute: async () => ({ body: { results: [{ id: "c", name: { "en-GB": "British equipment", "en-AU": "Australian equipment", "fr-FR": "Équipement" }, slug: { "fr-FR": "equipement" }, orderHint: "0.5" }] } }) }) }) });
    for (const [locale, name] of [["fr-FR", "Équipement"], ["en-GB", "British equipment"], ["en-AU", "Australian equipment"]]) {
      const response = await navigation(new Request(`http://localhost/api/b2b/navigation?locale=${locale}`));
      expect((await response.json()).categories[0].name).toBe(name);
    }
    const response = await navigation(new Request("http://localhost/api/b2b/navigation?locale=bad_locale"));
    expect(response.status).toBe(400);
  });
});
