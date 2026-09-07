import { useMemo } from 'react';
import { Variant } from '@/lib/launchpad/shared/product/index';
import { useProductList } from '@/components/commercetools-ui/organisms/product/product-list/context/index';

const useSelectedColorFilterVariantIndex = (variants: Partial<Variant>[]) => {
  const { activeRefinements } = useProductList();
  return useMemo(() => {
    const index = variants.findIndex((curr) => {
      return activeRefinements.some((refinement) => refinement.label === curr?.attributes?.colorlabel);
    });
    return index !== -1 ? index : undefined;
  }, [activeRefinements, variants]);
};

export default useSelectedColorFilterVariantIndex;
