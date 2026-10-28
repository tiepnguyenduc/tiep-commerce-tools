/**
 * Demo approval data for the B2B project. Dry-run by default.
 *
 * Creates two approval rules per Business Unit (buyer orders above 50,000 need an
 * approver; above 150,000 they also need an admin), places buyer orders through the
 * associate endpoints so commercetools opens approval flows, then approves or rejects
 * some of them so every status has data. Re-running skips orders that already exist.
 */
import { ClientBuilder } from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";

const apply = process.argv.includes("--apply");
const env = process.env;
const BUYER = env.CTP_B2B_BUYER_ROLE_KEY || "buyer";
const APPROVER = "approver";
const ADMIN = env.CTP_B2B_ADMIN_ROLE_KEY || "admin";
const MID = 5_000_000;
const HIGH = 15_000_000;

const rules = [
  {
    key: "seed-orders-above-50k",
    name: "Orders above 50,000",
    description: "Buyer orders between 50,000 and 150,000 need sign-off from an approver.",
    predicate: `totalPrice.centAmount > ${MID} and totalPrice.centAmount <= ${HIGH}`,
    tiers: [[APPROVER]],
  },
  {
    key: "seed-orders-above-150k",
    name: "Orders above 150,000",
    description: "High-value buyer orders need an approver, then an admin.",
    predicate: `totalPrice.centAmount > ${HIGH}`,
    tiers: [[APPROVER], [ADMIN]],
  },
];

/**
 * quantity: units of the first SKU from the unit's latest order (other SKUs get 1 each when `skus` > 1).
 * steps: decisions applied in order, by role ("approve:approver", "reject:admin", ...), until the flow is decided.
 */
const units = {
  "liberty-crane-solutions-llc-us": [
    { slug: "pending-1", skus: 2, quantity: 1, steps: [] },
    { slug: "pending-2", skus: 1, quantity: 3, steps: [] },
    { slug: "pending-tier-2", skus: 3, quantity: 2, steps: [`approve:${APPROVER}`] },
    { slug: "approved-1", skus: 2, quantity: 1, steps: [`approve:${APPROVER}`, `approve:${ADMIN}`] },
    { slug: "approved-2", skus: 3, quantity: 2, steps: [`approve:${APPROVER}`, `approve:${ADMIN}`] },
    { slug: "rejected-1", skus: 1, quantity: 3, steps: [`reject:${APPROVER}`], reason: "Budget for this quarter is already committed." },
    { slug: "rejected-2", skus: 3, quantity: 2, steps: [`approve:${APPROVER}`, `reject:${ADMIN}`], reason: "Split this order across two delivery dates." },
  ],
  "eagle-heavy-lift-technologies-inc-us": [
    { slug: "pending-1", skus: 2, quantity: 1, steps: [] },
    { slug: "pending-tier-2", skus: 3, quantity: 1, steps: [`approve:${APPROVER}`] },
    { slug: "approved-1", skus: 1, quantity: 2, steps: [`approve:${APPROVER}`, `approve:${ADMIN}`] },
    { slug: "rejected-1", skus: 3, quantity: 1, steps: [`reject:${APPROVER}`], reason: "Duplicate of an order placed last week." },
  ],
  "lifttech-solutions-ltd": [
    { slug: "pending-1", skus: 2, quantity: 1, steps: [] },
    { slug: "pending-tier-2", skus: 3, quantity: 2, steps: [`approve:${APPROVER}`] },
    { slug: "approved-1", skus: 3, quantity: 1, steps: [`approve:${APPROVER}`, `approve:${ADMIN}`] },
    { slug: "rejected-1", skus: 2, quantity: 1, steps: [`reject:${APPROVER}`], reason: "Please use the framework agreement prices." },
  ],
};

const plan = Object.entries(units).map(([unit, orders]) => ({
  unit,
  rules: rules.map((rule) => `${rule.name} (${rule.tiers.map((tier) => tier.join("|")).join(" → ")})`),
  orders: orders.map((order) => `${unit}-approval-${order.slug}: ${order.steps.join(", ") || "pending"}`),
}));
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", project: env.CTP_B2B_PROJECT_KEY || "(not configured)", plan }, null, 2));
if (!apply) {
  console.log("To create this data: node --env-file=.env.local scripts/seed-b2b-approvals.mjs --apply");
  process.exit(0);
}
for (const key of ["CTP_B2B_PROJECT_KEY", "CTP_B2B_CLIENT_ID", "CTP_B2B_CLIENT_SECRET", "CTP_B2B_AUTH_URL", "CTP_B2B_API_URL", "CTP_B2B_SCOPES"]) {
  if (!env[key]) throw new Error(`Missing ${key}`);
}
const api = createApiBuilderFromCtpClient(
  new ClientBuilder()
    .withProjectKey(env.CTP_B2B_PROJECT_KEY)
    .withClientCredentialsFlow({
      host: env.CTP_B2B_AUTH_URL,
      projectKey: env.CTP_B2B_PROJECT_KEY,
      credentials: { clientId: env.CTP_B2B_CLIENT_ID, clientSecret: env.CTP_B2B_CLIENT_SECRET },
      scopes: env.CTP_B2B_SCOPES.split(" "),
      fetch,
    })
    .withHttpMiddleware({ host: env.CTP_B2B_API_URL, fetch })
    .build(),
).withProjectKey({ projectKey: env.CTP_B2B_PROJECT_KEY });

