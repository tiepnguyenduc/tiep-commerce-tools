import { NextResponse } from "next/server";
import { listCustomerOrders, readCustomerOrderDetail } from "@/lib/ct/account";

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("id");
  try {
    if (orderId) {
      return NextResponse.json({
        order: await readCustomerOrderDetail(orderId),
      });
    }
    return NextResponse.json({ orders: await listCustomerOrders() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Orders read failed";
    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Order not found."
            ? 404
            : message === "Customer login required."
              ? 401
              : 502,
      },
    );
  }
}
