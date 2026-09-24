import { NextResponse } from "next/server";
import { z } from "zod";
import { createProductReview, readProductReviews, reviewErrorResponse } from "@/lib/ct/reviews";
import { assertValidReviewMedia, ReviewMediaError, storeReviewMedia } from "@/lib/ct/review-media";
import type { ProductReviewQuery } from "@/lib/types";

type Context = { params: Promise<{ productId: string }> };
const productIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const reviewSchema = z.object({
  authorName: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5),
});
const querySchema = z.object({
  offset: z.coerce.number().int().min(0).max(10000).default(0),
  q: z.string().trim().max(120).default(""),
  /** Whole stars to keep, e.g. "5,4". */
  rating: z.string().regex(/^[1-5](,[1-5])*$/).optional(),
  media: z.enum(["all", "with"]).default("all"),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
});

function failure(error: unknown) {
  if (error instanceof ReviewMediaError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const result = reviewErrorResponse(error);
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function GET(request: Request, context: Context) {
  const { productId } = await context.params;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!productIdSchema.safeParse(productId).success || !parsed.success) {
    return NextResponse.json({ error: "Invalid product or review filters." }, { status: 400 });
  }

  const { offset, q, rating, media, sort } = parsed.data;
  const query: ProductReviewQuery = {
    offset,
    search: q,
    ratings: rating ? [...new Set(rating.split(",").map(Number))] : [],
    withMedia: media === "with",
    sort,
  };

  try {
    return NextResponse.json(await readProductReviews(productId, query));
  } catch (error) {
    return failure(error);
  }
}

/** Accepts the plain JSON draft, or multipart when the shopper attached media. */
async function readSubmission(request: Request) {
  if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return { values: await request.json().catch(() => null), files: [] as File[] };
  }

  const form = await request.formData().catch(() => null);
  if (!form) return { values: null, files: [] as File[] };

  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };

  return {
    values: {
      authorName: text("authorName"),
      title: text("title"),
      text: text("text"),
      rating: Number(text("rating")),
    },
    files: form.getAll("media").filter((entry): entry is File => entry instanceof File && entry.size > 0),
  };
}

export async function POST(request: Request, context: Context) {
  const { productId } = await context.params;
  const { values, files } = await readSubmission(request);
  const parsed = reviewSchema.safeParse(values);
  if (!productIdSchema.safeParse(productId).success || !parsed.success) {
    return NextResponse.json({
      error: "Enter your name (up to 80 characters), a title (up to 120), a review (up to 2,000), and a whole-number rating from 1 to 5.",
    }, { status: 400 });
  }

  try {
    // Reject an invalid attachment set before anything is written or created.
    assertValidReviewMedia(files);
    const media = await storeReviewMedia(files);
    const review = await createProductReview(productId, { ...parsed.data, media });
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
