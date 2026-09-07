import { useCallback } from 'react';
import { useProduct } from '@/lib/launchpad/frontastic/index';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list-algolia/context/index';

const useRefinementHelpers = () => {
  const { categories } = useProduct();

  const { facetsConfiguration } = useProductList();

  const resolveLabel = useCallback(
    (attribute: string, label: string) => {
      if (attribute.match(/categoryId/))
        return (categories ?? []).find((category) => category.categoryId === label)?.name ?? '';

      if (facetsConfiguration[attribute]?.type === 'boolean') return facetsConfiguration[attribute].label;

      return label;
    },
    [categories, facetsConfiguration],
  );

  return { resolveLabel };
};

export default useRefinementHelpers;
