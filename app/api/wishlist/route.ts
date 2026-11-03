import { NextResponse } from "next/server";
import { readWishlists, wishlistErrorStatus } from "@/lib/ct/wishlist";

export async function GET() {
  try {
    const wishlists = await readWishlists();
    return NextResponse.json({ wishlist: wishlists[0], wishlists });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Wishlist read failed" },
      { status: wishlistErrorStatus(e) },
    );
  }
}
