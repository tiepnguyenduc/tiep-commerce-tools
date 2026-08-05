import "server-only";
import { getB2BReadiness, getEnvReadiness } from "../env";

export type CommerceConfig = {
  projectKey: string;
  currency: string;
  country: string;
  locale: string;
};

export type B2BContext = {
  associateId: string;
  businessUnitKey: string;
  storeKey?: string;
  distributionChannelKey?: string;
  supplyChannelKey?: string;
};

export function requireCommerceConfig(
  env: Record<string, string | undefined> = process.env,
): CommerceConfig {
  const readiness = getEnvReadiness(env);
  if (!readiness.ready) {
    throw new Error(
      `commercetools env is incomplete: ${readiness.missing.join(", ")}`,
    );
  }

  return {
    projectKey: env.CTP_PROJECT_KEY!,
    currency: env.CTP_CURRENCY || "USD",
    country: env.CTP_COUNTRY || "US",
    locale: env.CTP_LOCALE || "en-US",
  };
}

export function requireB2BContext(
  env: Record<string, string | undefined> = process.env,
): B2BContext {
  const readiness = getB2BReadiness(env);
  if (!readiness.ready) {
    throw new Error(
      `B2B associate context is incomplete: ${readiness.missing.join(", ")}`,
    );
  }

  return {
    associateId: env.CTP_B2B_ASSOCIATE_ID!,
    businessUnitKey: env.CTP_B2B_BUSINESS_UNIT_KEY!,
    storeKey: env.CTP_B2B_STORE_KEY,
    distributionChannelKey: env.CTP_B2B_DISTRIBUTION_CHANNEL_KEY,
    supplyChannelKey: env.CTP_B2B_SUPPLY_CHANNEL_KEY,
  };
}
