import { useEffect, useState } from 'react';
import { Token } from '@/lib/launchpad/shared/Token';
import { sdk } from '@/lib/launchpad/sdk/index';

const useCheckout = () => {
  const [session, setSession] = useState<Token>();
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    sdk.composableCommerce.cart.getCheckoutSessionToken().then((res) => {
      if (!res.isError) setSession(res.data);
      else setIsExpired(true);
    });
  }, []);

  return { session, isExpired };
};

export default useCheckout;
