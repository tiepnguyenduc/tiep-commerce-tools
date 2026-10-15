/** Merchant setup. Dry-run by default; never changes B2C resources or customer accounts. */
import { ClientBuilder } from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";
const apply = process.argv.includes("--apply");
const env = process.env;
const country = env.CTP_B2B_COUNTRY || "US";
const plans = [
  {
    resource: "associateRoles",
    key: env.CTP_B2B_ADMIN_ROLE_KEY || "b2b-admin",
    name: "Business administrator",
    buyerAssignable: true,
    permissions: [
      "AddChildUnits",
      "UpdateBusinessUnitDetails",
      "UpdateAssociates",
      "CreateMyCarts",
      "ViewMyCarts",
      "UpdateMyCarts",
    ],
  },
  {
    resource: "associateRoles",
    key: env.CTP_B2B_BUYER_ROLE_KEY || "b2b-buyer",
    name: "Business buyer",
    buyerAssignable: true,
    permissions: ["CreateMyCarts", "ViewMyCarts", "UpdateMyCarts"],
  },
  ...["standard", "preferred"].map((tier) => ({
    resource: "channels",
    key: `b2b-${tier}-pricing`,
    name: { "en-US": `B2B ${tier} pricing` },
    roles: ["ProductDistribution"],
  })),
  ...["standard", "preferred"].map((tier) => ({
    resource: "stores",
    key: `b2b-${tier}`,
    name: { "en-US": `B2B ${tier === "standard" ? "Standard" : "Preferred"}` },
    countries: [{ code: country }],
    distributionChannels: [{ typeId: "channel", key: `b2b-${tier}-pricing` }],
  })),
];
console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      project: env.CTP_PROJECT_KEY || "(not configured)",
      resources: plans,
    },
    null,
    2,
  ),
);
if (!apply) {
  console.log(
    "To create these resources: node --env-file=.env.local scripts/setup-b2b.mjs --apply",
  );
  console.log(
    "No products, prices, accounts or Business Units are changed. Existing resources are validated and retained.",
  );
  process.exit(0);
}
for (const key of [
  "CTP_PROJECT_KEY",
  "CTP_CLIENT_ID",
  "CTP_CLIENT_SECRET",
  "CTP_AUTH_URL",
  "CTP_API_URL",
  "CTP_SCOPES",
]) {
  if (!env[key]) throw new Error(`Missing ${key}`);
}
const client = new ClientBuilder()
  .withProjectKey(env.CTP_PROJECT_KEY)
  .withClientCredentialsFlow({
    host: env.CTP_AUTH_URL,
    projectKey: env.CTP_PROJECT_KEY,
    credentials: {
      clientId: env.CTP_CLIENT_ID,
      clientSecret: env.CTP_CLIENT_SECRET,
    },
    scopes: env.CTP_SCOPES.split(" "),
    fetch,
  })
  .withHttpMiddleware({ host: env.CTP_API_URL, fetch })
  .build();
const api = createApiBuilderFromCtpClient(client).withProjectKey({
  projectKey: env.CTP_PROJECT_KEY,
});
const channelIds = new Map();
for (const { resource, ...draft } of plans) {
  let existing;
  try {
    if (resource === "channels") {
      existing = (
        await api
          .channels()
          .get({
            queryArgs: { where: `key=${JSON.stringify(draft.key)}`, limit: 1 },
          })
          .execute()
      ).body.results[0];
    } else {
      existing = (
        await api[resource]().withKey({ key: draft.key }).get().execute()
      ).body;
    }
  } catch (error) {
    if (error.statusCode !== 404)
      throw new Error(
        `Cannot read ${resource}/${draft.key}: HTTP ${error.statusCode ?? "network error"}`,
      );
  }
  if (existing) {
    const mismatch =
      resource === "associateRoles"
        ? !existing.buyerAssignable ||
          draft.permissions.some((p) => !existing.permissions.includes(p))
        : resource === "channels"
          ? !existing.roles.includes("ProductDistribution")
          : existing.distributionChannels.length !== 1 ||
            existing.distributionChannels[0].id !==
              channelIds.get(draft.distributionChannels[0].key) ||
            !existing.countries.some((c) => c.code === country);
    if (mismatch)
      throw new Error(
        `Existing ${resource}/${draft.key} has different configuration. Review in Merchant Center; no overwrite performed.`,
      );
    console.log(`Exists: ${resource}/${draft.key}`);
  } else {
    try {
      existing = (await api[resource]().post({ body: draft }).execute()).body;
    } catch (error) {
      throw new Error(
        `Cannot create ${resource}/${draft.key}: HTTP ${error.statusCode ?? "network error"}. Check API scopes and B2B availability.`,
      );
    }
    console.log(`Created: ${resource}/${draft.key}`);
  }
  if (resource === "channels") channelIds.set(draft.key, existing.id);
}
console.log(
  "Merchant setup complete. Configure CTP_B2B_ONBOARDING_STORE_KEYS=b2b-standard,b2b-preferred only if both Stores should be granted to newly registered companies.",
);
console.log(
  "Add published channel-specific product prices in Merchant Center for each Store distribution Channel. This script deliberately does not create commercial prices.",
);
