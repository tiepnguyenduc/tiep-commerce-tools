import { NextResponse } from "next/server";
import { z } from "zod";
import { readB2BSession } from "@/lib/b2b/session";
import { B2BError } from "@/lib/ct/b2b";
import {
  mutateCompanyWorkspace,
  readCompanyWorkspace,
} from "@/lib/ct/b2b-company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Check the form fields." },
      { status: 400, headers },
    );
  if (error instanceof B2BError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  const problem = error as {
    statusCode?: number;
    body?: { errors?: { code?: string }[] };
  };
  const code = problem.body?.errors?.[0]?.code;
  const message =
    code === "AssociateMissingPermission" || problem.statusCode === 403
      ? "Your role does not allow this company change."
      : problem.statusCode === 409
        ? "The company changed. Refresh and try again."
        : "The company change could not be completed.";
  return NextResponse.json(
    { error: message },
    {
      status:
        problem.statusCode && problem.statusCode < 500
          ? problem.statusCode
          : 502,
      headers,
    },
  );
}

export async function GET() {
  try {
    return NextResponse.json(
      { company: await readCompanyWorkspace(await readB2BSession()) },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new B2BError(
        "This request must originate from this storefront.",
        403,
      );
    const session = await readB2BSession();
    await mutateCompanyWorkspace(session, await request.json());
    return NextResponse.json(
      { company: await readCompanyWorkspace(session) },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
