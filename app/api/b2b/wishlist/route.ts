import { NextResponse } from "next/server";
import { readB2BSession } from "@/lib/b2b/session";
import {
  b2bWishlistErrorStatus,
  readB2BWishlist,
} from "@/lib/ct/b2b-wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await readB2BSession();
    if (!session.customer) throw new Error("B2B login required.");
    return NextResponse.json(
      { wishlist: await readB2BWishlist(session.customer.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Wishlist read failed",
      },
      { status: b2bWishlistErrorStatus(error) },
    );
  }
}
