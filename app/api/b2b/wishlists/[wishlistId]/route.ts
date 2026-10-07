import { NextResponse } from "next/server";
import { z } from "zod";
import { readB2BSession } from "@/lib/b2b/session";
import {
  b2bWishlistErrorStatus,
  deleteB2BWishlist,
  renameB2BWishlist,
} from "@/lib/ct/b2b-wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const renameInput = z.object({ name: z.string().trim().min(1).max(100) });
type Context = { params: Promise<{ wishlistId: string }> };

async function customerId() {
  const session = await readB2BSession();
  if (!session.customer) throw new Error("B2B login required.");
  return session.customer.id;
}

export async function PUT(request: Request, { params }: Context) {
  const parsed = renameInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Wishlist name must be between 1 and 100 characters." },
      { status: 400 },
    );
  }
  try {
    const { wishlistId } = await params;
    return NextResponse.json({
      wishlist: await renameB2BWishlist(await customerId(), wishlistId, parsed.data.name),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wishlist rename failed" },
      { status: b2bWishlistErrorStatus(error) },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { wishlistId } = await params;
    await deleteB2BWishlist(await customerId(), wishlistId);
    return NextResponse.json({ deletedId: wishlistId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wishlist delete failed" },
      { status: b2bWishlistErrorStatus(error) },
    );
  }
}
