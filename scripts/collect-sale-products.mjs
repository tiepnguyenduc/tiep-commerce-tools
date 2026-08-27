// Collect discounted products into the "Sale" category.
//
// Ensures a top-level "Sale" category exists, then keeps its membership in sync
// with the catalog: every product that currently has a special price (a price
// whose discounted value is lower than its base value) is added to the category,
// and any product in the category that no longer has one is removed. Safe to run
// repeatedly (idempotent).
//
// Usage (Node 20+, loads commercetools credentials from .env.local):
//   node --env-file=.env.local scripts/collect-sale-products.mjs
//   node --env-file=.env.local scripts/collect-sale-products.mjs --dry-run
//
// Required env vars: CTP_PROJECT_KEY, CTP_CLIENT_ID, CTP_CLIENT_SECRET,
// CTP_AUTH_URL, CTP_API_URL, CTP_SCOPES. Optional: CTP_LOCALE (default en-US).

import { ClientBuilder } from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";

// Keep in sync with SALE_CATEGORY_KEY in lib/ct/catalog.ts.
const SALE_CATEGORY_KEY = "sale";
const SALE_CATEGORY_NAME = "Sale";
const LOCALE = process.env.CTP_LOCALE || "en-US";
const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 100;

const REQUIRED_ENV = [
  "CTP_PROJECT_KEY",
  "CTP_CLIENT_ID",
  "CTP_CLIENT_SECRET",
  "CTP_AUTH_URL",
  "CTP_API_URL",
  "CTP_SCOPES",
];

function requireEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(
      `Missing required env vars: ${missing.join(", ")}.\n` +
        "Load them with e.g. `node --env-file=.env.local scripts/collect-sale-products.mjs`.",
    );
    process.exit(1);
  }
}

function createApiRoot() {
  const projectKey = process.env.CTP_PROJECT_KEY;
  const client = new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
      host: process.env.CTP_AUTH_URL,
      projectKey,
      credentials: {
        clientId: process.env.CTP_CLIENT_ID,
        clientSecret: process.env.CTP_CLIENT_SECRET,
      },
      scopes: process.env.CTP_SCOPES.split(" "),
      fetch,
    })
    .withHttpMiddleware({ host: process.env.CTP_API_URL, fetch })
    .build();

  return createApiBuilderFromCtpClient(client).withProjectKey({ projectKey });
}

async function ensureSaleCategory(apiRoot) {
  try {
    const { body } = await apiRoot
      .categories()
      .withKey({ key: SALE_CATEGORY_KEY })
      .get()
      .execute();
    return body;
  } catch (error) {
    if (error?.statusCode !== 404) throw error;
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would create "${SALE_CATEGORY_NAME}" category.`);
    return { id: "__dry-run__", key: SALE_CATEGORY_KEY };
  }

  const { body } = await apiRoot
    .categories()
    .post({
      body: {
        key: SALE_CATEGORY_KEY,
        name: { [LOCALE]: SALE_CATEGORY_NAME },
        slug: { [LOCALE]: SALE_CATEGORY_KEY },
        orderHint: "0.1",
      },
    })
    .execute();
  console.log(`Created "${SALE_CATEGORY_NAME}" category (${body.id}).`);
  return body;
}

async function* iterateProducts(apiRoot) {
  let offset = 0;
  for (;;) {
    const { body } = await apiRoot
      .products()
      .get({ queryArgs: { limit: PAGE_SIZE, offset, sort: "id asc" } })
      .execute();
    for (const product of body.results) yield product;
    offset += body.results.length;
    if (body.results.length < PAGE_SIZE || offset >= (body.total ?? 0)) break;
  }
}

// A product qualifies for Sale when any published variant price has a special
// price — a discounted value that is genuinely lower than the base price.
function hasSpecialPrice(product) {
  const data = product.masterData?.current;
  if (!data) return false;
  const variants = [data.masterVariant, ...(data.variants ?? [])].filter(Boolean);
  return variants.some((variant) =>
    (variant.prices ?? []).some(
      (price) =>
        price.discounted != null &&
        price.discounted.value.centAmount < price.value.centAmount,
    ),
  );
}

function isInCategory(product, categoryId) {
  const categories = product.masterData?.current?.categories ?? [];
  return categories.some((reference) => reference.id === categoryId);
}

function productName(product) {
  const name = product.masterData?.current?.name;
  return name?.[LOCALE] || name?.["en-US"] || product.key || product.id;
}

async function applyCategoryChange(apiRoot, product, action) {
  if (DRY_RUN) return;
  await apiRoot
    .products()
    .withId({ ID: product.id })
    .post({
      body: {
        version: product.version,
        actions: [
          {
            action,
            category: { typeId: "category", key: SALE_CATEGORY_KEY },
            // Write straight to the current projection the storefront reads.
            staged: false,
          },
        ],
      },
    })
    .execute();
}

async function main() {
  requireEnv();
  const apiRoot = createApiRoot();

  const saleCategory = await ensureSaleCategory(apiRoot);
  console.log(
    `Syncing "${SALE_CATEGORY_NAME}" category${DRY_RUN ? " (dry run)" : ""}…`,
  );

  let scanned = 0;
  let added = 0;
  let removed = 0;

  for await (const product of iterateProducts(apiRoot)) {
    scanned += 1;
    const onSale = hasSpecialPrice(product);
    const inCategory = isInCategory(product, saleCategory.id);

    if (onSale && !inCategory) {
      await applyCategoryChange(apiRoot, product, "addToCategory");
      added += 1;
      console.log(`  + ${productName(product)}`);
    } else if (!onSale && inCategory) {
      await applyCategoryChange(apiRoot, product, "removeFromCategory");
      removed += 1;
      console.log(`  - ${productName(product)}`);
    }
  }

  console.log(
    `\nDone. Scanned ${scanned} products — ` +
      `${added} added to Sale, ${removed} removed${DRY_RUN ? " (dry run, no changes written)" : ""}.`,
  );
}

main().catch((error) => {
  console.error("collect-sale-products failed:", error?.message ?? error);
  process.exit(1);
});
