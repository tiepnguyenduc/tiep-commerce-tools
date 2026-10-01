import { NextResponse } from "next/server";
import { z } from "zod";
import { B2BError } from "@/lib/ct/b2b";
import {
  readBusinessAccount,
  mutateBusinessAccount,
  deleteBusinessAccount,
} from "@/lib/ct/b2b-account";
import {
  readB2BSession,
  writeB2BSession,
  sealSession,
} from "@/lib/b2b/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400, headers },
    );
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
  const e = error as {
    statusCode?: number;
    body?: {
      errors?: {
        code: string;
      }[];
    };
  };
  const code = e.body?.errors?.[0]?.code;
  const message =
    code === "InvalidCredentials" || code === "InvalidCurrentPassword"
      ? "The current password is incorrect."
      : code === "DuplicateField"
        ? "This email is already in use."
        : code === "ReferenceExists" || code === "ReferentialIntegrityViolation"
          ? "Your account is still referenced by business records. Ask your company administrator to remove the association before deleting your account."
          : e.statusCode === 409
            ? "Your account changed. Refresh and try again."
            : e.statusCode === 403
              ? "The business service does not have permission for this account operation."
              : "Your business account could not be updated. Please try again.";
  return NextResponse.json(
    { error: message },
    {
      status:
        e.statusCode && e.statusCode >= 400 && e.statusCode < 500
          ? e.statusCode
          : 502,
      headers,
    },
  );
}
function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new B2BError(
      "This request must originate from this storefront.",
      403,
    );
}
export async function GET() {
  try {
    const session = await readB2BSession();
    const profile = await readBusinessAccount(session);
    await writeB2BSession(session);
    return NextResponse.json({ profile }, { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const input = await request.json();
    const session = await readB2BSession();
    sealSession({});
    await mutateBusinessAccount(session, input);
    await writeB2BSession(session);
    if (!session.customer)
      return NextResponse.json(
        { passwordChanged: true, signedOut: true },
        { headers },
      );
    return NextResponse.json(
      { profile: await readBusinessAccount(session) },
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const input = await request.json();
    const session = await readB2BSession();
    sealSession({});
    await deleteBusinessAccount(session, input);
    await writeB2BSession(session);
    return NextResponse.json({ deleted: true }, { headers });
  } catch (e) {
    return failure(e);
  }
}
