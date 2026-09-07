'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { trackEvent } from '@/lib/launchpad/helpers/analytics/index';
import { PRODUCT_VIEWED } from '@/lib/launchpad/helpers/constants/events';
import { Product } from '@/lib/launchpad/types/entity/product';

interface Options {
  product: Product;
  algoliaObjectId?: string;
}

const useTrack = ({ product }: Options) => {
  const { ref, inView } = useInView({ threshold: 0.8, triggerOnce: true });

  const trackedView = useRef(false);

  const trackView = useCallback(async () => {
    if (inView && !trackedView.current) {
      trackEvent(PRODUCT_VIEWED, product);

      trackedView.current = true;
    }
  }, [inView, product]);

  useEffect(() => {
    trackView();
  }, [trackView]);

  return { ref, trackView };
};

export default useTrack;
