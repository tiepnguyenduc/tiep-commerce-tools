import "server-only";
import { ClientBuilder } from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";
import { getEnvReadiness } from "../env";

function createApiRoot() {
  return createApiBuilderFromCtpClient(
    new ClientBuilder()
      .withProjectKey(process.env.CTP_PROJECT_KEY!)
      .withClientCredentialsFlow({
        host: process.env.CTP_AUTH_URL!,
        projectKey: process.env.CTP_PROJECT_KEY!,
        credentials: {
          clientId: process.env.CTP_CLIENT_ID!,
          clientSecret: process.env.CTP_CLIENT_SECRET!,
        },
        scopes: process.env.CTP_SCOPES!.split(" "),
        fetch,
      })
      .withHttpMiddleware({ host: process.env.CTP_API_URL!, fetch })
      .build(),
  ).withProjectKey({ projectKey: process.env.CTP_PROJECT_KEY! });
}

let cachedApiRoot: ReturnType<typeof createApiRoot> | null = null;

export function getApiRoot() {
  if (!getEnvReadiness().ready) return null;
  cachedApiRoot ??= createApiRoot();
  return cachedApiRoot;
}
