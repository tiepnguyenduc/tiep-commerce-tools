import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BusinessUnit,
  ProductProjection,
  Store,
} from "@commercetools/platform-sdk";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
const mocks = vi.hoisted(() => ({ getApiRoot: vi.fn() }));
vi.mock("../lib/ct/client", () => ({ getB2BApiRoot: mocks.getApiRoot }));
import {
  assertMember,
  cartMatchesContext,
  resolveContext,
  mapB2BProduct,
  requireCustomer,
  b2bAction,
} from "../lib/ct/b2b";
import { openSession, sealSession } from "../lib/b2b/session";
const unit = {
  key: "acme",
  status: "Active",
  storeMode: "Explicit",
  stores: [{ key: "acme-store" }],
  associates: [{ customer: { id: "alice" }, associateRoleAssignments: [] }],
} as unknown as BusinessUnit;
const store = {
  key: "acme-store",
  distributionChannels: [{ id: "price-acme" }],
} as unknown as Store;
const product = {
  id: "p",
  name: { en: "Loader" },
  slug: { en: "loader" },
  categories: [],
  masterVariant: {
    id: 1,
    price: {
      channel: { id: "price-acme" },
      value: {
        type: "centPrecision",
        fractionDigits: 2,
        centAmount: 12000,
        currencyCode: "USD",
      },
    },
    images: [],
  },
  variants: [],
} as unknown as ProductProjection;
beforeEach(() => {
  vi.stubEnv("B2B_SESSION_SECRET", "test-secret-for-encrypted-session-123");
  vi.stubEnv("CTP_B2B_CURRENCY", "USD");
  vi.stubEnv("CTP_B2B_COUNTRY", "US");
  vi.clearAllMocks();
});
describe("B2B customer boundary", () => {
  it("requires authentication independently of B2C state", () => {
    expect(() => requireCustomer({})).toThrow("sign in");
  });
  it("rejects another customer's unit and inactive membership", () => {
    expect(() => assertMember(unit, "bob")).toThrow();
    expect(() =>
      assertMember({ ...unit, status: "Inactive" }, "alice"),
    ).toThrow();
    expect(() => assertMember(unit, "alice")).not.toThrow();
  });
  it("authenticates encrypted sessions and rejects tampering", () => {
    const data = { customer: { id: "alice", email: "a@example.test" } };
    const encoded = sealSession(data);
    expect(encoded).not.toContain("alice");
    expect(openSession(encoded)).toMatchObject(data);
    expect(openSession(encoded.slice(0, -5) + "abcde")).toEqual({});
  });
  it("rejects expired sessions", () => {
    vi.useFakeTimers();
    const encoded = sealSession({
      customer: { id: "alice", email: "a@example.test" },
    });
    vi.advanceTimersByTime(9 * 3600_000);
    expect(openSession(encoded)).toEqual({});
    vi.useRealTimers();
  });
  it("rejects sessions issued for a different B2B project", () => {
    vi.stubEnv("CTP_B2B_PROJECT_KEY", "original-business");
    const encoded = sealSession({
      customer: { id: "alice", email: "a@example.test" },
    });
    vi.stubEnv("CTP_B2B_PROJECT_KEY", "new-business");
    expect(openSession(encoded)).toEqual({});
    vi.unstubAllEnvs();
  });
  it("logout drops context and cart", async () => {
    const session = {
      customer: { id: "alice", email: "a@example.test" },
      context: resolveContext(unit, store),
      cartId: "cart",
    };
    await b2bAction(session, { action: "logout" });
    expect(session).toEqual({});
  });
});
describe("Store-scoped contract prices", () => {
  it("rejects unassigned stores and ambiguous distribution channels", () => {
    expect(() => resolveContext(unit, { ...store, key: "other" })).toThrow();
    expect(() =>
      resolveContext(unit, { ...store, distributionChannels: [] }),
    ).toThrow();
    expect(() =>
      resolveContext(unit, {
        ...store,
        distributionChannels: [
          { typeId: "channel", id: "a" },
          { typeId: "channel", id: "b" },
        ],
      }),
    ).toThrow();
  });
  it("derives the price channel from the allowed Store", () =>
    expect(resolveContext(unit, store).distributionChannelId).toBe(
      "price-acme",
    ));
  it("shows no price to guests or a different Store", () => {
    expect(mapB2BProduct(product).price).toBeNull();
    expect(
      mapB2BProduct(product, {
        ...resolveContext(unit, store),
        distributionChannelId: "other",
      }).price,
    ).toBeNull();
  });
  it("uses only the channel-scoped price and preserves the currency", () => {
    expect(
      mapB2BProduct(product, resolveContext(unit, store)).price,
    ).toMatchObject({ centAmount: 12000, currencyCode: "USD" });
    expect(
      mapB2BProduct(product, {
        ...resolveContext(unit, store),
        currency: "EUR",
      }).price,
    ).toBeNull();
  });
  it("does not fall back to variant prices when selected price is missing", () => {
    const p = {
      ...product,
      masterVariant: {
        ...product.masterVariant,
        price: undefined,
        prices: [product.masterVariant.price!],
      },
    };
    expect(mapB2BProduct(p, resolveContext(unit, store)).price).toBeNull();
  });
});

