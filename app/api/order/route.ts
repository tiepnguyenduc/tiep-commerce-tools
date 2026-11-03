import { NextResponse } from "next/server";
import { z } from "zod";
import { getB2BReadiness, getEnvReadiness } from "@/lib/env";
import { createLiveOrder } from "@/lib/ct/cart";
import { readTrainingCart } from "@/lib/training-store";

const input = z.object({
  mode: z.enum(["b2c", "b2b"]).default("b2c"),
  purchaseOrderNumber: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order input" }, { status: 400 });
  }

  const trainingCart = readTrainingCart();
  if (!getEnvReadiness().ready) {
    if (!trainingCart.itemCount) {
      return NextResponse.json(
        { error: "Add an item before placing an order." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      training: true,
      order: {
        id:
          parsed.data.mode === "b2b" ? "training-b2b-order" : "training-order",
        orderNumber:
          parsed.data.mode === "b2b"
            ? parsed.data.purchaseOrderNumber || "PO-2026-104"
            : "WS-1042",
        status: parsed.data.mode === "b2b" ? "approval-pending" : "confirmed",
      },
    });
  }

  if (parsed.data.mode === "b2b" && !getB2BReadiness().ready) {
    return NextResponse.json(
      { error: "B2B associate context is not configured." },
      { status: 400 },
    );
  }

  try {
    const order = await createLiveOrder(
      parsed.data.mode,
      parsed.data.purchaseOrderNumber,
    );
    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        purchaseOrderNumber: order.purchaseOrderNumber,
        orderState: order.orderState,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Order creation failed" },
      { status: 502 },
    );
  }
}
