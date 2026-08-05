import { NextResponse } from "next/server";
import { isCheckoutReady } from "@/lib/env";
import { readLiveCart } from "@/lib/ct/cart";
import { readTrainingCart } from "@/lib/training-store";
import { createCheckoutSession } from "@/lib/ct/checkout";

const modes = new Set(["b2c", "b2b"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode = modes.has(body.mode) ? (body.mode as "b2c" | "b2b") : "b2c";

  if (!isCheckoutReady())
    return NextResponse.json({
      training: true,
      reason: "Checkout credentials or application key are not configured.",
    });

  try {
    const cart = await readLiveCart(mode);
    if (!cart?.itemCount) {
      return NextResponse.json(
        { error: "Add an item before checkout." },
        { status: 400 },
      );
    }
    return NextResponse.json(await createCheckoutSession(cart.id));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout session failed" },
      { status: 502 },
    );
  }
}
