import { NextResponse } from "next/server";
import { z } from "zod";
import { readB2BSession } from "@/lib/b2b/session";
import {
  addB2BWishlistItem,
  b2bWishlistErrorStatus,
  removeB2BWishlistItem,
} from "@/lib/ct/b2b-wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addInput = z.object({
  productId: z.string().uuid(),
  variantId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const parsed = addInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid wishlist item" },
      { status: 400 },
    );
  }

  try {
    const session = await readB2BSession();
    if (!session.customer) throw new Error("B2B login required.");
    return NextResponse.json({
      wishlist: await addB2BWishlistItem(session.customer.id, parsed.data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Wishlist update failed",
      },
      { status: b2bWishlistErrorStatus(error) },
    );
  }
}

export async function DELETE(request: Request) {
  const lineItemId = new URL(request.url).searchParams.get("lineItemId");
  if (!lineItemId) {
    return NextResponse.json(
      { error: "Wishlist line item id is required" },
      { status: 400 },
    );
  }

  try {
    const session = await readB2BSession();
    if (!session.customer) throw new Error("B2B login required.");
    return NextResponse.json({
      wishlist: await removeB2BWishlistItem(session.customer.id, lineItemId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Wishlist remove failed",
      },
      { status: b2bWishlistErrorStatus(error) },
    );
  }
}
