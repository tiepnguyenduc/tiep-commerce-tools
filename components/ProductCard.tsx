import { ProductCartStatus } from "./ProductCartStatus";
import Link from "next/link";
import ProductTile from "@/components/commercetools-ui/molecules/product-tile";
import { toLaunchpadTileProduct } from "@/lib/mappers/launchpad-product";
import type { Product } from "@/lib/types";
import { AddToWishlist } from "./AddToWishlist";
import { productToCompareProduct } from "./ProductCompareData";
import { AddToCompare } from "./ProductCompare";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="launchpad-product-card">
      <div className="launchpad-ui">
        <ProductTile
          product={toLaunchpadTileProduct(product)}
          href={`/products/${product.slug}`}
          imageSuffix={false}
          disableQuickView
          disableWishlistButton
          disableVariants
        />
      </div>
      <div className="card-meta-row">
        <span className="tag">{product.category}</span>
        {product.brand && <Link className="tag brand-tag" href={`/shop-by-brand?brand=${encodeURIComponent(product.brand)}`}>{product.brand}</Link>}
      </div>
      <p className="muted launchpad-product-description">{product.description}</p>
      <ProductCartStatus productId={product.id} />
      <div className="product-image-actions">
        <AddToWishlist compact productId={product.id} />
        <AddToCompare compact product={productToCompareProduct(product)} />
      </div>
    </article>
  );
}
