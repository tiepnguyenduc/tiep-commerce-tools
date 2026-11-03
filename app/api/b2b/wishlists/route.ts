import { NextResponse } from "next/server";
import { z } from "zod";
import { readB2BSession } from "@/lib/b2b/session";
import {
  b2bWishlistErrorStatus,
  createB2BWishlist,
  readB2BWishlists,
} from "@/lib/ct/b2b-wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createInput = z.object({ name: z.string().trim().min(1).max(100) });

async function customerId() {
  const session = await readB2BSession();
  if (!session.customer) throw new Error("B2B login required.");
  return session.customer.id;
}

export async function GET() {
  try {
    return NextResponse.json(
      { wishlists: await readB2BWishlists(await customerId()) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Wishlists read failed",
      },
      { status: b2bWishlistErrorStatus(error) },
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
      {
        wishlist: await createB2BWishlist(await customerId(), parsed.data.name),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Wishlist create failed",
      },
      { status: b2bWishlistErrorStatus(error) },
    );
  }
}