const as = (associateId, businessUnitKey) =>
  api.asAssociate().withAssociateIdValue({ associateId }).inBusinessUnitKeyWithBusinessUnitKeyValue({ businessUnitKey });
const roleRef = (key) => ({ associateRole: { typeId: "associate-role", key } });
const explain = (error) => error.body?.errors?.map((item) => item.message).join("; ") || error.message;

const shippingMethodKey = (await api.shippingMethods().get({ queryArgs: { where: "isDefault = true", limit: 1 } }).execute())
  .body.results[0]?.key;

for (const [unitKey, orders] of Object.entries(units)) {
  const { body: unit } = await api.businessUnits().withKey({ key: unitKey }).get().execute();
  const holder = (role) =>
    unit.associates.find((associate) => associate.associateRoleAssignments.some((item) => item.associateRole.key === role))?.customer.id;
  const [buyer, admin] = [holder(BUYER), holder(ADMIN)];
  if (!buyer || !admin) throw new Error(`${unitKey} needs associates with the ${BUYER} and ${ADMIN} roles.`);

  for (const rule of rules) {
    try {
      await as(admin, unitKey).approvalRules().withKey({ key: rule.key }).get().execute();
      console.log(`Exists: ${unitKey} rule ${rule.key}`);
    } catch (error) {
      if (error.statusCode !== 404) throw new Error(`Cannot read rule ${rule.key} in ${unitKey}: ${explain(error)}`);
      await as(admin, unitKey).approvalRules().post({
        body: {
          key: rule.key,
          name: rule.name,
          description: rule.description,
          status: "Active",
          predicate: rule.predicate,
          requesters: [roleRef(BUYER)],
          approvers: { tiers: rule.tiers.map((tier) => ({ and: [{ or: tier.map(roleRef) }] })) },
        },
      }).execute();
      console.log(`Created: ${unitKey} rule ${rule.key}`);
    }
  }

  // Reuse what this unit already buys so prices resolve for its Store, country and channels.
  const { body: { results: [template] } } = await api.orders().get({
    queryArgs: { where: `businessUnit(key=${JSON.stringify(unitKey)}) and lineItems is not empty`, sort: "createdAt desc", limit: 1 },
  }).execute();
  if (!template) throw new Error(`${unitKey} has no previous order to take products, Store and channels from.`);
  const products = template.lineItems.map((line) => ({
    sku: line.variant.sku,
    distributionChannel: line.distributionChannel && { typeId: "channel", id: line.distributionChannel.id },
    supplyChannel: line.supplyChannel && { typeId: "channel", id: line.supplyChannel.id },
  }));
  const address = unit.addresses.find((item) => item.id === unit.defaultShippingAddressId) ?? unit.addresses[0];

  for (const order of orders) {
    const orderNumber = `${unitKey}-approval-${order.slug}`;
    const existing = (await api.orders().get({ queryArgs: { where: `orderNumber=${JSON.stringify(orderNumber)}`, limit: 1 } }).execute())
      .body.results[0];
    if (existing) {
      console.log(`Exists: order ${orderNumber}`);
      continue;
    }
    const { body: cart } = await as(buyer, unitKey).carts().post({
      body: {
        currency: template.totalPrice.currencyCode,
        country: template.country,
        customerId: buyer,
        store: template.store && { typeId: "store", key: template.store.key },
        inventoryMode: template.inventoryMode,
        shippingAddress: { ...address, id: undefined },
        billingAddress: { ...address, id: undefined },
        shippingMethod: shippingMethodKey && { typeId: "shipping-method", key: shippingMethodKey },
        lineItems: products.slice(0, order.skus).map((product, index) => ({
          ...product,
          quantity: index === 0 ? order.quantity : 1,
        })),
      },
    }).execute();
    const { body: created } = await as(buyer, unitKey).orders().post({
      body: { id: cart.id, version: cart.version, orderNumber },
    }).execute();
    const total = `${created.totalPrice.currencyCode} ${(created.totalPrice.centAmount / 100).toFixed(2)}`;

    const flowFor = async () =>
      (await as(admin, unitKey).approvalFlows().get({ queryArgs: { where: `order(id=${JSON.stringify(created.id)})`, limit: 1 } }).execute())
        .body.results[0];
    let flow = await flowFor();
    if (!flow) {
      console.warn(`Created: order ${orderNumber} (${total}) — no rule matched, so no approval flow was opened.`);
      continue;
    }
    for (const step of order.steps) {
      if (flow.status !== "Pending") break; // a single-tier rule is already decided
      const [action, role] = step.split(":");
      const actor = holder(role);
      if (!actor) throw new Error(`${unitKey} has no associate with the ${role} role.`);
      ({ body: flow } = await as(actor, unitKey).approvalFlows().withId({ ID: flow.id }).post({
        body: { version: flow.version, actions: [action === "approve" ? { action } : { action, reason: order.reason }] },
      }).execute());
    }
    console.log(`Created: order ${orderNumber} (${total}) → approval flow ${flow.id} ${flow.status}`);
  }
}
console.log("Approval demo data is ready. Sign in as an associate with the approver role to review pending flows.");
