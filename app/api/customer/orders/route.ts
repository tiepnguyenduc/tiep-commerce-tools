import { NextResponse } from "next/server";
import { listCustomerOrders } from "@/lib/ct/account";

export async function GET() {
  try {
    return NextResponse.json({ orders: await listCustomerOrders() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Orders read failed" },
      { status: 401 },
    );
  }
}
