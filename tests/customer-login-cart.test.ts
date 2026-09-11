import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), login: vi.fn(), register: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../lib/env", () => ({ getEnvReadiness: () => ({ ready: true }) }));
vi.mock("../lib/ct/client", () => ({ getApiRoot: () => ({
  carts: () => ({ withId: () => ({ get: () => ({ execute: mocks.get }) }) }),
  login: () => ({ post: mocks.login }),
  customers: () => ({ post: mocks.register }),
}) }));
import { loginCustomer, registerCustomer } from "../lib/ct/customer";
import { getCartId, setCartId } from "../lib/ct/session";
const credentials = { email: "shopper@example.com", password: "test-password" };
beforeEach(() => {
  vi.clearAllMocks();
  globalThis.__commerceSession = {};
  setCartId("b2c", "old-cart");
  const result = { execute: async () => ({ body: { customer: { id: "customer", email: credentials.email }, cart: { id: "customer-cart" } } }) };
  mocks.login.mockReturnValue(result);
  mocks.register.mockReturnValue(result);
});
describe("customer authentication cart ownership", () => {
  it.each(["customer", "another-customer"])("does not merge a cart already owned by %s", async customerId => {
    mocks.get.mockResolvedValue({ body: { id: "old-cart", customerId, cartState: "Active" } });
    await loginCustomer(credentials);
    expect(mocks.login).toHaveBeenCalledWith({ body: credentials });
    expect(getCartId("b2c")).toBe("customer-cart");
  });
  it("still merges an active anonymous cart", async () => {
    mocks.get.mockResolvedValue({ body: { id: "old-cart", cartState: "Active" } });
    await loginCustomer(credentials);
    expect(mocks.login.mock.calls[0][0].body).toMatchObject({ anonymousCart: { typeId: "cart", id: "old-cart" }, anonymousCartSignInMode: "MergeWithExistingCustomerCart" });
  });
  it("allows login when the previous cart was deleted", async () => {
    mocks.get.mockRejectedValue({ statusCode: 404 });
    await loginCustomer(credentials);
    expect(mocks.login).toHaveBeenCalledWith({ body: credentials });
  });
  it("does not attach an owned cart when registering", async () => {
    mocks.get.mockResolvedValue({ body: { id: "old-cart", customerId: "previous", cartState: "Active" } });
    await registerCustomer(credentials);
    expect(mocks.register.mock.calls[0][0].body.anonymousCart).toBeUndefined();
  });
  it("preserves login errors instead of retrying credentials", async () => {
    mocks.get.mockResolvedValue({ body: { id: "old-cart", customerId: "previous", cartState: "Active" } });
    mocks.login.mockReturnValue({ execute: () => Promise.reject(new Error("Invalid credentials")) });
    await expect(loginCustomer(credentials)).rejects.toThrow("Invalid credentials");
    expect(mocks.login).toHaveBeenCalledTimes(1);
  });
});
