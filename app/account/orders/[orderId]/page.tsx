import { notFound } from "next/navigation";
import { AccountPageView } from "../../account-page-content";
import { readCustomerOrderDetail, readCustomerProfile } from "@/lib/ct/account";
import type { CustomerOrderDetail, CustomerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function readCustomer(): Promise<CustomerProfile | null> {
  try {
    return await readCustomerProfile();
  } catch {
    return null;
  }
}

async function readOrder(orderId: string): Promise<CustomerOrderDetail | null> {
  try {
    return await readCustomerOrderDetail(orderId);
  } catch (error) {
    if (error instanceof Error && error.message === "Order not found.")
      return null;
    throw error;
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const customer = await readCustomer();
  if (!customer) {
    return AccountPageView({ customer: null, initialPage: "orders" });
  }

  const order = await readOrder(orderId);
  if (!order) notFound();

  return AccountPageView({
    customer,
    initialOrder: order,
    initialPage: "orders",
  });
}
