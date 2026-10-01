import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { b2bAction, b2bState, B2BError } from "@/lib/ct/b2b";
import {
  readB2BSession,
  writeB2BSession,
  sealSession,
} from "@/lib/b2b/session";
import { canonicalStorefrontLocale } from "@/lib/ct/storefront-languages";
function requestLocale(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("locale");
  if (value === null) return undefined;
  const locale = canonicalStorefrontLocale(value);
  if (!locale) throw new B2BError("Invalid language locale.", 400);
  return locale;
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const email = z.string().trim().email().max(254);
const credentials = {
  email,
  password: z.string().min(1).max(256),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
};
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("login"), ...credentials }),
  z.object({
    action: z.literal("register"),
    ...credentials,
    password: z.string().min(8).max(256),
  }),
  z.object({ action: z.literal("logout") }),
  z.object({ action: z.literal("clear-context") }),
  z.object({
    action: z.literal("select-context"),
    businessUnitKey: z.string().min(1).max(256),
    storeKey: z.string().min(1).max(256),
  }),
  z.object({
    action: z.literal("create-business-unit"),
    name: z.string().trim().min(2).max(200),
  }),
  z.object({
    action: z.literal("add-associate"),
    email,
    businessUnitKey: z.string().min(1).max(256),
  }),
  z.object({
    action: z.literal("add-to-cart"),
    productId: z.string().uuid(),
    variantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(10000),
  }),
  z.object({
    action: z.literal("set-quantity"),
    lineItemId: z.string().uuid(),
    quantity: z.number().int().min(0).max(10000),
  }),
]);
function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Check the form fields." },
      { status: 400 },
    );
  if (error instanceof B2BError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  const e = error as {
    statusCode?: number;
    body?: { errors?: { code: string; message?: string }[] };
  };
  const code = e.body?.errors?.[0]?.code;
  if (code === "AssociateMissingPermission")
    return NextResponse.json(
      {
        error:
          "Your role in this business unit does not allow this action. Ask your company administrator to assign the buyer role for creating and updating your business bag.",
      },
      { status: 403 },
    );
  const message =
    code === "InvalidCredentials"
      ? "Email or password is incorrect."
      : code === "DuplicateField"
        ? "An account with this email already exists."
        : e.statusCode === 403
          ? "Your account or API client does not have permission for this business operation."
          : e.statusCode === 409
            ? "The cart changed. Refresh and try again."
            : code === "SearchDeactivated"
              ? "Product Search must be enabled for this commercetools project."
              : "The business service is temporarily unavailable. Please try again.";
  return NextResponse.json(
    { error: message },
    {
      status:
        e.statusCode && e.statusCode >= 400 && e.statusCode < 500
          ? e.statusCode
          : 502,
    },
  );
}
export async function GET(request: NextRequest) {
  try {
    const locale = requestLocale(request);
    const session = await readB2BSession();
    const previous = JSON.stringify(session);
    const state = await b2bState(
      session,
      request.nextUrl.searchParams.get("q")?.slice(0, 200),
      locale,
    );
    if (JSON.stringify(session) !== previous) await writeB2BSession(session);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin)
      throw new B2BError(
        "This request must originate from this storefront.",
        403,
      );
    const input = action.parse(await request.json());
    const locale = requestLocale(request);
    const session = await readB2BSession();
    sealSession({}); // Validate session configuration before creating any resources.
    await b2bAction(session, input);
    // Save successful auth/mutations even if a subsequent catalogue read is unavailable.
    await writeB2BSession(session);
    const state = await b2bState(session, "", locale);
    await writeB2BSession(session);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
