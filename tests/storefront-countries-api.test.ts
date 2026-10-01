import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getApiRoot: vi.fn(), getB2BApiRoot: vi.fn() }));
vi.mock("../lib/ct/client", () => mocks);
import { projectCountries } from "../lib/ct/storefront-countries";
import { GET as businessCountries } from "../app/api/b2b/countries/route";
import { GET as retailCountries } from "../app/api/countries/route";

beforeEach(() => vi.resetAllMocks());
describe("project countries API", () => {
  it("keeps the entire API country list in order, normalizes codes and excludes invalid values", () => {
    expect(projectCountries(["GB", "DE", "US", "ES", "FR", "gb", null, "USA", "", 2])).toEqual(["GB", "DE", "US", "ES", "FR"]);
    expect(projectCountries(undefined)).toEqual([]);
  });
  it("reads only the B2B project's countries and exposes no project metadata or currencies", async () => {
    const execute = vi.fn().mockResolvedValue({ body: { countries: ["GB", "DE", "US", "ES", "FR"], currencies: ["EUR"], key: "private-project" } });
    mocks.getB2BApiRoot.mockReturnValue({ get: () => ({ execute }) });
    const response = await businessCountries();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ countries: ["GB", "DE", "US", "ES", "FR"] });
    expect(mocks.getApiRoot).not.toHaveBeenCalled();
  });
  it("reads B2C countries from its own project", async () => {
    mocks.getApiRoot.mockReturnValue({ get: () => ({ execute: async () => ({ body: { countries: ["NZ", "AU"] } }) }) });
    expect(await (await retailCountries()).json()).toEqual({ countries: ["NZ", "AU"] });
    expect(mocks.getB2BApiRoot).not.toHaveBeenCalled();
  });
  it("does not fabricate options for empty or unavailable data and sanitizes errors", async () => {
    mocks.getB2BApiRoot.mockReturnValue({ get: () => ({ execute: async () => ({ body: { countries: [] } }) }) });
    expect(await (await businessCountries()).json()).toEqual({ countries: [] });
    mocks.getB2BApiRoot.mockReturnValue(null);
    const missing = await businessCountries();
    expect(missing.status).toBe(503);
    expect(missing.headers.get("Cache-Control")).toBe("no-store");
    mocks.getB2BApiRoot.mockImplementation(() => { throw new Error("secret token"); });
    const failed = await businessCountries();
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain("secret");
  });
});
