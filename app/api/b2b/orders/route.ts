import { NextResponse } from "next/server";
import { readB2BSession, writeB2BSession } from "@/lib/b2b/session";
import { B2BError } from "@/lib/ct/b2b";
import { orderErrorResponse, placeB2BOrder } from "@/lib/ct/b2b-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new B2BError(
        "This request must originate from this storefront.",
        403,
      );
    const session = await readB2BSession();
    const order = await placeB2BOrder(session, await request.json());
    await writeB2BSession(session);
    return NextResponse.json({ order }, { status: 201, headers });
  } catch (error) {
    const { status, error: message } = orderErrorResponse(error);
    return NextResponse.json({ error: message }, { status, headers });
  }
}
