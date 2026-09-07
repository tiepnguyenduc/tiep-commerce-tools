'use client';

import { useCallback } from 'react';
import { trackEvent } from '@/lib/launchpad/helpers/analytics/index';
import { SLIDER_PRODUCT_CLICKED } from '@/lib/launchpad/helpers/constants/events';
import { Product } from '@/lib/launchpad/types/entity/product';

const useTrack = () => {
  const trackClick = useCallback(async (product: Product, position: number) => {
    trackEvent(SLIDER_PRODUCT_CLICKED, { ...product, position });
  }, []);

  return { trackClick };
};

export default useTrack;
