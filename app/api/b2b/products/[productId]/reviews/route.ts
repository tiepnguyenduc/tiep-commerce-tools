import { NextResponse } from "next/server";
import { readB2BSession } from "@/lib/b2b/session";
import { reviewRouteHandlers } from "@/lib/review-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST } = reviewRouteHandlers("b2b", {
  // Business reviews come from signed-in associates on this storefront only.
  async authorizeWrite(request) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json(
        { error: "This request must originate from this storefront." },
        { status: 403 },
      );
    }
    try {
      if ((await readB2BSession()).customer) return null;
    } catch {
      // An unreadable session is treated as signed out.
    }
    return NextResponse.json(
      { error: "Sign in to your business account to write a review." },
      { status: 401 },
    );
  },
});
