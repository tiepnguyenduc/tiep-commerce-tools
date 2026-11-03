import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { B2BOrderConfirmation } from "../lib/b2b/order-types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getB2BApiRoot: vi.fn(),
  readB2BSession: vi.fn(),
  writeB2BSession: vi.fn(),
  cartFor: vi.fn(),
  cartRoot: vi.fn(),
  verifiedContext: vi.fn(),
  unitFor: vi.fn(),
}));
vi.mock("../lib/ct/client", () => ({ getB2BApiRoot: mocks.getB2BApiRoot }));
vi.mock("../lib/b2b/session", () => ({
  readB2BSession: mocks.readB2BSession,
  writeB2BSession: mocks.writeB2BSession,
}));
vi.mock("../lib/ct/b2b", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/ct/b2b")>()),
  cartFor: mocks.cartFor,
  cartRoot: mocks.cartRoot,
  verifiedContext: mocks.verifiedContext,
}));
vi.mock("../lib/ct/b2b-company", () => ({ unitFor: mocks.unitFor }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
vi.mock("@/components/commercetools-ui/atoms/image", () => ({ default: ({ src, alt }: any) => <img src={src} alt={alt} /> }));
vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));
vi.mock("@/components/b2b/B2BProvider", () => ({ useB2B: () => ({ reload: vi.fn() }) }));

import { placeB2BOrder, readB2BOrder } from "../lib/ct/b2b-order";
import { POST } from "../app/api/b2b/orders/route";
import { B2BOrderConfirmationView, orderHref } from "../components/b2b/B2BCheckout";

const money = (centAmount: number) => ({ type: "centPrecision", centAmount, currencyCode: "USD", fractionDigits: 2 });
const address = { id: "addr-1", company: "Acme", streetName: "Main St", streetNumber: "1", city: "Austin", postalCode: "73301", country: "US" };
const unit = { key: "acme", name: "Acme Equipment", addresses: [address], defaultShippingAddressId: "addr-1" };
const context = { businessUnitKey: "acme", storeKey: "acme-store", currency: "USD", country: "US", distributionChannelId: "ch" };
const lineItem = {
  id: "line-1",
  productId: "p1",
  name: { "en-US": "Loader" },
  quantity: 2,
  variant: { id: 1, sku: "LD-1", images: [] },
  price: { value: money(2100000) },
  totalPrice: money(4200000),
};
const cart = { id: "cart-1", version: 7, lineItems: [lineItem], totalPrice: money(4200000) };
const session = () => ({ customer: { id: "buyer", email: "buyer@example.test" }, context, cartId: "cart-1" });

function api({ shippingMethods = [{ id: "ship-1", isDefault: true }] } = {}) {
  const cartUpdate = vi.fn(async ({ body }) => ({ body: { ...cart, version: body.version + 1 } }));
  const orderPost = vi.fn(async ({ body }) => ({ body: { id: "order-1", orderNumber: body.orderNumber } }));
  const flowsGet = vi.fn(async () => ({ body: { results: [{ id: "flow-1", status: "Pending" }] } }));
  const orderGet = vi.fn(async () => ({
    body: {
      ...cart,
      id: "order-1",
      orderNumber: "B2B-20261103-ABC123",
      purchaseOrderNumber: "PO-77",
      createdAt: "2026-11-03T08:00:00.000Z",
      orderState: "Open",
      businessUnit: { key: "acme" },
      store: { key: "acme-store" },
      shippingAddress: address,
    },
  }));
  mocks.cartRoot.mockReturnValue({ withId: () => ({ post: (args: unknown) => ({ execute: () => cartUpdate(args) }) }) });
  mocks.getB2BApiRoot.mockReturnValue({
    shippingMethods: () => ({ matchingCart: () => ({ get: () => ({ execute: async () => ({ body: { results: shippingMethods } }) }) }) }),
    asAssociate: () => ({
      withAssociateIdValue: () => ({
        inBusinessUnitKeyWithBusinessUnitKeyValue: () => ({
          orders: () => ({
            post: (args: unknown) => ({ execute: () => orderPost(args) }),
            withId: () => ({ get: () => ({ execute: orderGet }) }),
          }),
          approvalFlows: () => ({ get: () => ({ execute: flowsGet }) }),
        }),
      }),
    }),
  });
  return { cartUpdate, orderPost };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifiedContext.mockResolvedValue({ unit, context, store: { key: "acme-store", name: { "en-US": "Acme Store" } } });
  mocks.cartFor.mockResolvedValue(cart);
  mocks.unitFor.mockResolvedValue(unit);
});

