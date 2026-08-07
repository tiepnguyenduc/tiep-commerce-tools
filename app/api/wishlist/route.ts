import { NextResponse } from "next/server";
import { readWishlist } from "@/lib/ct/wishlist";

export async function GET() {
  try {
    return NextResponse.json({ wishlist: await readWishlist() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Wishlist read failed" },
      { status: 401 },
    );
  }
}
