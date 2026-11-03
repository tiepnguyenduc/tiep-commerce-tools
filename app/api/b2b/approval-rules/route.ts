import { NextResponse } from "next/server";
import { readB2BSession } from "@/lib/b2b/session";
import { B2BError } from "@/lib/ct/b2b";
import {
  approvalRuleErrorResponse,
  readApprovalRules,
  saveApprovalRule,
} from "@/lib/ct/b2b-approval-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

function failure(error: unknown) {
  const { status, error: message } = approvalRuleErrorResponse(error);
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(request: Request) {
  try {
    const businessUnitKey = new URL(request.url).searchParams.get(
      "businessUnitKey",
    );
    return NextResponse.json(
      await readApprovalRules(await readB2BSession(), businessUnitKey),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new B2BError(
        "This request must originate from this storefront.",
        403,
      );
    const body = await request.json();
    if (body && typeof body === "object" && "id" in body)
      throw new B2BError("Use the rule address to update an existing rule.");
    return NextResponse.json(
      { rule: await saveApprovalRule(await readB2BSession(), body) },
      { status: 201, headers },
    );
  } catch (error) {
    return failure(error);
  }
}
