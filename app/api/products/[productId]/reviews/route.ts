import { NextResponse } from "next/server";
import { z } from "zod";
import { createProductReview, readProductReviews, reviewErrorResponse } from "@/lib/ct/reviews";

type Context = { params: Promise<{ productId: string }> };
const productIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const reviewSchema = z.object({
  authorName: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5),
});

function failure(error: unknown) {
  const result = reviewErrorResponse(error);
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function GET(request: Request, context: Context) {
  const { productId } = await context.params;
  const offset = z.coerce.number().int().min(0).max(10000).safeParse(
    new URL(request.url).searchParams.get("offset") ?? 0,
  );
  if (!productIdSchema.safeParse(productId).success || !offset.success) {
    return NextResponse.json({ error: "Invalid product or review page." }, { status: 400 });
  }
  try {
    return NextResponse.json(await readProductReviews(productId, offset.data));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: Context) {
  const { productId } = await context.params;
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!productIdSchema.safeParse(productId).success || !parsed.success) {
    return NextResponse.json({
      error: "Enter your name (up to 80 characters), a title (up to 120), a review (up to 2,000), and a whole-number rating from 1 to 5.",
    }, { status: 400 });
  }
  try {
    return NextResponse.json({ review: await createProductReview(productId, parsed.data) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
