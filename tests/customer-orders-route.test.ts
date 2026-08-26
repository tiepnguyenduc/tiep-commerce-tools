import { beforeEach, describe, expect, it, vi } from "vitest";

const listCustomerOrders = vi.hoisted(() => vi.fn());
const readCustomerOrderDetail = vi.hoisted(() => vi.fn());

vi.mock("../lib/ct/account", () => ({
  listCustomerOrders,
  readCustomerOrderDetail,
}));

import { GET } from "../app/api/customer/orders/route";

describe("customer orders route", () => {
  beforeEach(() => {
    listCustomerOrders.mockReset();
    readCustomerOrderDetail.mockReset();
  });

  it("returns the signed-in customer's order list", async () => {
    listCustomerOrders.mockResolvedValue([{ id: "order-1" }]);

    const response = await GET(new Request("http://localhost/api/customer/orders"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      orders: [{ id: "order-1" }],
    });
  });

  it("returns one order detail when an id is provided", async () => {
    readCustomerOrderDetail.mockResolvedValue({ id: "order-1" });

    const response = await GET(
      new Request("http://localhost/api/customer/orders?id=order-1"),
    );

    expect(response.status).toBe(200);
    expect(readCustomerOrderDetail).toHaveBeenCalledWith("order-1");
    await expect(response.json()).resolves.toEqual({ order: { id: "order-1" } });
  });

  it("returns 404 without exposing an inaccessible order", async () => {
    readCustomerOrderDetail.mockRejectedValue(new Error("Order not found."));

    const response = await GET(
      new Request("http://localhost/api/customer/orders?id=another-order"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Order not found." });
  });
});
