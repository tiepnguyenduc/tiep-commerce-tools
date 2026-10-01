import "server-only";
import { randomUUID } from "node:crypto";
import type {
  BusinessUnit,
  ProductProjection,
  Store,
  ProductVariant,
  Customer,
  CartUpdateAction,
  Cart as CtCart,
} from "@commercetools/platform-sdk";
import { getB2BApiRoot as getApiRoot } from "./client";
import { mapCommercetoolsCart, mapMoney } from "./mappers";
import { formatAttributeValue } from "./catalog-mappers";
import type {
  B2BAction,
  B2BContext,
  B2BProduct,
  B2BState,
  B2BUnit,
} from "../b2b/types";
import type { B2BSession } from "../b2b/session";
export class B2BError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function api() {
  const root = getApiRoot();
  if (!root)
    throw new B2BError(
      "Connect the commercetools project to enable B2B accounts.",
      503,
    );
  return root;
}
const localized = (value?: Record<string, string>) =>
  value?.["en-US"] || value?.en || Object.values(value ?? {})[0] || "";
export function requireCustomer(session: B2BSession) {
  if (!session.customer)
    throw new B2BError("Please sign in to your business account.", 401);
  return session.customer;
}
export function unitStores(unit: BusinessUnit) {
  return unit.storeMode === "FromParent"
    ? (unit.inheritedStores ?? [])
    : (unit.stores ?? []);
}
export function assertMember(unit: BusinessUnit, customerId: string) {
  if (
    unit.status !== "Active" ||
    ![...unit.associates, ...(unit.inheritedAssociates ?? [])].some(
      (a) => a.customer.id === customerId,
    )
  )
    throw new B2BError(
      "This business unit is not available to your account.",
      403,
    );
}
async function unitsFor(customerId: string) {
  const results: BusinessUnit[] = [];
  for (let offset = 0; ; offset += 100) {
    const { body } = await api()
      .businessUnits()
      .get({
        queryArgs: {
          where: `status="Active" and (associates(customer(id=${JSON.stringify(customerId)})) or inheritedAssociates(customer(id=${JSON.stringify(customerId)})))`,
          limit: 100,
          offset,
        },
      })
      .execute();
    results.push(...body.results);
    if (body.results.length < 100) break;
  }
  return results.filter((unit) => {
    try {
      assertMember(unit, customerId);
      return true;
    } catch {
      return false;
    }
  });
}
async function unitFor(session: B2BSession, key: string) {
  const customer = requireCustomer(session);
  const { body } = await api()
    .asAssociate()
    .withAssociateIdValue({ associateId: customer.id })
    .businessUnits()
    .withKey({ key })
    .get()
    .execute();
  assertMember(body, customer.id);
  return body;
}
async function canManage(unit: BusinessUnit, customerId: string) {
  const assignments = [...unit.associates, ...(unit.inheritedAssociates ?? [])]
    .filter((a) => a.customer.id === customerId)
    .flatMap((a) => a.associateRoleAssignments.map((r) => r.associateRole));
  const roles = await Promise.all(
    [...new Set(assignments.map((a) => a.key))].map((key) =>
      api().associateRoles().withKey({ key }).get().execute(),
    ),
  );
  return roles.some((r) => r.body.permissions.includes("UpdateAssociates"));
}
export function resolveContext(unit: BusinessUnit, store: Store): B2BContext {
  if (!unitStores(unit).some((s) => s.key === store.key))
    throw new B2BError("Select a Store assigned to this business unit.", 403);
  if (store.distributionChannels.length !== 1)
    throw new B2BError(
      "This Store needs exactly one distribution channel configured for B2B pricing. Contact your account manager.",
    );
  const country = process.env.CTP_B2B_COUNTRY || "US";
  if (
    store.countries?.length &&
    !store.countries.some((c) => c.code === country)
  )
    throw new B2BError(
      `This Store is not configured for ${country}. Contact your account manager.`,
    );
  return {
    businessUnitKey: unit.key,
    storeKey: store.key,
    currency: process.env.CTP_B2B_CURRENCY || "USD",
    country,
    distributionChannelId: store.distributionChannels[0].id,
  };
}
async function verifiedContext(session: B2BSession) {
  if (!session.context)
    throw new B2BError("Choose a business unit and Store first.");
  const unit = await unitFor(session, session.context.businessUnitKey);
  const { body: store } = await api()
    .stores()
    .withKey({ key: session.context.storeKey })
    .get()
    .execute();
  const context = resolveContext(unit, store);
  if (JSON.stringify(context) !== JSON.stringify(session.context)) {
    session.cartId = undefined;
    session.context = context;
  }
  return { unit, store, context };
}
export function mapB2BProduct(
  product: ProductProjection,
  context?: B2BContext,
): B2BProduct {
  const variant = (v: ProductVariant) => {
    const selected =
      context &&
      v.price?.channel?.id === context.distributionChannelId &&
      v.price.value.currencyCode === context.currency
        ? v.price
        : undefined;
    return {
      id: v.id,
      sku: v.sku || "",
      image: v.images?.[0]?.url || "",
      price: selected
        ? mapMoney(selected.discounted?.value ?? selected.value)
        : null,
      attributes: (v.attributes ?? [])
        .map((a) => ({
          name: a.name,
          value: formatAttributeValue(a.value, process.env.CTP_LOCALE || "en-US"),
        }))
        .filter((a) => a.value !== ""),
    };
  };
  const variants = [product.masterVariant, ...product.variants].map(variant);
  return {
    id: product.id,
    slug: localized(product.slug),
    name: localized(product.name),
    description: localized(product.description),
    category: localized(product.categories[0]?.obj?.name) || "Equipment",
    categoryIds: [...new Set(product.categories.flatMap((category) => [
      category.id,
      ...(category.obj?.ancestors ?? []).map((ancestor) => ancestor.id),
    ]))],
    image: variants[0].image,
    images: (product.masterVariant.images ?? []).map((i) => i.url),
    price: variants[0].price,
    variants,
  };
}
async function priceArgs(
  session: B2BSession,
  unit: BusinessUnit,
  context: B2BContext,
) {
  const customer = await api()
    .customers()
    .withId({ ID: requireCustomer(session).id })
    .get()
    .execute();
  const groupIds = [
    ...(unit.customerGroupAssignments ?? []).map((g) => g.customerGroup.id),
    ...(customer.body.customerGroupAssignments ?? []).map(
      (g) => g.customerGroup.id,
    ),
    ...(customer.body.customerGroup ? [customer.body.customerGroup.id] : []),
  ];
  return {
    staged: false,
    priceCurrency: context.currency,
    priceCountry: context.country,
    priceChannel: context.distributionChannelId,
    ...(groupIds.length ? { priceCustomerGroupAssignments: groupIds } : {}),
    expand: "categories[*]",
  };
}
async function publishedProjections(expandCategories = false): Promise<ProductProjection[]> {
  const products: ProductProjection[] = [];
  let cursor: string | undefined;
  for (;;) {
    const { body } = await api().productProjections().get({ queryArgs: {
      staged: false, limit: 100, sort: "id asc", withTotal: false,
      ...(expandCategories ? { expand: "categories[*]" } : {}),
      ...(cursor ? { where: `id > ${JSON.stringify(cursor)}` } : {}),
    } }).execute();
    products.push(...body.results);
    if (body.results.length < 100) return products;
    const next = body.results[body.results.length - 1].id;
    if (next === cursor) throw new Error("Product pagination did not advance.");
    cursor = next;
  }
}
export async function catalogCandidates(store: Store): Promise<{ id: string }[]> {
  try {
    const candidates: { id: string }[] = [];
    for (let offset = 0; offset < 10000; offset += 100) {
      const { body } = await api().products().search().post({ body: {
        query: { exact: { field: "stores", value: store.id } },
        limit: 100, offset, sort: [{ field: "id", order: "asc" }],
      } }).execute();
      candidates.push(...body.results.map(({ id }) => ({ id })));
      if (body.results.length < 100 || (typeof body.total === "number" && candidates.length >= body.total)) return candidates;
    }
    // Search pagination cannot cover more than 10,000 results. Retrieve all
    // published candidate IDs instead; every ID still passes in-Store validation.
  } catch (error) {
    const failure = error as { statusCode?: number; body?: { errors?: { code: string }[] } };
    const unavailable = failure.statusCode === 404 || failure.body?.errors?.some((e) => e.code === "SearchDeactivated");
    if (!unavailable) throw error;
  }
  return (await publishedProjections()).map(({ id }) => ({ id }));
}
async function productsFor(session: B2BSession, q = "") {
  if (!session.context) {
    return (await publishedProjections(true))
      .map((p) => mapB2BProduct(p))
      .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  }
  const { store, context, unit } = await verifiedContext(session);
  const candidates = await catalogCandidates(store);
  const pricing = await priceArgs(session, unit, context);
  const products: (B2BProduct | null)[] = [];
  for (let offset = 0; offset < candidates.length; offset += 20) {
    products.push(...await Promise.all(
    candidates.slice(offset, offset + 20).map(async (result) => {
      try {
        const { body } = await api()
          .inStoreKeyWithStoreKeyValue({ storeKey: store.key })
          .productProjections()
          .withId({ ID: result.id })
          .get({ queryArgs: pricing })
          .execute();
        return mapB2BProduct(body, context);
      } catch (error) {
        // Missing/unpublished products and Store-excluded variants are not exposed.
        if ((error as { statusCode?: number }).statusCode === 404) return null;
        throw error;
      }
    }),
    ));
  }
  return products.filter(
    (p): p is B2BProduct =>
      p !== null && p.name.toLowerCase().includes(q.toLowerCase()),
  );
}
function cartRoot(session: B2BSession) {
  return api()
    .asAssociate()
    .withAssociateIdValue({ associateId: requireCustomer(session).id })
    .inBusinessUnitKeyWithBusinessUnitKeyValue({
      businessUnitKey: session.context!.businessUnitKey,
    })
    .carts();
}
export function cartMatchesContext(cart: CtCart, session: B2BSession) {
  const c = session.context;
  return Boolean(
    c &&
    cart.cartState === "Active" &&
    cart.customerId === session.customer?.id &&
    cart.store?.key === c.storeKey &&
    cart.businessUnit?.key === c.businessUnitKey &&
    cart.totalPrice.currencyCode === c.currency &&
    cart.country === c.country &&
    cart.lineItems.every(
      (line) => line.distributionChannel?.id === c.distributionChannelId,
    ),
  );
}
async function cartFor(session: B2BSession) {
  if (!session.context) return null;
  await verifiedContext(session);
  if (!session.cartId) {
    const c = session.context;
    const { body: existing } = await cartRoot(session)
      .get({
        queryArgs: {
          where: `cartState="Active" and customerId=${JSON.stringify(requireCustomer(session).id)} and store(key=${JSON.stringify(c.storeKey)}) and businessUnit(key=${JSON.stringify(c.businessUnitKey)}) and totalPrice(currencyCode=${JSON.stringify(c.currency)}) and country=${JSON.stringify(c.country)}`,
          sort: "lastModifiedAt desc",
          limit: 10,
        },
      })
      .execute();
    session.cartId = existing.results.find((cart) =>
      cartMatchesContext(cart, session),
    )?.id;
    if (!session.cartId) return null;
  }
  const { body } = await cartRoot(session)
    .withId({ ID: session.cartId })
    .get()
    .execute();
  if (!cartMatchesContext(body, session)) {
    delete session.cartId;
    return null;
  }
  return body;
}
export async function b2bState(session: B2BSession, q = ""): Promise<B2BState> {
  if (!getApiRoot())
    return {
      configured: false,
      customer: null,
      businessUnits: [],
      context: null,
      products: [],
      cart: null,
      notice: "Configure commercetools credentials to enable this storefront.",
    };
  let notice: string | undefined;
  const units = session.customer ? await unitsFor(session.customer.id) : [];
  const businessUnits: B2BUnit[] = await Promise.all(
    units.map(async (u) => ({
      key: u.key,
      name: u.name,
      canManageAssociates: await canManage(u, session.customer!.id),
      stores: await Promise.all(
        unitStores(u).map(async (s) => {
          const { body } = await api()
            .stores()
            .withKey({ key: s.key })
            .get()
            .execute();
          return { key: s.key, name: localized(body.name) || s.key };
        }),
      ),
    })),
  );
  if (session.context) {
    try {
      await verifiedContext(session);
    } catch (error) {
      session.context = undefined;
      session.cartId = undefined;
      notice =
        error instanceof Error
          ? error.message
          : "Select your business context again.";
    }
  }
  if (session.customer && !units.length)
    notice =
      "Create your company or ask its administrator to add your registered email to a business unit.";
  if (units.length && !businessUnits.some((u) => u.stores.length))
    notice =
      "Your company is ready. Ask your account manager to assign a Store with contract pricing.";
  let products: B2BProduct[] = [];
  try {
    products = await productsFor(session, q);
  } catch {
    notice =
      "The catalog is unavailable. Check Product Search activation and Store configuration, then refresh.";
  }
  let cart: Awaited<ReturnType<typeof cartFor>> = null;
  try {
    cart = await cartFor(session);
  } catch {
    notice =
      "Your business cart could not be loaded. Refresh before adding more items.";
  }
  return {
    configured: true,
    customer: session.customer ?? null,
    businessUnits,
    context: session.context ?? null,
    products,
    cart: cart ? mapCommercetoolsCart(cart, "b2b") : null,
    notice,
  };
}
export async function b2bAction(session: B2BSession, input: B2BAction) {
  if (input.action === "logout") {
    delete session.customer;
    delete session.context;
    delete session.cartId;
    return;
  }
  if (input.action === "login" || input.action === "register") {
    const { body } =
      input.action === "login"
        ? await api()
            .login()
            .post({ body: { email: input.email, password: input.password } })
            .execute()
        : await api()
            .customers()
            .post({
              body: {
                email: input.email,
                password: input.password,
                firstName: input.firstName,
                lastName: input.lastName,
              },
            })
            .execute();
    const c: Customer = body.customer;
    session.customer = {
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
    };
    delete session.context;
    delete session.cartId;
    const units = await unitsFor(c.id);
    const first = units.find((u) => unitStores(u).length);
    if (first) {
      const { body: store } = await api()
        .stores()
        .withKey({ key: unitStores(first)[0].key })
        .get()
        .execute();
      try {
        session.context = resolveContext(first, store);
      } catch {
        /* User can choose a configured Store after login. */
      }
    }
    return;
  }
  const customer = requireCustomer(session);
  if (input.action === "clear-context") {
    delete session.context;
    delete session.cartId;
    return;
  }
  if (input.action === "select-context") {
    const unit = await unitFor(session, input.businessUnitKey);
    if (!unitStores(unit).some((s) => s.key === input.storeKey))
      throw new B2BError("Select a Store assigned to this business unit.", 403);
    const { body: store } = await api()
      .stores()
      .withKey({ key: input.storeKey })
      .get()
      .execute();
    session.context = resolveContext(unit, store);
    delete session.cartId;
    return;
  }
  if (input.action === "create-business-unit") {
    if ((await unitsFor(customer.id)).length)
      throw new B2BError(
        "Your account already belongs to a company. Ask your administrator to create further divisions.",
      );
    const roleKey = process.env.CTP_B2B_ADMIN_ROLE_KEY || "b2b-admin";
    try {
      await api().associateRoles().withKey({ key: roleKey }).get().execute();
    } catch {
      throw new B2BError(
        "Your merchant must configure the b2b-admin associate role before company registration.",
        503,
      );
    }
    const { body: created } = await api()
      .asAssociate()
      .withAssociateIdValue({ associateId: customer.id })
      .businessUnits()
      .post({
        body: {
          unitType: "Company",
          key: `company-${randomUUID()}`,
          name: input.name,
          status: "Active",
          stores: (process.env.CTP_B2B_ONBOARDING_STORE_KEYS || "")
            .split(",")
            .map((key) => key.trim())
            .filter(Boolean)
            .map((key) => ({ typeId: "store" as const, key })),
          contactEmail: customer.email,
          storeMode: "Explicit",
          associates: [
            {
              customer: { typeId: "customer", id: customer.id },
              associateRoleAssignments: [
                {
                  associateRole: { typeId: "associate-role", key: roleKey },
                  inheritance: "Enabled",
                },
              ],
            },
          ],
        },
      })
      .execute();
    const storeKey = unitStores(created)[0]?.key;
    if (storeKey) {
      const { body: store } = await api()
        .stores()
        .withKey({ key: storeKey })
        .get()
        .execute();
      try {
        session.context = resolveContext(created, store);
      } catch {
        /* Store configuration shown at selection. */
      }
    }
    return;
  }
  if (input.action === "add-associate") {
    const unit = await unitFor(session, input.businessUnitKey);
    if (!(await canManage(unit, customer.id)))
      throw new B2BError(
        "Only a business administrator can assign members.",
        403,
      );
    const { body } = await api()
      .customers()
      .get({
        queryArgs: { where: `email=${JSON.stringify(input.email)}`, limit: 1 },
      })
      .execute();
    if (!body.results[0])
      throw new B2BError(
        "The member needs to register an account with this email first.",
      );
    await api()
      .asAssociate()
      .withAssociateIdValue({ associateId: customer.id })
      .businessUnits()
      .withKey({ key: unit.key })
      .post({
        body: {
          version: unit.version,
          actions: [
            {
              action: "addAssociate",
              associate: {
                customer: { typeId: "customer", id: body.results[0].id },
                associateRoleAssignments: [
                  {
                    associateRole: {
                      typeId: "associate-role",
                      key: process.env.CTP_B2B_BUYER_ROLE_KEY || "b2b-buyer",
                    },
                    inheritance: "Enabled",
                  },
                ],
              },
            },
          ],
        },
      })
      .execute();
    return;
  }
  const { unit, context } = await verifiedContext(session);
  let cart = await cartFor(session);
  const actions: CartUpdateAction[] = [];
  if (input.action === "add-to-cart") {
    const { body: p } = await api()
      .inStoreKeyWithStoreKeyValue({ storeKey: context.storeKey })
      .productProjections()
      .withId({ ID: input.productId })
      .get({ queryArgs: await priceArgs(session, unit, context) })
      .execute();
    if (
      !mapB2BProduct(p, context).variants.find((v) => v.id === input.variantId)
        ?.price
    )
      throw new B2BError(
        "This variant has no contract price for your selected Store.",
      );
    if (!cart) {
      const { body } = await cartRoot(session)
        .post({
          body: {
            currency: context.currency,
            country: context.country,
            customerId: customer.id,
            store: { typeId: "store", key: context.storeKey },
            businessUnit: {
              typeId: "business-unit",
              key: context.businessUnitKey,
            },
            inventoryMode: "None",
          },
        })
        .execute();
      cart = body;
      session.cartId = body.id;
    }
    actions.push({
      action: "addLineItem",
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      distributionChannel: {
        typeId: "channel",
        id: context.distributionChannelId,
      },
    });
  } else if (input.action === "set-quantity") {
    if (!cart || !cart.lineItems.some((l) => l.id === input.lineItemId))
      throw new B2BError("Cart item not found.", 404);
    actions.push({
      action: "changeLineItemQuantity",
      lineItemId: input.lineItemId,
      quantity: input.quantity,
    });
  }
  if (cart && actions.length)
    await cartRoot(session)
      .withId({ ID: cart.id })
      .post({ body: { version: cart.version, actions } })
      .execute();
}