describe("B2B order placement", () => {
  it("sets the delivery address and shipping method, then places the order as the associate with its PO number", async () => {
    const { cartUpdate, orderPost } = api();
    const current = session();
    const order = await placeB2BOrder(current, { purchaseOrderNumber: " PO-77 ", addressId: "addr-1", cartVersion: 7 });

    const [addresses, shipping] = cartUpdate.mock.calls.map(([args]) => args.body);
    expect(addresses.version).toBe(7);
    expect(addresses.actions.map((a: { action: string }) => a.action)).toEqual(["setShippingAddress", "setBillingAddress"]);
    expect(addresses.actions[0].address).toMatchObject({ city: "Austin", country: "US", id: undefined });
    expect(shipping.actions[0]).toEqual({ action: "setShippingMethod", shippingMethod: { typeId: "shipping-method", id: "ship-1" } });
    const draft = orderPost.mock.calls[0][0].body;
    expect(draft).toMatchObject({ cart: { typeId: "cart", id: "cart-1" }, version: 9, purchaseOrderNumber: "PO-77" });
    expect(draft.orderNumber).toMatch(/^B2B-\d{8}-[A-Z0-9]{6}$/);
    expect(order).toEqual({ id: "order-1", orderNumber: draft.orderNumber, businessUnitKey: "acme" });
    expect(current.cartId).toBeUndefined();
  });

  it("places the order without shipping info when no shipping method matches", async () => {
    const { cartUpdate, orderPost } = api({ shippingMethods: [] });
    await placeB2BOrder(session(), { purchaseOrderNumber: "PO-1", addressId: "addr-1", cartVersion: 7 });
    expect(cartUpdate).toHaveBeenCalledTimes(1);
    expect(orderPost.mock.calls[0][0].body.version).toBe(8);
  });

  it("rejects a changed bag, an unknown address and an invalid PO number before ordering", async () => {
    const { orderPost } = api();
    await expect(placeB2BOrder(session(), { purchaseOrderNumber: "PO-1", addressId: "addr-1", cartVersion: 6 }))
      .rejects.toMatchObject({ status: 409 });
    await expect(placeB2BOrder(session(), { purchaseOrderNumber: "PO-1", addressId: "other", cartVersion: 7 }))
      .rejects.toThrow("delivery addresses");
    await expect(placeB2BOrder(session(), { purchaseOrderNumber: "<script>", addressId: "addr-1", cartVersion: 7 }))
      .rejects.toThrow();
    mocks.cartFor.mockResolvedValue({ ...cart, lineItems: [] });
    await expect(placeB2BOrder(session(), { purchaseOrderNumber: "PO-1", addressId: "addr-1", cartVersion: 7 }))
      .rejects.toThrow("empty");
    expect(orderPost).not.toHaveBeenCalled();
  });

  it("requires same-origin requests and saves the closed bag in the session", async () => {
    api();
    mocks.readB2BSession.mockResolvedValue(session());
    const body = JSON.stringify({ purchaseOrderNumber: "PO-1", addressId: "addr-1", cartVersion: 7 });
    const blocked = await POST(new Request("https://shop.test/api/b2b/orders", { method: "POST", headers: { origin: "https://evil.test" }, body }));
    expect(blocked.status).toBe(403);

    const created = await POST(new Request("https://shop.test/api/b2b/orders", { method: "POST", headers: { origin: "https://shop.test" }, body }));
    expect(created.status).toBe(201);
    expect(mocks.writeB2BSession).toHaveBeenCalledWith(expect.not.objectContaining({ cartId: expect.anything() }));
  });

  it("reads the order with its PO number and pending approval", async () => {
    api();
    const order = await readB2BOrder(session(), "order-1", "acme");
    expect(order).toMatchObject({
      orderNumber: "B2B-20261103-ABC123",
      purchaseOrderNumber: "PO-77",
      businessUnit: { key: "acme", name: "Acme Equipment" },
      approval: { id: "flow-1", status: "Pending" },
    });
    expect(order.shippingAddress).toMatchObject({ street: "1 Main St", city: "Austin" });
    expect(order.order.total.centAmount).toBe(4200000);
  });
});

describe("B2B order confirmation page", () => {
  const confirmation = (approval: B2BOrderConfirmation["approval"]): B2BOrderConfirmation => ({
    id: "order-1",
    orderNumber: "B2B-20261103-ABC123",
    purchaseOrderNumber: "PO-77",
    createdAt: "2026-11-03T08:00:00.000Z",
    orderState: "Open",
    businessUnit: { key: "acme", name: "Acme Equipment" },
    storeKey: "acme-store",
    order: {
      id: "order-1",
      version: 1,
      mode: "b2b",
      lines: [],
      itemCount: 0,
      subtotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      taxTotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      discountTotal: { centAmount: 0, currencyCode: "USD", formatted: "$0.00" },
      total: { centAmount: 4200000, currencyCode: "USD", formatted: "$42,000.00" },
      discountCodes: [],
    },
    shippingAddress: null,
    shippingMethod: "",
    shippingPrice: null,
    approval,
  });

  it("shows the PO number and links a pending order to its approval flow", () => {
    const html = renderToStaticMarkup(<B2BOrderConfirmationView order={confirmation({ id: "flow-1", status: "Pending" })} />);
    expect(html).toContain("waiting for approval");
    expect(html).toContain("PO-77");
    expect(html).toContain("$42,000.00");
    expect(html).toContain('href="/b2b/account/approval-flows/flow-1?businessUnitKey=acme"');
  });

  it("confirms an order that needs no approval", () => {
    const html = renderToStaticMarkup(<B2BOrderConfirmationView order={confirmation(null)} />);
    expect(html).toContain("your order has been placed");
    expect(html).not.toContain("approval-flows");
  });

  it("builds the confirmation link with the business unit", () => {
    expect(orderHref({ id: "order-1", businessUnitKey: "acme co" })).toBe("/b2b/orders/order-1?businessUnitKey=acme%20co");
  });
});
