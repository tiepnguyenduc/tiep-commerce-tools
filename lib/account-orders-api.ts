import type {
  CustomerOrderDetail,
  CustomerOrderSummary,
} from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Order request failed");
  return data;
}

export async function fetchCustomerOrders() {
  const data = await readJson<{ orders: CustomerOrderSummary[] }>(
    await fetch("/api/customer/orders"),
  );
  return data.orders;
}

export async function fetchCustomerOrder(orderId: string) {
  const data = await readJson<{ order: CustomerOrderDetail }>(
    await fetch(`/api/customer/orders?id=${encodeURIComponent(orderId)}`),
  );
  return data.order;
}
