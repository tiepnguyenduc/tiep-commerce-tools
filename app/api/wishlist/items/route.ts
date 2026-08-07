import { NextResponse } from "next/server";
import { z } from "zod";
import { addWishlistItem, removeWishlistItem } from "@/lib/ct/wishlist";

const addInput = z.object({
  productId: z.string(),
  variantId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const parsed = addInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid wishlist item" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      wishlist: await addWishlistItem(parsed.data),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Wishlist update failed" },
      { status: 401 },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const lineItemId = url.searchParams.get("lineItemId");
  if (!lineItemId) {
    return NextResponse.json(
      { error: "Wishlist line item id is required" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      wishlist: await removeWishlistItem(lineItemId),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Wishlist remove failed" },
      { status: 401 },
    );
  }
}