function sdkFor(businessUnit: BusinessUnit) {
  const executeUnit = vi.fn().mockResolvedValue({ body: businessUnit });
  const update = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ body: businessUnit }),
  });
  const withKey = vi
    .fn()
    .mockReturnValue({ get: () => ({ execute: executeUnit }), post: update });
  const withAssociateIdValue = vi
    .fn()
    .mockReturnValue({ businessUnits: () => ({ withKey }) });
  const getStore = vi.fn().mockReturnValue({
    get: () => ({ execute: vi.fn().mockResolvedValue({ body: store }) }),
  });
  const role = vi.fn().mockReturnValue({
    get: () => ({
      execute: vi.fn().mockResolvedValue({ body: { permissions: [] } }),
    }),
  });
  const customers = vi.fn().mockReturnValue({
    get: () => ({
      execute: vi
        .fn()
        .mockResolvedValue({ body: { results: [{ id: "bob" }] } }),
    }),
  });
  mocks.getApiRoot.mockReturnValue({
    asAssociate: () => ({ withAssociateIdValue }),
    stores: () => ({ withKey: getStore }),
    associateRoles: () => ({ withKey: role }),
    customers,
  });
  return {
    executeUnit,
    update,
    withKey,
    withAssociateIdValue,
    getStore,
    role,
    customers,
  };
}
describe("B2B action authorization", () => {
  it("rejects a foreign BU before touching Store or session", async () => {
    const sdk = sdkFor({
      ...unit,
      associates: [
        {
          customer: { typeId: "customer", id: "bob" },
          associateRoleAssignments: [],
        },
      ],
    });
    const session = {
      customer: { id: "alice", email: "a@example.test" },
      cartId: "previous",
    };
    await expect(
      b2bAction(session, {
        action: "select-context",
        businessUnitKey: "other",
        storeKey: "acme-store",
      }),
    ).rejects.toThrow("not available");
    expect(sdk.getStore).not.toHaveBeenCalled();
    expect(session.cartId).toBe("previous");
    expect(sdk.withAssociateIdValue).toHaveBeenCalledWith({
      associateId: "alice",
    });
  });
  it("rejects an unassigned Store before replacing previous context", async () => {
    const sdk = sdkFor(unit);
    const context = resolveContext(unit, store);
    const session = {
      customer: { id: "alice", email: "a@example.test" },
      context,
      cartId: "previous",
    };
    await expect(
      b2bAction(session, {
        action: "select-context",
        businessUnitKey: "acme",
        storeKey: "private-store",
      }),
    ).rejects.toThrow("assigned");
    expect(sdk.getStore).not.toHaveBeenCalled();
    expect(session.context).toBe(context);
    expect(session.cartId).toBe("previous");
  });
  it("denies member assignment before customer lookup if caller cannot manage associates", async () => {
    const sdk = sdkFor(unit);
    await expect(
      b2bAction(
        { customer: { id: "alice", email: "a@example.test" } },
        {
          action: "add-associate",
          businessUnitKey: "acme",
          email: "b@example.test",
        },
      ),
    ).rejects.toThrow("administrator");
    expect(sdk.customers).not.toHaveBeenCalled();
    expect(sdk.update).not.toHaveBeenCalled();
  });
  it("assigns only the configured buyer role through asAssociate, with no Store required", async () => {
    const sdk = sdkFor({
      ...unit,
      version: 7,
      stores: [],
      associates: [
        {
          customer: { typeId: "customer", id: "alice" },
          associateRoleAssignments: [
            {
              associateRole: { typeId: "associate-role", key: "admin" },
              inheritance: "Enabled",
            },
          ],
        },
      ],
    });
    sdk.role.mockReturnValue({
      get: () => ({
        execute: vi
          .fn()
          .mockResolvedValue({ body: { permissions: ["UpdateAssociates"] } }),
      }),
    });
    await b2bAction(
      { customer: { id: "alice", email: "a@example.test" } },
      {
        action: "add-associate",
        businessUnitKey: "acme",
        email: "b@example.test",
      },
    );
    expect(sdk.withAssociateIdValue).toHaveBeenCalledWith({
      associateId: "alice",
    });
    expect(sdk.update).toHaveBeenCalledWith({
      body: {
        version: 7,
        actions: [
          {
            action: "addAssociate",
            associate: {
              customer: { typeId: "customer", id: "bob" },
              associateRoleAssignments: [
                {
                  associateRole: { typeId: "associate-role", key: "b2b-buyer" },
                  inheritance: "Enabled",
                },
              ],
            },
          },
        ],
      },
    });
    expect(sdk.getStore).not.toHaveBeenCalled();
  });
});

