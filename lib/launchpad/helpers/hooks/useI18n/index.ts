import { useLocale } from 'next-intl';
import { getLocalizationInfo } from '@/lib/launchpad/project.config';

const useI18n = () => {
  const locale = useLocale();

  const config = getLocalizationInfo(locale);

  const country = config.countryCode;

  const currency = config.currency;

  const currencySymbol = config.currencyCode;

  return { country, currency, currencySymbol };
};

export default useI18n;
