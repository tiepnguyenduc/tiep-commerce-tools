import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createWishlist,
  readWishlists,
  wishlistErrorStatus,
} from "@/lib/ct/wishlist";

const createInput = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET() {
  try {
    return NextResponse.json({ wishlists: await readWishlists() });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Wishlists read failed",
      },
      { status: wishlistErrorStatus(error) },
    );
  }
}

export async function POST(request: Request) {
  const parsed = createInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Wishlist name must be between 1 and 100 characters." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      { wishlist: await createWishlist(parsed.data.name) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Wishlist create failed",
      },
      { status: wishlistErrorStatus(error) },
    );
  }
}
