import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteWishlist,
  renameWishlist,
  wishlistErrorStatus,
} from "@/lib/ct/wishlist";

const renameInput = z.object({
  name: z.string().trim().min(1).max(100),
});

type WishlistRouteContext = {
  params: Promise<{ wishlistId: string }>;
};

export async function PUT(
  request: Request,
  { params }: WishlistRouteContext,
) {
  const parsed = renameInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Wishlist name must be between 1 and 100 characters." },
      { status: 400 },
    );
  }

  const { wishlistId } = await params;
  try {
    return NextResponse.json({
      wishlist: await renameWishlist(wishlistId, parsed.data.name),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wishlist rename failed" },
      { status: wishlistErrorStatus(error) },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: WishlistRouteContext,
) {
  const { wishlistId } = await params;
  try {
    await deleteWishlist(wishlistId);
    return NextResponse.json({ deletedId: wishlistId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wishlist delete failed" },
      { status: wishlistErrorStatus(error) },
    );
  }
}
