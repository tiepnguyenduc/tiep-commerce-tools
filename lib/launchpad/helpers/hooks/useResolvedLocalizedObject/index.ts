import { useLocale } from 'next-intl';
import { getLocalizationInfo } from '@/lib/launchpad/project.config';

export const useResolvedLocalizedObject = (localized: object | string) => {
  const nextLocale = useLocale();

  const { locale } = getLocalizationInfo(nextLocale);

  if (typeof localized === 'string') return localized;

  return localized[locale as keyof typeof localized] ?? Object.values(localized)[0] ?? '';
};
