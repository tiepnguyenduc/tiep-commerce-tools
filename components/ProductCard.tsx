import Link from "next/link";
import type { Product } from "@/lib/types";
import { AddToWishlist } from "./AddToWishlist";
import { productToCompareProduct } from "./ProductCompareData";
import { AddToCompare } from "./ProductCompare";
export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card">
      <Link href={`/products/${product.slug}`}>
        <img src={product.image} alt={product.name} />
      </Link>
      <div className="card-body">
        <span className="tag">{product.category}</span>
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="muted">{product.description}</p>
        <div className="card-purchase-row">
          <strong>{product.price.formatted}</strong>
          <div className="card-actions">
            <AddToWishlist compact productId={product.id} />
            <AddToCompare compact product={productToCompareProduct(product)} />
          </div>
        </div>
      </div>
    </article>
  );
}