describe("Business cart propagation", () => {
  it.each(["price-acme", "price-preferred"])(
    "uses verified Store channel %s in projection and cart line",
    async (channel) => {
      const scopedStore = {
        ...store,
        distributionChannels: [{ typeId: "channel" as const, id: channel }],
      };
      const sdk = sdkFor(unit);
      sdk.getStore.mockReturnValue({
        get: () => ({
          execute: vi.fn().mockResolvedValue({ body: scopedStore }),
        }),
      });
      const projectionGet = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          body: {
            ...product,
            masterVariant: {
              ...product.masterVariant,
              price: {
                ...product.masterVariant.price,
                channel: { typeId: "channel", id: channel },
              },
            },
          },
        }),
      });
      const create = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          body: { id: "b2b-cart", version: 1, lineItems: [] },
        }),
      });
      const update = vi
        .fn()
        .mockReturnValue({ execute: vi.fn().mockResolvedValue({ body: {} }) });
      const cartQuery = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({ body: { results: [] } }),
      });
      const carts = {
        get: cartQuery,
        post: create,
        withId: vi.fn().mockReturnValue({ post: update }),
      };
      sdk.withAssociateIdValue.mockReturnValue({
        businessUnits: () => ({ withKey: sdk.withKey }),
        inBusinessUnitKeyWithBusinessUnitKeyValue: vi
          .fn()
          .mockReturnValue({ carts: () => carts }),
      } as never);
      const root = mocks.getApiRoot();
      root.inStoreKeyWithStoreKeyValue = vi.fn().mockReturnValue({
        productProjections: () => ({
          withId: () => ({ get: projectionGet }),
        }),
      });
      root.customers = () => ({
        withId: () => ({
          get: () => ({
            execute: vi
              .fn()
              .mockResolvedValue({ body: { customerGroup: { id: "group" } } }),
          }),
        }),
      });
      const session = {
        customer: { id: "alice", email: "a@example.test" },
        context: resolveContext(unit, scopedStore),
      };
      await b2bAction(session, {
        action: "add-to-cart",
        productId: "p",
        variantId: 1,
        quantity: 2,
      });
      expect(projectionGet).toHaveBeenCalledWith({
        queryArgs: expect.objectContaining({
          priceChannel: channel,
          priceCurrency: "USD",
          priceCountry: "US",
          priceCustomerGroupAssignments: ["group"],
        }),
      });
      expect(create).toHaveBeenCalledWith({
        body: expect.objectContaining({
          customerId: "alice",
          store: { typeId: "store", key: "acme-store" },
          businessUnit: { typeId: "business-unit", key: "acme" },
        }),
      });
      expect(update).toHaveBeenCalledWith({
        body: {
          version: 1,
          actions: [
            {
              action: "addLineItem",
              productId: "p",
              variantId: 1,
              quantity: 2,
              distributionChannel: { typeId: "channel", id: channel },
            },
          ],
        },
      });
      expect(cartQuery).toHaveBeenCalledWith({
        queryArgs: expect.objectContaining({
          where: expect.stringContaining('customerId="alice"'),
        }),
      });
    },
  );
});

it("does not restore a cart priced with the Store previous channel", () => {
  const session = {
    customer: { id: "alice", email: "a@example.test" },
    context: resolveContext(unit, store),
  };
  const cart = {
    cartState: "Active",
    customerId: "alice",
    store: { key: "acme-store" },
    businessUnit: { key: "acme" },
    country: "US",
    totalPrice: { currencyCode: "USD" },
    lineItems: [{ distributionChannel: { id: "old-channel" } }],
  } as unknown as import("@commercetools/platform-sdk").Cart;
  expect(cartMatchesContext(cart, session)).toBe(false);
  expect(cartMatchesContext({ ...cart, lineItems: [] }, session)).toBe(true);
  expect(
    cartMatchesContext({ ...cart, lineItems: [], country: "DE" }, session),
  ).toBe(false);
  expect(
    cartMatchesContext(
      { ...cart, lineItems: [], cartState: "Ordered" },
      session,
    ),
  ).toBe(false);
});

describe("B2B product attribute formatting", () => {
  it("renders sets, localized enums and booleans as readable specifications", () => {
    const mapped = mapB2BProduct({
      ...product,
      masterVariant: {
        ...product.masterVariant,
        attributes: [
          { name: "features", value: [{ key: "a", label: { "en-US": "Hydraulic" } }, { key: "b", label: "Tracked" }] },
          { name: "year", value: 2019 },
          { name: "available", value: true },
          { name: "relatedProducts", value: [{ typeId: "product", id: "related-id" }] },
        ],
      },
    });
    expect(mapped.variants[0].attributes.map((a) => a.value)).toEqual([
      "Hydraulic, Tracked", "2019", "Yes",
    ]);
  });
});
