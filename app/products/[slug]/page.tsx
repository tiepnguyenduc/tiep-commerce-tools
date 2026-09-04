import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getProduct, getRelatedProducts } from "@/lib/ct/catalog";
import { readProductReviews, reviewErrorResponse } from "@/lib/ct/reviews";
import { ProductDetail } from "@/components/ProductDetail";
import { TrackRecentlyViewedProduct } from "@/components/RecentlyViewedProducts";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  const p = await getProduct(slug);
  if (!p) notFound();
  const [relatedProducts, reviewsResult] = await Promise.all([
    getRelatedProducts(p),
    readProductReviews(p.id).then(
      (data) => ({ data, error: "" }),
      (error: unknown) => ({ data: null, error: reviewErrorResponse(error).error }),
    ),
  ]);
  return (
    <>
      <TrackRecentlyViewedProduct product={p} />
      <ProductDetail product={p} relatedProducts={relatedProducts} initialReviews={reviewsResult.data} reviewsError={reviewsResult.error} />
    </>
  );
}
