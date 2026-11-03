import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addWishlistItem,
  removeWishlistItem,
  wishlistErrorStatus,
} from "@/lib/ct/wishlist";

const addInput = z.object({
  productId: z.string().min(1),
  variantId: z.number().int().positive().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ wishlistId: string }> },
) {
  const parsed = addInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid wishlist item" },
      { status: 400 },
    );
  }
  const { wishlistId } = await params;

  try {
    return NextResponse.json({
      wishlist: await addWishlistItem(parsed.data, wishlistId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Wishlist update failed",
      },
      { status: wishlistErrorStatus(error) },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ wishlistId: string }> },
) {
  const lineItemId = new URL(request.url).searchParams.get("lineItemId");
  if (!lineItemId) {
    return NextResponse.json(
      { error: "Wishlist line item id is required" },
      { status: 400 },
    );
  }
  const { wishlistId } = await params;

  try {
    return NextResponse.json({
      wishlist: await removeWishlistItem(lineItemId, wishlistId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Wishlist remove failed",
      },
      { status: wishlistErrorStatus(error) },
    );
  }
}
