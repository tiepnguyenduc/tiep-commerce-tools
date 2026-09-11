"use client";
import { FC } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import { ButtonProps, ButtonVariant } from '@/components/commercetools-ui/atoms/button/index';
import LoadingIcon from '@/components/commercetools-ui/atoms/button/loadingIcon';

type FeedbackIconLayerProps = {
  loading?: ButtonProps['loading'];
  variant: ButtonProps['variant'];
};

const FeedbackIconLayer: FC<FeedbackIconLayerProps> = ({ loading, variant = 'primary' }) => {
  const variantBackgroundRef: { [key in ButtonVariant]?: string } = {
    primary: 'bg-gray-600',
    warning: 'bg-red-600',
  };

  const iconInWhite = variant == 'primary' || variant == 'warning';

  const layerClassName = useClassNames([
    'absolute inset-0 flex h-full w-full items-center justify-center',
    variantBackgroundRef[variant] ?? 'bg-white',
  ]);

  const checkIconClassName = useClassNames(['w-20', { 'text-white': iconInWhite }]);
  const loadingIconClassName = iconInWhite ? 'fill-white' : 'fill-gray-700';

  return (
    <span className={layerClassName}>
      {loading ? (
        <LoadingIcon className={loadingIconClassName} />
      ) : (
        <CheckIcon data-testid="check-icon" className={checkIconClassName} />
      )}
    </span>
  );
};

export default FeedbackIconLayer;
