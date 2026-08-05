import { NextResponse } from "next/server";
import { getB2BReadiness, getEnvReadiness, isCheckoutReady } from "@/lib/env";
export async function GET() {
  return NextResponse.json({
    ok: true,
    commercetools: getEnvReadiness(),
    b2b: getB2BReadiness(),
    checkoutReady: isCheckoutReady(),
  });
}
