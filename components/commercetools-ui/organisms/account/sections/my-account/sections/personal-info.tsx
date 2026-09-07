"use client";
import { useContext } from 'react';
import { useTranslations } from 'use-intl';
import { AccountContext } from '@/lib/launchpad/context/account/index';
import InfoCard from '@/components/commercetools-ui/organisms/account/account-atoms/info-card';

const PersonalInfo = () => {
  const translate = useTranslations();

  const { account } = useContext(AccountContext);

  const personalInformationFields: Array<{ label: string; value: string }> = [
    { label: translate('common.firstName'), value: account?.firstName as string },
    { label: translate('common.lastName'), value: account?.lastName as string },
    { label: translate('common.email'), value: account?.email as string },
  ];

  return (
    <InfoCard
      title={translate('account.personal-info')}
      titleTag="h2"
      isEditable
      infoFields={personalInformationFields}
      editHref="?id=edit-personal-info"
    />
  );
};

export default PersonalInfo;
