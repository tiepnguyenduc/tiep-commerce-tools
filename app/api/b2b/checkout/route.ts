import { NextResponse } from "next/server";
import { readB2BSession, writeB2BSession } from "@/lib/b2b/session";
import { orderErrorResponse, readB2BCheckout } from "@/lib/ct/b2b-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const session = await readB2BSession();
    const previous = JSON.stringify(session);
    const checkout = await readB2BCheckout(session);
    if (JSON.stringify(session) !== previous) await writeB2BSession(session);
    return NextResponse.json({ checkout }, { headers });
  } catch (error) {
    const { status, error: message } = orderErrorResponse(error);
    return NextResponse.json({ error: message }, { status, headers });
  }
}
