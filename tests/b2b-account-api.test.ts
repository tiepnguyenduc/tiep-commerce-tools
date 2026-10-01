import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getB2BApiRoot: vi.fn(),
  readB2BSession: vi.fn(),
  writeB2BSession: vi.fn(),
  sealSession: vi.fn(),
}));
vi.mock("../lib/ct/client", () => ({ getB2BApiRoot: mocks.getB2BApiRoot }));
vi.mock("../lib/b2b/session", () => mocks);
import {
  deleteBusinessAccount,
  mutateBusinessAccount,
  readBusinessAccount,
} from "../lib/ct/b2b-account";
import { PATCH, DELETE } from "../app/api/b2b/account/route";
const customer = {
  id: "own",
  version: 17,
  email: "owner@example.com",
  addresses: [{ id: "address", company: "Old", country: "US" }],
};
let post: ReturnType<typeof vi.fn>,
  remove: ReturnType<typeof vi.fn>,
  login: ReturnType<typeof vi.fn>;
const session = () => ({ customer: { id: "own", email: "owner@example.com" } });
beforeEach(() => {
  vi.resetAllMocks();
  post = vi.fn().mockResolvedValue({ body: customer });
  remove = vi.fn().mockResolvedValue({ body: customer });
  login = vi.fn().mockResolvedValue({ body: { customer } });
  mocks.getB2BApiRoot.mockReturnValue({
    get: () => ({ execute: async () => ({ body: { countries: ["US"] } }) }),
    login: () => ({ post: () => ({ execute: login }) }),
    customers: () => ({
      withId: () => ({
        get: () => ({ execute: async () => ({ body: customer }) }),
        post: (args: unknown) => ({ execute: () => post(args) }),
        delete: (args: unknown) => ({ execute: () => remove(args) }),
      }),
      password: () => ({
        post: (args: unknown) => ({ execute: () => post(args) }),
      }),
    }),
  });
});
describe("B2B account boundaries", () => {
  it("rejects unauthenticated reads", async () => {
    await expect(readBusinessAccount({})).rejects.toMatchObject({
      status: 401,
    });
  });
  it("rejects cross-origin and missing-origin writes before session or mutation", async () => {
    for (const handler of [PATCH, DELETE]) {
      const r = await handler(
        new Request("http://localhost/api/b2b/account", {
          method: handler === PATCH ? "PATCH" : "DELETE",
          headers: { origin: "https://elsewhere.example" },
          body: "{}",
        }),
      );
      expect(r.status).toBe(403);
    }
    expect(mocks.readB2BSession).not.toHaveBeenCalled();
  });
  it("rejects another customer's address without updating", async () => {
    await expect(
      mutateBusinessAccount(session(), {
        action: "delete-address",
        addressId: "other",
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(post).not.toHaveBeenCalled();
  });
  it("requires company and recipient names, and project-supported country", async () => {
    const address = {
      company: "Acme",
      firstName: "A",
      lastName: "B",
      streetName: "Main",
      city: "Town",
      postalCode: "123",
      country: "US",
    };
    await expect(
      mutateBusinessAccount(session(), {
        action: "save-address",
        address: { ...address, company: "" },
      }),
    ).rejects.toThrow();
    await expect(
      mutateBusinessAccount(session(), {
        action: "save-address",
        address: { ...address, country: "DE" },
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(post).not.toHaveBeenCalled();
  });
  it("uses fresh version and atomically assigns a new default address", async () => {
    await mutateBusinessAccount(session(), {
      action: "save-address",
      address: {
        company: "Acme",
        firstName: "A",
        lastName: "B",
        streetName: "Main",
        city: "Town",
        postalCode: "123",
        country: "US",
      },
      defaultShipping: true,
    });
    const body = post.mock.calls[0][0].body;
    expect(body.version).toBe(17);
    expect(body.actions[0].address.company).toBe("Acme");
    expect(body.actions[1].addressKey).toBe(body.actions[0].address.key);
  });
  it("requires password verification matching the session customer before deletion", async () => {
    login.mockResolvedValue({
      body: { customer: { ...customer, id: "other" } },
    });
    const s = session();
    await expect(
      deleteBusinessAccount(s, { password: "secret", confirmation: "DELETE" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(remove).not.toHaveBeenCalled();
    expect(s.customer.id).toBe("own");
    login.mockRejectedValue({
      statusCode: 400,
      body: { errors: [{ code: "InvalidCredentials" }] },
    });
    await expect(
      deleteBusinessAccount(s, { password: "wrong", confirmation: "DELETE" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(remove).not.toHaveBeenCalled();
  });
  it("clears session only after successful versioned deletion", async () => {
    const s = session();
    remove.mockRejectedValueOnce({ statusCode: 400 });
    await expect(
      deleteBusinessAccount(s, { password: "secret", confirmation: "DELETE" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(s.customer.id).toBe("own");
    await deleteBusinessAccount(s, {
      password: "secret",
      confirmation: "DELETE",
    });
    expect(s).toEqual({});
    expect(remove).toHaveBeenLastCalledWith({ queryArgs: { version: 17 } });
  });
  it("rotates out the current session after password change", async () => {
    const s = session();
    await mutateBusinessAccount(s, {
      action: "change-password",
      currentPassword: "old",
      newPassword: "new-secret",
    });
    expect(s).toEqual({});
    expect(post.mock.calls[0][0].body).toMatchObject({
      id: "own",
      version: 17,
      currentPassword: "old",
      newPassword: "new-secret",
    });
  });
  it("unsets existing defaults only when explicitly unchecked", async () => {
    const c = customer as typeof customer & {
      defaultShippingAddressId?: string;
      defaultBillingAddressId?: string;
    };
    c.defaultShippingAddressId = "address";
    c.defaultBillingAddressId = "address";
    const address = {
      id: "address",
      company: "Acme",
      firstName: "A",
      lastName: "B",
      streetName: "Main",
      city: "Town",
      postalCode: "123",
      country: "US",
    };
    await mutateBusinessAccount(session(), {
      action: "save-address",
      address,
      defaultShipping: false,
      defaultBilling: false,
    });
    expect(post.mock.calls[0][0].body.actions).toContainEqual({
      action: "setDefaultShippingAddress",
    });
    expect(post.mock.calls[0][0].body.actions).toContainEqual({
      action: "setDefaultBillingAddress",
    });
    post.mockClear();
    await mutateBusinessAccount(session(), { action: "save-address", address });
    expect(post.mock.calls[0][0].body.actions).toHaveLength(1);
    delete c.defaultShippingAddressId;
    delete c.defaultBillingAddressId;
  });
  it("returns 400 for malformed JSON without exposing parse details", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/b2b/account", {
        method: "PATCH",
        headers: { origin: "http://localhost" },
        body: "invalid-json",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON request." });
  });
  it("rejects missing Origin on every write", async () => {
    for (const handler of [PATCH, DELETE]) {
      const response = await handler(
        new Request("http://localhost/api/b2b/account", {
          method: handler === PATCH ? "PATCH" : "DELETE",
          body: "{}",
        }),
      );
      expect(response.status).toBe(403);
    }
    expect(mocks.readB2BSession).not.toHaveBeenCalled();
  });
  it("returns personal company addresses and only verified company role assignments", async () => {
    const root = mocks.getB2BApiRoot();
    root.businessUnits = () => ({
      get: () => ({
        execute: async () => ({
          body: {
            results: [
              {
                key: "company",
                name: "Acme",
                status: "Active",
                associates: [
                  {
                    customer: { id: "own" },
                    associateRoleAssignments: [
                      { associateRole: { key: "buyer" } },
                    ],
                  },
                ],
                stores: [{ key: "assigned-store" }],
              },
              {
                key: "other",
                name: "Unrelated",
                status: "Active",
                associates: [
                  {
                    customer: { id: "someone-else" },
                    associateRoleAssignments: [
                      { associateRole: { key: "admin" } },
                    ],
                  },
                ],
                stores: [],
              },
            ],
          },
        }),
      }),
    });
    const c = customer as typeof customer & {
      defaultShippingAddressId?: string;
    };
    c.defaultShippingAddressId = "address";
    const profile = await readBusinessAccount(session());
    expect(profile.addresses[0]).toMatchObject({
      id: "address",
      company: "Old",
    });
    expect(profile.defaultShippingAddressId).toBe("address");
    expect(profile.companies).toEqual([
      {
        key: "company",
        name: "Acme",
        roles: ["buyer"],
        stores: ["assigned-store"],
      },
    ]);
    expect(profile.countries).toEqual(["US"]);
    delete c.defaultShippingAddressId;
  });
  it("preserves legacy country and hidden address fields when editing", async () => {
    const original = customer.addresses;
    customer.addresses = [
      {
        id: "legacy",
        company: "Legacy",
        country: "CA",
        state: "Ontario",
        key: "retained-key",
        department: "Procurement",
        building: "North",
      },
    ] as unknown as typeof customer.addresses;
    const address = {
      id: "legacy",
      company: "Updated",
      firstName: "A",
      lastName: "B",
      streetName: "Main",
      city: "Town",
      postalCode: "123",
      country: "CA",
      region: "Quebec",
    };
    try {
      await mutateBusinessAccount(session(), {
        action: "save-address",
        address,
      });
      expect(post.mock.calls[0][0].body.actions[0].address).toMatchObject({
        company: "Updated",
        country: "CA",
        key: "retained-key",
        department: "Procurement",
        building: "North",
        state: "Quebec",
        region: "Quebec",
      });
      post.mockClear();
      await expect(
        mutateBusinessAccount(session(), {
          action: "save-address",
          address: { ...address, country: "DE" },
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(post).not.toHaveBeenCalled();
      mocks.getB2BApiRoot().businessUnits = () => ({
        get: () => ({ execute: async () => ({ body: { results: [] } }) }),
      });
      expect((await readBusinessAccount(session())).addresses[0].region).toBe(
        "Ontario",
      );
    } finally {
      customer.addresses = original;
    }
  });
});
