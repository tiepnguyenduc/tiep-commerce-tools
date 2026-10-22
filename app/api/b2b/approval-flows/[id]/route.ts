import { NextResponse } from "next/server";
import { readB2BSession } from "@/lib/b2b/session";
import { B2BError } from "@/lib/ct/b2b";
import { approvalErrorResponse, decideApprovalFlow, readApprovalFlow } from "@/lib/ct/b2b-approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ id: string }> };

function failure(error: unknown) {
  const { status, error: message } = approvalErrorResponse(error);
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const businessUnitKey = new URL(request.url).searchParams.get("businessUnitKey") ?? "";
    return NextResponse.json({ flow: await readApprovalFlow(await readB2BSession(), id, businessUnitKey) }, { headers });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new B2BError("This request must originate from this storefront.", 403);
    const { id } = await params;
    const session = await readB2BSession();
    return NextResponse.json({ flow: await decideApprovalFlow(session, id, await request.json()) }, { headers });
  } catch (error) { return failure(error); }
}
