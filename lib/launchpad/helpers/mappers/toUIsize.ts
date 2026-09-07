import { UISize } from '@/components/commercetools-ui/organisms/product/product-details/types/index';
import { Product, Variant } from '@/lib/launchpad/types/entity/product';

export const toUISize = (product: Product) => {
  const mappedSizes: UISize[] = [
    ...new Map(
      product.variants?.map((variant: Variant) => [
        variant.attributes?.commonSize?.label,
        variant.attributes?.commonSize,
      ]),
    ).values(),
  ];

  return mappedSizes;
};
