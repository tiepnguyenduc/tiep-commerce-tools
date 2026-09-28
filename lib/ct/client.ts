import "server-only";
import { ClientBuilder } from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";
import { getB2BApiEnv, getEnvReadiness } from "../env";

function createApiRoot(env: Record<string, string | undefined> = process.env) {
  return createApiBuilderFromCtpClient(
    new ClientBuilder()
      .withProjectKey(env.CTP_PROJECT_KEY!)
      .withClientCredentialsFlow({
        host: env.CTP_AUTH_URL!,
        projectKey: env.CTP_PROJECT_KEY!,
        credentials: {
          clientId: env.CTP_CLIENT_ID!,
          clientSecret: env.CTP_CLIENT_SECRET!,
        },
        scopes: env.CTP_SCOPES!.split(" "),
        fetch,
      })
      .withHttpMiddleware({ host: env.CTP_API_URL!, fetch })
      .build(),
  ).withProjectKey({ projectKey: env.CTP_PROJECT_KEY! });
}

let cachedApiRoot: ReturnType<typeof createApiRoot> | null = null;

export function getApiRoot() {
  if (!getEnvReadiness().ready) return null;
  cachedApiRoot ??= createApiRoot();
  return cachedApiRoot;
}

let cachedB2BApiRoot: ReturnType<typeof createApiRoot> | null = null;

export function getB2BApiRoot() {
  const env = getB2BApiEnv();
  if (!getEnvReadiness(env).ready) return null;
  cachedB2BApiRoot ??= createApiRoot(env);
  return cachedB2BApiRoot;
}
