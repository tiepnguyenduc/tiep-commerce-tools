import { NextResponse } from "next/server";
import { readB2BSession } from "@/lib/b2b/session";
import { orderErrorResponse, readB2BOrder } from "@/lib/ct/b2b-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const businessUnitKey =
      new URL(request.url).searchParams.get("businessUnitKey") ?? "";
    return NextResponse.json(
      {
        order: await readB2BOrder(await readB2BSession(), id, businessUnitKey),
      },
      { headers },
    );
  } catch (error) {
    const { status, error: message } = orderErrorResponse(error);
    return NextResponse.json({ error: message }, { status, headers });
  }
}
