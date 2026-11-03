import { NextResponse } from "next/server";
import { readB2BSession } from "@/lib/b2b/session";
import {
  approvalErrorResponse,
  listApprovalFlows,
} from "@/lib/ct/b2b-approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const businessUnitKey = new URL(request.url).searchParams.get(
      "businessUnitKey",
    );
    return NextResponse.json(
      await listApprovalFlows(await readB2BSession(), businessUnitKey),
      { headers },
    );
  } catch (error) {
    const { status, error: message } = approvalErrorResponse(error);
    return NextResponse.json({ error: message }, { status, headers });
  }
}
