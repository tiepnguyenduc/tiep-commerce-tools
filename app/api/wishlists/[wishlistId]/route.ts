import { NextResponse } from "next/server";
import { deleteWishlist, wishlistErrorStatus } from "@/lib/ct/wishlist";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ wishlistId: string }> },
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
