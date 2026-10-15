import { connection } from "next/server";
import { B2BProductDetail } from "@/components/b2b/B2BProductDetail";
import {
  readProductReviews,
  readProductReviewSummary,
  reviewErrorResponse,
} from "@/lib/ct/reviews";

const PRODUCT_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();
  // Assortment and pricing load client-side per business context; reviews are
  // project-wide, so the first page arrives with the HTML like on the B2C page.
  const [reviewsResult, ratingSummary] = PRODUCT_ID.test(id)
    ? await Promise.all([
        readProductReviews(id, {}, "b2b").then(
          (data) => ({ data, error: "" }),
          (error: unknown) => ({ data: null, error: reviewErrorResponse(error).error }),
        ),
        // The snapshot is decoration: a failure here must not cost us the page.
        readProductReviewSummary(id, "b2b").catch(() => null),
      ])
    : [{ data: null, error: "" }, null];
  return (
    <B2BProductDetail
      id={id}
      initialReviews={reviewsResult.data}
      reviewsError={reviewsResult.error}
      ratingSummary={ratingSummary}
    />
  );
}
