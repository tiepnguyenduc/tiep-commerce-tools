import type { Product } from "@/lib/types";
import type { Product as LaunchpadProduct } from "@/lib/launchpad/types/entity/product";

/** Use the listing's selected SKU and price; don't pick a different discounted variant. */
export function toLaunchpadTileProduct(product: Product): LaunchpadProduct {
  return {
    productId: product.id,
    name: product.name,
    description: product.description,
    slug: product.slug,
    _url: `/products/${product.slug}`,
    variants: [
      {
        sku: product.sku,
        images: [product.image],
        price: product.originalPrice ?? product.price,
        discountedPrice: product.originalPrice
          ? { value: product.price }
          : undefined,
      },
    ],
  };
}
