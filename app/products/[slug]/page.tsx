import { notFound } from "next/navigation";
import { getProduct } from "@/lib/ct/catalog";
import { AddToCart } from "@/components/AddToCart";
import { AddToWishlist } from "@/components/AddToWishlist";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  return (
    <main className="shell detail">
      <img src={p.image} alt={p.name} />
      <div>
        <span className="eyebrow">
          {p.category} / {p.sku}
        </span>
        <h1>{p.name}</h1>
        <p className="price">{p.price.formatted}</p>
        <p>{p.description}</p>
        <div>
          {p.badges.map((x) => (
            <span className="tag" key={x}>
              {x}
            </span>
          ))}
        </div>
        <hr />
        <h3>Made for launch day—and every day after.</h3>
        <p className="muted">
          Commercial-grade materials, straightforward care, and a flexible
          specification for home or team spaces.
        </p>
        <div className="product-actions">
          <AddToCart productId={p.id} />
          <AddToWishlist productId={p.id} />
        </div>
      </div>
    </main>
  );
}
