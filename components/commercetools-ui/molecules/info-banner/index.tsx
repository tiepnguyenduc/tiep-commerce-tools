"use client";
import React from 'react';
import { InfoBannerProps } from '@/components/commercetools-ui/molecules/info-banner/types/index';
import useClassNames from '@/components/commercetools-ui/molecules/info-banner/hooks/useClassNames/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';

const InfoBanner = ({ children, className, variant = 'primary' }: React.PropsWithChildren<InfoBannerProps>) => {
  const { bannerClassName, sidebarClassName } = useClassNames({ variant });

  return (
    <div className={classnames(bannerClassName, className)}>
      <span className={sidebarClassName} />
      <div className="p-16 text-14 text-gray-600">{children}</div>
    </div>
  );
};

export default InfoBanner;
