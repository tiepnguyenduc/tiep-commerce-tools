import { describe, expect, it } from "vitest";
import {
  getB2BReadiness,
  getB2BApiEnv,
  getEnvReadiness,
  isCheckoutReady,
} from "../lib/env";

const connected = {
  CTP_PROJECT_KEY: "project",
  CTP_CLIENT_ID: "id",
  CTP_CLIENT_SECRET: "secret",
  CTP_AUTH_URL: "https://auth.example.com",
  CTP_API_URL: "https://api.example.com",
  CTP_SCOPES: "manage_project:project",
};

describe("environment readiness", () => {
  it("falls back deterministically when credentials are missing", () => {
    expect(getEnvReadiness({})).toMatchObject({
      ready: false,
      mode: "training",
    });
    expect(getEnvReadiness({}).missing).toContain("CTP_CLIENT_SECRET");
  });

  it("recognizes a connected environment", () => {
    expect(getEnvReadiness(connected)).toEqual({
      ready: true,
      missing: [],
      mode: "connected",
    });
  });

  it("requires an application key for Checkout", () => {
    expect(isCheckoutReady(connected)).toBe(false);
    expect(
      isCheckoutReady({ ...connected, CTP_CHECKOUT_APP_KEY: "checkout" }),
    ).toBe(true);
  });

  it("requires associate and business unit context for live B2B mutations", () => {
    expect(getB2BReadiness(connected)).toEqual({
      ready: false,
      missing: ["CTP_B2B_ASSOCIATE_ID", "CTP_B2B_BUSINESS_UNIT_KEY"],
    });
    expect(
      getB2BReadiness({
        ...connected,
        CTP_B2B_ASSOCIATE_ID: "customer-id",
        CTP_B2B_BUSINESS_UNIT_KEY: "northstar",
      }),
    ).toEqual({ ready: true, missing: [] });
  });
});

describe("dedicated B2B project credentials", () => {
  it("supports sharing the B2C project only when no B2B credentials are set", () => {
    expect(getB2BApiEnv(connected)).toEqual(connected);
  });
  it("does not fill incomplete B2B configuration with B2C credentials", () => {
    const env = getB2BApiEnv({ ...connected, CTP_B2B_PROJECT_KEY: "business" });
    expect(env.CTP_PROJECT_KEY).toBe("business");
    expect(env.CTP_CLIENT_SECRET).toBeUndefined();
    expect(getEnvReadiness(env).ready).toBe(false);
  });
  it("uses only the dedicated credentials for a separate project", () => {
    const dedicated = Object.fromEntries(
      Object.entries(connected).map(([key, value]) => [
        key.replace("CTP_", "CTP_B2B_"),
        value,
      ]),
    );
    const env = getB2BApiEnv({
      ...connected,
      ...dedicated,
      CTP_B2B_PROJECT_KEY: "business",
      CTP_B2B_CLIENT_SECRET: "business-secret",
    });
    expect(env.CTP_PROJECT_KEY).toBe("business");
    expect(env.CTP_CLIENT_SECRET).toBe("business-secret");
    expect(getEnvReadiness(env).ready).toBe(true);
    expect(connected.CTP_PROJECT_KEY).toBe("project");
  });
});
