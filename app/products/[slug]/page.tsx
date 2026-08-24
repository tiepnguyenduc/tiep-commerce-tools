import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getProduct, getRelatedProducts } from "@/lib/ct/catalog";
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
  const relatedProducts = await getRelatedProducts(p);
  return (
    <>
      <TrackRecentlyViewedProduct product={p} />
      <ProductDetail product={p} relatedProducts={relatedProducts} />
    </>
  );
}
