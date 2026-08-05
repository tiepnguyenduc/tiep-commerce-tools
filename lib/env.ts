import { z } from "zod";

type EnvInput = Record<string, string | undefined>;

const schema = z.object({
  CTP_PROJECT_KEY: z.string().min(1),
  CTP_CLIENT_ID: z.string().min(1),
  CTP_CLIENT_SECRET: z.string().min(1),
  CTP_AUTH_URL: z.string().url(),
  CTP_API_URL: z.string().url(),
  CTP_SCOPES: z.string().min(1),
});

export type EnvReadiness = {
  ready: boolean;
  missing: string[];
  mode: "connected" | "training";
};

export type B2BReadiness = {
  ready: boolean;
  missing: string[];
};

export function getEnvReadiness(env: EnvInput = process.env): EnvReadiness {
  const parsed = schema.safeParse(env);

  if (parsed.success) {
    return { ready: true, missing: [], mode: "connected" };
  }

  const missing = parsed.error.issues.map((issue) => String(issue.path[0]));
  return {
    ready: false,
    missing: [...new Set(missing)],
    mode: "training",
  };
}

export function isCheckoutReady(env: EnvInput = process.env) {
  return getEnvReadiness(env).ready && Boolean(env.CTP_CHECKOUT_APP_KEY);
}

export function getB2BReadiness(env: EnvInput = process.env): B2BReadiness {
  const required = ["CTP_B2B_ASSOCIATE_ID", "CTP_B2B_BUSINESS_UNIT_KEY"];
  const missing = required.filter((key) => !env[key]);
  return { ready: missing.length === 0, missing };
}
